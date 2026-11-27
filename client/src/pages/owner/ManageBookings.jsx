import React, { useState, useEffect } from 'react'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { toast } from 'react-hot-toast'

const ManageBookings = () => {

    const { currency, axios } = useAppContext()
    const [bookings, setBookings] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [paymentFilter, setPaymentFilter] = useState('all')
    const [selectedBookingDetails, setSelectedBookingDetails] = useState(null)
    const [processingId, setProcessingId] = useState(null)

    const fetchOwnerBookings = async () => {
        try {
            const { data } = await axios.get('/api/bookings/owner')
            if (data.success && data.bookings) {
                setBookings(data.bookings)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const changeBookingStatus = async (bookingId, status) => {
        try {
            const { data } = await axios.post('/api/bookings/change-status', { bookingId, status })
            if (data.success) {
                toast.success(data.message)
                fetchOwnerBookings()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const changePaymentStatus = async (bookingId, paymentStatus) => {
        try {
            const { data } = await axios.post('/api/bookings/change-status', { bookingId, paymentStatus })
            if (data.success) {
                toast.success("Payment status updated")
                fetchOwnerBookings()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleCancellationApproval = async (bookingId, action) => {
        try {
            setProcessingId(bookingId)
            const { data } = await axios.post('/api/bookings/admin/cancellation-action', {
                bookingId,
                action
            })
            if (data.success) {
                toast.success(data.message)
                fetchOwnerBookings()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setProcessingId(null)
        }
    }

    useEffect(() => {
        fetchOwnerBookings()
    }, [])

    // Filtered bookings
    const filteredBookings = bookings.filter((b) => {
        const query = searchTerm.toLowerCase().trim()
        const matchSearch =
            !query ||
            b.bookingId?.toLowerCase().includes(query) ||
            b.customerName?.toLowerCase().includes(query) ||
            b.customerEmail?.toLowerCase().includes(query) ||
            b.customerPhone?.includes(query) ||
            b.car?.brand?.toLowerCase().includes(query) ||
            b.car?.model?.toLowerCase().includes(query) ||
            b.pickupLocation?.toLowerCase().includes(query)

        const matchStatus = statusFilter === 'all' || b.status === statusFilter
        const matchPayment = paymentFilter === 'all' || b.paymentStatus === paymentFilter

        return matchSearch && matchStatus && matchPayment
    })

    return (
        <div className='px-4 pt-10 md:px-10 w-full max-w-7xl'>
            <Title
                title="Manage Bookings"
                subTitle="View all customer bookings, manage approval/cancellation requests, track payment statuses, and inspect booking details."
            />

            {/* Filter and Search Bar */}
            <div className='bg-white p-4 rounded-xl border border-borderColor shadow-sm my-6 flex flex-wrap items-center gap-4 text-xs'>
                <div className='flex-1 min-w-[220px]'>
                    <input
                        type="text"
                        placeholder="Search by Booking ID, Customer, Car, or Location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg outline-primary'
                    />
                </div>

                <div className='flex items-center gap-2'>
                    <span className='text-gray-500'>Booking Status:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className='px-3 py-2 border border-gray-300 rounded-lg bg-slate-50 outline-primary'
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancellation_requested">Cancellation Requested</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                <div className='flex items-center gap-2'>
                    <span className='text-gray-500'>Payment Status:</span>
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className='px-3 py-2 border border-gray-300 rounded-lg bg-slate-50 outline-primary'
                    >
                        <option value="all">All Payments</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                    </select>
                </div>

                {(searchTerm || statusFilter !== 'all' || paymentFilter !== 'all') && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setPaymentFilter('all');
                        }}
                        className='text-primary hover:underline cursor-pointer'
                    >
                        Reset Filters
                    </button>
                )}
            </div>

            {/* Bookings Table */}
            <div className='w-full rounded-xl overflow-hidden border border-borderColor shadow-sm bg-white'>
                <div className='overflow-x-auto'>
                    <table className='w-full border-collapse text-left text-xs text-gray-600'>
                        <thead className='text-gray-500 bg-gray-50 font-semibold border-b border-borderColor'>
                            <tr>
                                <th className='p-3.5'>Booking ID</th>
                                <th className='p-3.5'>Customer Info</th>
                                <th className='p-3.5'>Vehicle</th>
                                <th className='p-3.5'>Rental Dates & Location</th>
                                <th className='p-3.5'>Licence</th>
                                <th className='p-3.5'>Total Price</th>
                                <th className='p-3.5'>Payment Status</th>
                                <th className='p-3.5'>Booking Status</th>
                                <th className='p-3.5 text-right'>Actions</th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-borderColor'>
                            {filteredBookings.length > 0 ? (
                                filteredBookings.map((booking) => (
                                    <tr key={booking._id} className='hover:bg-slate-50 transition-colors'>
                                        <td className='p-3.5 font-mono font-bold text-primary'>
                                            {booking.bookingId || `#${booking._id.slice(-6)}`}
                                        </td>
                                        <td className='p-3.5'>
                                            <p className='font-semibold text-gray-900'>{booking.customerName || booking.user?.name || "Customer"}</p>
                                            <p className='text-gray-500'>{booking.customerEmail || booking.user?.email}</p>
                                            <p className='text-gray-400'>{booking.customerPhone || booking.user?.phone || "No phone"}</p>
                                        </td>
                                        <td className='p-3.5'>
                                            <div className='flex items-center gap-3'>
                                                <img
                                                    src={booking.car?.image}
                                                    alt=""
                                                    className='h-12 w-14 rounded-lg object-cover border border-gray-200 shrink-0 shadow-2xs'
                                                />
                                                <div className='space-y-1 min-w-[120px]'>
                                                    <p className='font-semibold text-gray-900 leading-snug'>{booking.car?.brand} {booking.car?.model}</p>
                                                    <div className='flex items-center gap-1.5 flex-wrap'>
                                                        <span className='px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide'>
                                                            {booking.car?.category || "Standard"}
                                                        </span>
                                                        {booking.car?.year && (
                                                            <span className='text-[11px] text-gray-400'>
                                                                • {booking.car?.year}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className='p-3.5'>
                                            <div className='space-y-1.5 min-w-[150px]'>
                                                <div className='flex items-start gap-1.5 text-gray-800'>
                                                    <span className='text-gray-400 text-xs shrink-0 mt-0.5'>📅</span>
                                                    <div className='text-xs leading-relaxed'>
                                                        <span className='font-semibold'>
                                                            {booking.pickupDate ? new Date(booking.pickupDate).toISOString().split('T')[0] : 'N/A'}
                                                        </span>
                                                        <span className='text-gray-400 mx-1'>to</span>
                                                        <span className='font-semibold'>
                                                            {booking.returnDate ? new Date(booking.returnDate).toISOString().split('T')[0] : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className='flex items-center gap-1.5 text-gray-500 text-xs leading-normal'>
                                                    <span className='text-red-400 text-xs shrink-0'>📍</span>
                                                    <span className='truncate font-medium text-gray-600' title={booking.pickupLocation || booking.car?.location || "Colombo"}>
                                                        {booking.pickupLocation || booking.car?.location || "Colombo"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className='p-3.5'>
                                            {booking.licenseNumberMasked || booking.licenseNumber ? (
                                                <div className='space-y-1'>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold block w-fit ${
                                                        booking.licenseStatus === 'Verified' ? 'bg-green-100 text-green-700 border border-green-300' :
                                                        booking.licenseStatus === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-300' :
                                                        'bg-amber-100 text-amber-800 border border-amber-300'
                                                    }`}>
                                                        {booking.licenseStatus || 'Pending'}
                                                    </span>
                                                    <span className='font-mono text-[11px] text-gray-600 block'>
                                                        {booking.licenseNumberMasked || booking.licenseNumber}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className='text-gray-400 text-xs italic'>None</span>
                                            )}
                                        </td>
                                        <td className='p-3.5 font-bold text-gray-900 text-sm'>
                                            {currency}{booking.price}
                                        </td>
                                        <td className='p-3.5'>
                                            <select
                                                value={booking.paymentStatus || 'pending'}
                                                onChange={(e) => changePaymentStatus(booking._id, e.target.value)}
                                                className={`px-2 py-1 rounded border text-xs font-semibold outline-none cursor-pointer ${
                                                    booking.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    booking.paymentStatus === 'failed' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    booking.paymentStatus === 'refunded' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="paid">Paid</option>
                                                <option value="failed">Failed</option>
                                                <option value="refunded">Refunded</option>
                                            </select>
                                        </td>
                                        <td className='p-3.5'>
                                            {booking.status === 'cancellation_requested' ? (
                                                <div className='space-y-1.5'>
                                                    <span className='px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 block text-center'>
                                                        ⚠️ Cancellation Requested
                                                    </span>
                                                    <div className='flex gap-1'>
                                                        <button
                                                            disabled={processingId === booking._id}
                                                            onClick={() => handleCancellationApproval(booking._id, 'approve')}
                                                            className='px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-medium cursor-pointer'
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            disabled={processingId === booking._id}
                                                            onClick={() => handleCancellationApproval(booking._id, 'reject')}
                                                            className='px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-medium cursor-pointer'
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <select
                                                    value={booking.status}
                                                    onChange={(e) => changeBookingStatus(booking._id, e.target.value)}
                                                    className='px-2 py-1 border border-gray-300 rounded text-xs outline-none bg-white font-medium cursor-pointer'
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            )}
                                        </td>
                                        <td className='p-3.5 text-right'>
                                            <button
                                                onClick={() => setSelectedBookingDetails(booking)}
                                                className='px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer text-[11px] font-medium'
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className='p-8 text-center text-gray-400'>
                                        No bookings found matching your search or filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Booking Details Modal */}
            {selectedBookingDetails && (
                <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
                    <div className='bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-200'>
                        <div className='flex justify-between items-center pb-3 border-b border-gray-200 mb-4'>
                            <div>
                                <h3 className='text-lg font-bold text-gray-900'>Booking Details</h3>
                                <p className='text-xs font-mono font-bold text-primary mt-0.5'>
                                    ID: {selectedBookingDetails.bookingId || selectedBookingDetails._id}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedBookingDetails(null)}
                                className='w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-gray-500 cursor-pointer'
                            >
                                ✕
                            </button>
                        </div>

                        <div className='space-y-3 text-xs text-gray-700'>
                            <div className='p-3 bg-slate-50 rounded-lg space-y-1.5'>
                                <p className='font-bold text-gray-800 text-sm mb-1'>Customer Information</p>
                                <p><strong>Name:</strong> {selectedBookingDetails.customerName || selectedBookingDetails.user?.name || "N/A"}</p>
                                <p><strong>Email:</strong> {selectedBookingDetails.customerEmail || selectedBookingDetails.user?.email || "N/A"}</p>
                                <p><strong>Phone:</strong> {selectedBookingDetails.customerPhone || selectedBookingDetails.user?.phone || "N/A"}</p>
                                {selectedBookingDetails.specialRequests && (
                                    <p className='pt-1'><strong>Special Requests:</strong> {selectedBookingDetails.specialRequests}</p>
                                )}
                            </div>

                            <div className='p-3 bg-slate-50 rounded-lg space-y-1.5'>
                                <p className='font-bold text-gray-800 text-sm mb-1'>Vehicle & Rental Details</p>
                                <p><strong>Vehicle:</strong> {selectedBookingDetails.car?.brand} {selectedBookingDetails.car?.model} ({selectedBookingDetails.car?.year})</p>
                                <p><strong>Pickup Location:</strong> {selectedBookingDetails.pickupLocation || selectedBookingDetails.car?.location}</p>
                                <p><strong>Pickup Date:</strong> {new Date(selectedBookingDetails.pickupDate).toLocaleDateString()}</p>
                                <p><strong>Return Date:</strong> {new Date(selectedBookingDetails.returnDate).toLocaleDateString()}</p>
                                <p><strong>Total Price:</strong> {currency}{selectedBookingDetails.price}</p>
                            </div>

                            <div className='p-3 bg-slate-50 rounded-lg space-y-1.5'>
                                <p className='font-bold text-gray-800 text-sm mb-1'>Status & Transaction Details</p>
                                <p><strong>Booking Status:</strong> <span className='font-semibold uppercase'>{selectedBookingDetails.status}</span></p>
                                <p><strong>Payment Status:</strong> <span className='font-semibold uppercase'>{selectedBookingDetails.paymentStatus}</span></p>
                                {selectedBookingDetails.paymentMethod && (
                                    <p><strong>Payment Method:</strong> {selectedBookingDetails.paymentMethod}</p>
                                )}
                                {selectedBookingDetails.paymentTransactionId && (
                                    <p><strong>Transaction Ref:</strong> {selectedBookingDetails.paymentTransactionId}</p>
                                )}
                                {selectedBookingDetails.cancellationReason && (
                                    <p className='text-red-600'><strong>Cancellation Reason:</strong> {selectedBookingDetails.cancellationReason}</p>
                                )}
                            </div>
                        </div>

                        <div className='mt-5 flex justify-end'>
                            <button
                                onClick={() => setSelectedBookingDetails(null)}
                                className='px-4 py-2 bg-slate-800 hover:bg-black text-white rounded-lg text-xs font-medium cursor-pointer'
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ManageBookings