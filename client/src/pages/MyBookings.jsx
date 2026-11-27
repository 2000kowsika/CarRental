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
    const [lookupEmail, setLookupEmail] = useState('')
    const [lookupBookingId, setLookupBookingId] = useState('')
    const [lookupBooking, setLookupBooking] = useState(null)
    const [isLookingUp, setIsLookingUp] = useState(false)
    const [reviewModalBooking, setReviewModalBooking] = useState(null)
    const [reviewRating, setReviewRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [submittingReview, setSubmittingReview] = useState(false)

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

    const [cancellingId, setCancellingId] = useState(null)
    const [payingId, setPayingId] = useState(null)

    const handleCancelBooking = async (bookingId, customerEmail) => {
        const reason = window.prompt("Please enter the reason for your cancellation request (optional):")
        if (reason === null) return // User cancelled prompt

        setCancellingId(bookingId)
        try {
            const { data } = await axios.post('/api/bookings/cancel', {
                bookingId,
                reason,
                email: customerEmail || user?.email
            })
            if (data.success) {
                toast.success(data.message)
                if (user) fetchMyBookings()
                if (lookupBooking) handleLookupBooking()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setCancellingId(null)
        }
    }

    const handleLookupBooking = async (e) => {
        if (e) e.preventDefault()
        if (!lookupBookingId.trim()) return toast.error("Please enter a Booking ID")
        try {
            setIsLookingUp(true)
            const { data } = await axios.get(`/api/bookings/details/${lookupBookingId.trim()}`)
            if (data.success && data.booking) {
                setLookupBooking(data.booking)
                toast.success("Booking found!")
            } else {
                toast.error(data.message || "No booking found with this ID")
                setLookupBooking(null)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setIsLookingUp(false)
        }
    }

    const handleSubmitBookingReview = async (e) => {
        e.preventDefault()
        if (!reviewModalBooking) return
        try {
            setSubmittingReview(true)
            const { data } = await axios.post('/api/reviews/add', {
                carId: reviewModalBooking.car?._id || reviewModalBooking.car,
                bookingId: reviewModalBooking._id,
                rating: reviewRating,
                comment: reviewComment,
                customerEmail: reviewModalBooking.customerEmail,
            })
            if (data.success) {
                toast.success(data.message)
                setReviewModalBooking(null)
                setReviewComment('')
                if (user) fetchMyBookings()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setSubmittingReview(false)
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
                {/* Guest Booking Lookup Box (when not logged in or searching by ID) */}
                <div className='bg-slate-50 p-4 rounded-xl border border-borderColor my-6 flex flex-col md:flex-row items-center justify-between gap-4'>
                    <div>
                        <h3 className='font-semibold text-gray-800 text-sm'>Looking for a Guest Booking?</h3>
                        <p className='text-xs text-gray-500'>Enter your unique Booking ID (e.g. CR-8F3A29B1) to view status, pay, or request cancellation.</p>
                    </div>
                    <form onSubmit={handleLookupBooking} className='flex items-center gap-2 w-full md:w-auto'>
                        <input
                            type="text"
                            placeholder="Enter Booking ID (e.g. CR-...)"
                            value={lookupBookingId}
                            onChange={(e) => setLookupBookingId(e.target.value.toUpperCase())}
                            className='px-3 py-1.5 border border-borderColor rounded-lg text-xs font-mono uppercase bg-white outline-primary w-full md:w-56'
                        />
                        <button
                            type="submit"
                            disabled={isLookingUp}
                            className='px-4 py-1.5 bg-primary hover:bg-primary-dull text-white rounded-lg text-xs font-medium cursor-pointer shrink-0 disabled:opacity-50'
                        >
                            {isLookingUp ? 'Searching...' : 'Find Booking'}
                        </button>
                    </form>
                </div>

                {/* Single Found Guest Booking Card */}
                {lookupBooking && (
                    <div className='mb-8 p-5 border-2 border-primary/40 bg-blue-50/20 rounded-xl'>
                        <div className='flex items-center justify-between mb-3'>
                            <span className='text-xs font-bold text-primary uppercase tracking-wider'>Matching Booking Found</span>
                            <button onClick={() => setLookupBooking(null)} className='text-xs text-gray-400 hover:text-gray-600 cursor-pointer'>✕ Close</button>
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
                            <div className='md:col-span-1'>
                                <img src={lookupBooking.car?.image} alt="" className='w-full h-auto aspect-video object-cover rounded-md' />
                                <p className='text-base font-semibold mt-2'>{lookupBooking.car?.brand} {lookupBooking.car?.model}</p>
                                <p className='text-xs text-gray-500'>{lookupBooking.car?.year} . {lookupBooking.car?.category}</p>
                            </div>
                            <div className='md:col-span-2 space-y-2 text-xs'>
                                <div className='flex items-center gap-2'>
                                    <span className='font-mono font-bold text-primary bg-white px-2 py-0.5 rounded border border-blue-200'>
                                        {lookupBooking.bookingId}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                                        lookupBooking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        lookupBooking.status === 'cancellation_requested' ? 'bg-amber-100 text-amber-700' :
                                        lookupBooking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {lookupBooking.status === 'cancellation_requested' ? 'Cancellation Requested' : lookupBooking.status.toUpperCase()}
                                    </span>
                                </div>
                                <p><strong>Customer:</strong> {lookupBooking.customerName} ({lookupBooking.customerPhone})</p>
                                <p><strong>Pickup Location:</strong> {lookupBooking.pickupLocation || lookupBooking.car?.location}</p>
                                <p><strong>Rental Dates:</strong> {lookupBooking.pickupDate?.split('T')[0]} to {lookupBooking.returnDate?.split('T')[0]}</p>
                                <p><strong>Payment Status:</strong> <span className='font-semibold uppercase'>{lookupBooking.paymentStatus}</span></p>
                                <div className='flex items-center gap-1.5 pt-1'>
                                    <span className='text-gray-500 font-medium'>Driving Licence:</span>
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                        lookupBooking.licenseStatus === 'Verified' ? 'bg-green-100 text-green-700' :
                                        lookupBooking.licenseStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {lookupBooking.licenseStatus || 'Pending'}
                                    </span>
                                    {lookupBooking.licenseStatus === 'Rejected' && lookupBooking.licenseRejectionReason && (
                                        <span className='text-red-500 text-[11px] italic'>({lookupBooking.licenseRejectionReason})</span>
                                    )}
                                </div>
                            </div>
                            <div className='md:col-span-1 flex flex-col justify-between items-end gap-3'>
                                <div className='text-right'>
                                    <p className='text-xs text-gray-500'>Total Price</p>
                                    <h2 className='text-2xl font-bold text-primary'>{currency}{lookupBooking.price}</h2>
                                </div>
                                <div className='flex flex-wrap gap-2 justify-end'>
                                    {lookupBooking.status !== 'cancelled' && lookupBooking.status !== 'cancellation_requested' && lookupBooking.paymentStatus !== 'paid' && (
                                        <button
                                            disabled={payingId === lookupBooking._id}
                                            onClick={() => handlePayNow(lookupBooking._id)}
                                            className='px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-dull text-white rounded-md transition-colors cursor-pointer'
                                        >
                                            {payingId === lookupBooking._id ? 'Processing...' : '💳 Pay Now'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDownloadInvoice(lookupBooking)}
                                        className='px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer border border-slate-300'
                                    >
                                        📄 Invoice
                                    </button>
                                    {lookupBooking.status !== 'cancelled' && lookupBooking.status !== 'cancellation_requested' && (
                                        <button
                                            disabled={cancellingId === lookupBooking._id}
                                            onClick={() => handleCancelBooking(lookupBooking._id, lookupBooking.customerEmail)}
                                            className='px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md transition-colors cursor-pointer'
                                        >
                                            Request Cancellation
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* User Bookings List */}
                {bookings.length > 0 ? (
                    bookings.map((booking, index) => {
                        const isCompletedRental =
                            booking.status === 'confirmed' &&
                            new Date(booking.returnDate) <= new Date();

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
                                key={booking._id} className='grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border border-borderColor rounded-lg mt-5 first:mt-6 bg-white'>

                                    {/* Car Image + Info */}
                                    <div className='md:col-span-1'>
                                        <div className='rounded-md overflow-hidden mb-3'>
                                            <img src={booking.car?.image} alt="" className='w-full h-auto aspect-video object-cover' />
                                        </div>
                                        <p className='text-lg font-medium mt-2'>{booking.car?.brand} {booking.car?.model}</p>
                                        <p className='text-gray-500 text-xs'>{booking.car?.year} . {booking.car?.category} . {booking.car?.location}</p>
                                    </div>

                                    {/* Booking Info */}
                                    <div className='md:col-span-2'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <p className='px-2.5 py-1 bg-blue-50 text-primary font-mono font-bold text-xs rounded border border-blue-200'>
                                                {booking.bookingId || `Booking #${index + 1}`}
                                            </p>
                                            <p className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                booking.status === 'cancellation_requested' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {booking.status === 'cancellation_requested' ? 'Cancellation Requested' : booking.status.toUpperCase()}
                                            </p>
                                        </div>

                                        <div className='flex items-start gap-2 mt-3'>
                                            <img src={assets.calender_icon_colored} alt="" className='w-4 h-4 mt-1' />
                                            <div>
                                                <p className='text-gray-500 text-xs'>Rental Period</p>
                                                <p className='font-medium text-gray-800 text-xs'>
                                                    {booking.pickupDate ? booking.pickupDate.split('T')[0] : ''} to {booking.returnDate ? booking.returnDate.split('T')[0] : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className='flex items-start gap-2 mt-2'>
                                            <img src={assets.location_icon_colored} alt="" className='w-4 h-4 mt-1' />
                                            <div>
                                                <p className='text-gray-500 text-xs'>Pick-up Location</p>
                                                <p className='font-medium text-gray-800 text-xs'>{booking.pickupLocation || booking.car?.location}</p>
                                            </div>
                                        </div>

                                        {booking.customerName && (
                                            <p className='text-xs text-gray-400 mt-2'>
                                                Renter: {booking.customerName} | Phone: {booking.customerPhone}
                                            </p>
                                        )}

                                        <div className='flex items-center gap-1.5 mt-2'>
                                            <span className='text-gray-500 text-xs'>Driving Licence:</span>
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                booking.licenseStatus === 'Verified' ? 'bg-green-100 text-green-700' :
                                                booking.licenseStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {booking.licenseStatus || 'Pending'}
                                            </span>
                                            {booking.licenseStatus === 'Rejected' && booking.licenseRejectionReason && (
                                                <span className='text-red-500 text-[11px] italic'>({booking.licenseRejectionReason})</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Price & Actions */}
                                    <div className='md:col-span-1 flex flex-col justify-between items-end gap-4'>
                                        <div className='text-sm text-gray-500 text-right'>
                                            <p>Total Price</p>
                                            <h1 className='text-2xl font-semibold text-primary'>{currency}{booking.price}</h1>
                                            <p className='text-xs text-gray-400'>Booked on {booking.createdAt?.split('T')[0]}</p>
                                            <p className={`text-xs mt-1 font-semibold uppercase ${
                                                booking.paymentStatus === 'paid' ? 'text-green-600' :
                                                booking.paymentStatus === 'refunded' ? 'text-purple-600' :
                                                booking.paymentStatus === 'failed' ? 'text-red-600' : 'text-amber-600'
                                            }`}>
                                                Payment: {booking.paymentStatus || 'pending'}
                                            </p>
                                        </div>

                                        <div className='flex flex-wrap gap-2 justify-end w-full'>
                                            {/* Pay Now Button (If Pending) */}
                                            {booking.status !== 'cancelled' && booking.status !== 'cancellation_requested' && booking.paymentStatus !== 'paid' && (
                                                <button
                                                    disabled={payingId === booking._id}
                                                    onClick={() => handlePayNow(booking._id)}
                                                    className='px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-dull text-white rounded-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-sm'
                                                >
                                                    {payingId === booking._id ? 'Processing...' : '💳 Pay Now'}
                                                </button>
                                            )}

                                            {/* Leave Review Button for Completed Booking */}
                                            {isCompletedRental && (
                                                <button
                                                    onClick={() => setReviewModalBooking(booking)}
                                                    className='px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-md transition-colors cursor-pointer flex items-center gap-1'
                                                >
                                                    ★ Leave Review
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

                                            {/* Cancel Booking Request */}
                                            {booking.status !== 'cancelled' && booking.status !== 'cancellation_requested' && (
                                                <button
                                                    disabled={cancellingId === booking._id}
                                                    onClick={() => handleCancelBooking(booking._id, booking.customerEmail)}
                                                    className='px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md transition-colors cursor-pointer disabled:opacity-50'
                                                >
                                                    {cancellingId === booking._id ? 'Requesting...' : 'Request Cancellation'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                </motion.div>
                        )
                    })
                ) : (
                    !lookupBooking && (
                        <div className='text-center py-12 text-gray-500 bg-slate-50 rounded-xl border border-dashed border-gray-200 p-6'>
                            <p className='font-medium text-base text-gray-700'>No Bookings Found</p>
                            <p className='text-xs text-gray-400 mt-1'>
                                {user ? "You haven't made any car reservations yet." : "Enter your Booking ID above to view your guest reservation."}
                            </p>
                        </div>
                    )
                )}
            </div>

            {/* Completed Booking Review Modal */}
            {reviewModalBooking && (
                <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
                    <div className='bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-200'>
                        <div className='flex justify-between items-center pb-3 border-b border-gray-200 mb-4'>
                            <div>
                                <h3 className='text-lg font-bold text-gray-900'>Rate & Review Trip</h3>
                                <p className='text-xs text-gray-500 mt-0.5'>
                                    {reviewModalBooking.car?.brand} {reviewModalBooking.car?.model} (Booking {reviewModalBooking.bookingId})
                                </p>
                            </div>
                            <button
                                onClick={() => setReviewModalBooking(null)}
                                className='w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-gray-500 cursor-pointer'
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmitBookingReview} className='space-y-4'>
                            <div>
                                <label className='block text-xs font-semibold text-gray-700 mb-1.5'>Your Rating</label>
                                <div className='flex gap-1'>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            type='button'
                                            key={star}
                                            onClick={() => setReviewRating(star)}
                                            className={`text-2xl cursor-pointer transition-colors ${
                                                star <= reviewRating ? 'text-amber-500' : 'text-slate-300'
                                            }`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className='block text-xs font-semibold text-gray-700 mb-1'>Written Review</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder='How was your rental experience? Cleanliness, comfort, drive performance...'
                                    className='w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-primary focus:border-primary resize-none'
                                />
                            </div>

                            <div className='flex justify-end gap-2 pt-2'>
                                <button
                                    type='button'
                                    onClick={() => setReviewModalBooking(null)}
                                    className='px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer'
                                >
                                    Cancel
                                </button>
                                <button
                                    type='submit'
                                    disabled={submittingReview}
                                    className='px-4 py-1.5 bg-primary hover:bg-primary-dull text-white rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50'
                                >
                                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </motion.div>
    )
}

export default MyBookings