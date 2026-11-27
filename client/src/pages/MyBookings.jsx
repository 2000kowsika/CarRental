import React, { useState, useEffect } from 'react'
import { dummyMyBookingsData } from '../assets/assets'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { motion } from 'motion/react'
import { generateBookingInvoice } from '../utils/generateInvoice'

const MyBookings = () => {

    const { axios, user, currency } = useAppContext()
    const [bookings, setBookings] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [cancellingId, setCancellingId] = useState(null)
    const [payingId, setPayingId] = useState(null)

    const fetchMyBookings = async () => {
        try {
            const { data } = await axios.get('/api/bookings/user')
            if (data.success) {
                setBookings(data.bookings)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePayNow = async (bookingId) => {
        setPayingId(bookingId)
        try {
            const { data } = await axios.post('/api/payment/initiate', { bookingId })
            if (!data.success) {
                toast.error(data.message)
                setPayingId(null)
                return
            }

            if (!window.payhere) {
                toast.error("PayHere gateway is loading. Please check your internet connection.")
                setPayingId(null)
                return
            }

            window.payhere.onCompleted = function onCompleted(orderId) {
                toast.success("Payment completed successfully!")
                // Verify with backend
                axios.post('/api/payment/verify', { bookingId: orderId })
                    .finally(() => {
                        fetchMyBookings()
                        setPayingId(null)
                    })
            }

            window.payhere.onDismissed = function onDismissed() {
                toast("Payment window closed.")
                setPayingId(null)
            }

            window.payhere.onError = function onError(error) {
                toast.error("Payment error: " + (error || "Transaction failed"))
                setPayingId(null)
            }

            // Launch PayHere secure popup modal
            window.payhere.startPayment(data.paymentData)

        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
            setPayingId(null)
        }
    }

    const handleCancelBooking = async (bookingId) => {
        const confirmed = window.confirm(
            "Are you sure you want to cancel this booking? This will restore vehicle availability for these dates."
        )
        if (!confirmed) return

        setCancellingId(bookingId)
        try {
            const { data } = await axios.post('/api/bookings/cancel', { bookingId })
            if (data.success) {
                toast.success(data.message)
                fetchMyBookings()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setCancellingId(null)
        }
    }

    const handleDownloadInvoice = (booking) => {
        try {
            generateBookingInvoice(booking, user, currency)
            toast.success("Invoice downloaded successfully")
        } catch (error) {
            toast.error("Failed to generate invoice: " + error.message)
        }
    }

    useEffect(() => {
        if (user) {
            fetchMyBookings()
        } else {
            setIsLoading(false)
        }
    }, [user])

    if (isLoading) {
        return (
            <div className='px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16 text-sm max-w-7xl'>
                <Title title='My Bookings'
                    subTitle='View and manage your all car bookings'
                    align='left' />
                <div className='flex justify-center items-center h-64'>
                    <div className='animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-primary'></div>
                </div>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}

            className='px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16 text-sm max-w-7xl'>

            <Title title='My Bookings'
                subTitle='View and manage your all car bookings'
                align='left' />

            <div>
                {bookings.map((booking, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
                        key={booking._id} className='grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border border-borderColor rounded-lg mt-5 first:mt-12'>

                            {/* Car Image + Info */}
                            <div className='md:col-span-1'>
                                <div className='rounded-md overflow-hidden mb-3'>
                                    <img src={booking.car.image} alt="" className='w-full h-auto aspect-video object-cover' />
                                </div>
                                <p className='text-lg font-medium mt-2'>{booking.car.brand} {booking.car.model}</p>
                                <p className='text-gray-500'>{booking.car.year} . {booking.car.category} . {booking.car.location}</p>
                            </div>

                            {/* Booking Info */}
                            <div className='md:col-span-2'>
                                <div className='flex items-center gap-2'>
                                    <p className='px-3 py-1.5 bg-light rounded'>Booking #{index + 1}</p>
                                    <p className={`px-3 py-1 text-xs rounded-full ${booking.status === 'confirmed' ? 'bg-green-400/15 text-green-600' : 'bg-red-400/15 text-red-600'}`}>{booking.status}</p>
                                </div>

                                <div className='flex items-start gap-2 mt-3'>
                                    <img src={assets.calender_icon_colored} alt="" className='w-4 h-4 mt-1' />
                                    <div>
                                        <p className='text-gray-500'>Rental Period</p>
                                        <p>{booking.pickupDate.split('T')[0]} To {booking.returnDate.split('T')[0]}</p>
                                    </div>
                                </div>

                                <div className='flex items-start gap-2 mt-3'>
                                    <img src={assets.location_icon_colored} alt="" className='w-4 h-4 mt-1' />
                                    <div>
                                        <p className='text-gray-500'>Pick-up Location</p>
                                        <p>{booking.car.location}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Price & Actions */}
                            <div className='md:col-span-1 flex flex-col justify-between items-end gap-4'>
                                <div className='text-sm text-gray-500 text-right'>
                                    <p>Total Price</p>
                                    <h1 className='text-2xl font-semibold text-primary'>{currency}{booking.price}</h1>
                                    <p className='text-xs text-gray-400'>Booked on {booking.createdAt?.split('T')[0]}</p>
                                    <p className={`text-xs mt-1 font-medium ${
                                        booking.paymentStatus === 'paid' ? 'text-green-600' :
                                        booking.paymentStatus === 'refund_pending' ? 'text-blue-600' :
                                        booking.paymentStatus === 'refunded' ? 'text-purple-600' : 'text-amber-600'
                                    }`}>
                                        Payment: {booking.paymentStatus === 'refund_pending' ? 'REFUND PENDING' : (booking.paymentStatus || 'pending').toUpperCase()}
                                    </p>
                                </div>

                                <div className='flex flex-wrap gap-2 justify-end w-full'>
                                    {/* Pay Now Button (If Pending) */}
                                    {booking.status !== 'cancelled' && booking.paymentStatus !== 'paid' && (
                                        <button
                                            disabled={payingId === booking._id}
                                            onClick={() => handlePayNow(booking._id)}
                                            className='px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-dull text-white rounded-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-sm'
                                        >
                                            {payingId === booking._id ? 'Processing...' : '💳 Pay Now'}
                                        </button>
                                    )}

                                    {/* Download Invoice Button */}
                                    <button
                                        onClick={() => handleDownloadInvoice(booking)}
                                        className='px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-300'
                                        title='Download PDF Invoice'
                                    >
                                        <span>📄</span> Invoice
                                    </button>

                                    {/* Cancel Booking Button */}
                                    {booking.status !== 'cancelled' && (
                                        <button
                                            disabled={cancellingId === booking._id}
                                            onClick={() => handleCancelBooking(booking._id)}
                                            className='px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md transition-colors cursor-pointer disabled:opacity-50'
                                        >
                                            {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                                        </button>
                                    )}
                                </div>
                            </div>

                        </motion.div>
                    ))
                }
            </div>
        </motion.div>
    )
}

export default MyBookings