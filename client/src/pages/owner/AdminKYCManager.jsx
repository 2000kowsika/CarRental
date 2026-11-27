import React, { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import { toast } from 'react-hot-toast'
import Title from '../../components/owner/Title'

const AdminKYCManager = () => {
    const { axios } = useAppContext()
    const [bookingsWithLicence, setBookingsWithLicence] = useState([])
    const [loading, setLoading] = useState(true)
    const [reviewingId, setReviewingId] = useState(null)
    const [rejectionModal, setRejectionModal] = useState(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const fetchBookingLicences = async () => {
        try {
            const { data } = await axios.get('/api/bookings/owner')
            if (data.success && data.bookings) {
                // Filter bookings that have submitted driving licence
                const withLicence = data.bookings.filter(b => b.licenseNumber || b.licenseFront || b.licenseBack)
                setBookingsWithLicence(withLicence)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBookingLicences()
    }, [])

    const handleAction = async (bookingId, status, reason = '') => {
        setReviewingId(bookingId)
        try {
            const { data } = await axios.post('/api/bookings/admin/verify-license', {
                bookingId,
                status,
                rejectionReason: reason,
            })
            if (data.success) {
                toast.success(data.message)
                setRejectionModal(null)
                setRejectionReason('')
                fetchBookingLicences()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setReviewingId(null)
        }
    }

    const filtered = bookingsWithLicence.filter(b => {
        if (statusFilter === 'all') return true
        return (b.licenseStatus || 'Pending') === statusFilter
    })

    if (loading) {
        return (
            <div className='flex justify-center items-center h-64 flex-1'>
                <div className='animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-primary'></div>
            </div>
        )
    }

    return (
        <div className='p-4 pt-10 md:px-10 flex-1 max-w-6xl'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
                <Title
                    title='Driving Licence Verification'
                    subTitle='Review, verify, and approve customer driving licence documents before confirming bookings'
                />
                <div className='flex items-center gap-2 text-xs'>
                    <span className='text-gray-500 font-medium'>Filter:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className='px-3 py-1.5 border border-gray-300 rounded-lg bg-white outline-primary'
                    >
                        <option value="all">All Submissions</option>
                        <option value="Pending">Pending</option>
                        <option value="Verified">Verified</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            </div>

            <div className='mt-6 space-y-6'>
                {filtered.length === 0 ? (
                    <div className='bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500'>
                        No driving licence submissions found matching criteria.
                    </div>
                ) : (
                    filtered.map((booking) => (
                        <div key={booking._id} className='bg-white rounded-xl border border-slate-200 p-6 shadow-sm'>
                            <div className='flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100'>
                                <div>
                                    <div className='flex items-center gap-2'>
                                        <h3 className='font-bold text-slate-800 text-lg'>
                                            {booking.customerName || booking.user?.name || 'Customer'}
                                        </h3>
                                        <span className='font-mono font-bold text-xs bg-blue-50 text-primary px-2 py-0.5 rounded border border-blue-200'>
                                            Booking: {booking.bookingId || `#${booking._id.slice(-6)}`}
                                        </span>
                                    </div>
                                    <p className='text-xs text-slate-500 mt-1'>
                                        Vehicle: {booking.car?.brand} {booking.car?.model} • Email: {booking.customerEmail} • Phone: {booking.customerPhone}
                                    </p>
                                    <p className='text-xs font-mono font-semibold text-slate-700 mt-1'>
                                        Licence Number: <span className='text-primary'>{booking.licenseNumber || booking.licenseNumberMasked || 'N/A'}</span>
                                    </p>
                                </div>
                                <div className='flex flex-col items-end gap-1'>
                                    <span
                                        className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                                            booking.licenseStatus === 'Verified'
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : booking.licenseStatus === 'Rejected'
                                                ? 'bg-red-100 text-red-700 border border-red-200'
                                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                                        }`}
                                    >
                                        Licence: {booking.licenseStatus || 'Pending'}
                                    </span>
                                    <span className='text-[11px] text-gray-400'>
                                        Booking: {booking.status?.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Images Grid */}
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6'>
                                <div className='border border-slate-200 rounded-lg p-2.5 bg-slate-50'>
                                    <p className='text-xs font-semibold text-slate-600 mb-2'>Licence Front Side</p>
                                    {booking.licenseFront?.endsWith('.pdf') ? (
                                        <a
                                            href={booking.licenseFront}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='h-48 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center text-primary font-semibold text-xs hover:bg-blue-50/50'
                                        >
                                            <span className='text-3xl mb-1'>📄</span>
                                            View Front PDF Document
                                        </a>
                                    ) : (
                                        <a href={booking.licenseFront} target='_blank' rel='noreferrer'>
                                            <img
                                                src={booking.licenseFront}
                                                alt='Licence Front'
                                                className='w-full h-48 object-contain rounded-lg bg-white border border-slate-200 hover:opacity-95 transition-opacity'
                                            />
                                        </a>
                                    )}
                                </div>

                                <div className='border border-slate-200 rounded-lg p-2.5 bg-slate-50'>
                                    <p className='text-xs font-semibold text-slate-600 mb-2'>Licence Back Side</p>
                                    {booking.licenseBack?.endsWith('.pdf') ? (
                                        <a
                                            href={booking.licenseBack}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='h-48 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center text-primary font-semibold text-xs hover:bg-blue-50/50'
                                        >
                                            <span className='text-3xl mb-1'>📄</span>
                                            View Back PDF Document
                                        </a>
                                    ) : (
                                        <a href={booking.licenseBack} target='_blank' rel='noreferrer'>
                                            <img
                                                src={booking.licenseBack}
                                                alt='Licence Back'
                                                className='w-full h-48 object-contain rounded-lg bg-white border border-slate-200 hover:opacity-95 transition-opacity'
                                            />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {booking.licenseStatus === 'Rejected' && booking.licenseRejectionReason && (
                                <p className='text-xs text-red-600 mb-4 bg-red-50 p-2.5 rounded-lg border border-red-200'>
                                    <strong>Rejection Reason:</strong> {booking.licenseRejectionReason}
                                </p>
                            )}

                            {/* Action Buttons */}
                            <div className='flex items-center gap-3 justify-end pt-2 border-t border-slate-100'>
                                <button
                                    disabled={reviewingId === booking._id || booking.licenseStatus === 'Verified'}
                                    onClick={() => handleAction(booking._id, 'Verified')}
                                    className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40'
                                >
                                    {reviewingId === booking._id ? 'Updating...' : '✓ Approve & Verify Licence'}
                                </button>
                                <button
                                    disabled={reviewingId === booking._id || booking.licenseStatus === 'Rejected'}
                                    onClick={() => setRejectionModal(booking._id)}
                                    className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40'
                                >
                                    ✕ Reject Licence
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Rejection Reason Modal */}
            {rejectionModal && (
                <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
                    <div className='bg-white rounded-xl p-6 max-w-md w-full shadow-2xl'>
                        <h3 className='font-bold text-slate-800 text-lg mb-2'>Reject Driving Licence</h3>
                        <p className='text-xs text-slate-500 mb-4'>
                            Please provide the specific reason for rejecting the driving licence document (e.g. blurry image, expired licence, mismatch of name).
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder='e.g. The licence image is too blurry to read the expiration date.'
                            rows={3}
                            className='w-full border border-slate-300 rounded-lg p-2.5 text-sm mb-4 outline-primary focus:border-primary resize-none'
                        />
                        <div className='flex justify-end gap-3'>
                            <button
                                onClick={() => setRejectionModal(null)}
                                className='px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction(rejectionModal, 'Rejected', rejectionReason)}
                                className='px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer'
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminKYCManager
