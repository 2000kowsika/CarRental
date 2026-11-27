import React, { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import { toast } from 'react-hot-toast'
import Title from '../../components/owner/Title'

const AdminKYCManager = () => {
    const { axios, user } = useAppContext()
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [reviewingId, setReviewingId] = useState(null)
    const [rejectionModal, setRejectionModal] = useState(null)
    const [rejectionReason, setRejectionReason] = useState('')

    const fetchSubmissions = async () => {
        try {
            const { data } = await axios.get('/api/kyc/admin/list')
            if (data.success) {
                setSubmissions(data.pendingUsers)
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
        fetchSubmissions()
    }, [])

    const handleAction = async (targetUserId, action, reason = '') => {
        setReviewingId(targetUserId)
        try {
            const { data } = await axios.post('/api/kyc/admin/review', {
                targetUserId,
                action,
                rejectionReason: reason,
            })
            if (data.success) {
                toast.success(data.message)
                setRejectionModal(null)
                setRejectionReason('')
                fetchSubmissions()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setReviewingId(null)
        }
    }

    if (loading) {
        return (
            <div className='flex justify-center items-center h-64 flex-1'>
                <div className='animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-primary'></div>
            </div>
        )
    }

    return (
        <div className='p-4 pt-10 md:px-10 flex-1'>
            <Title
                title='Driver License Verifications'
                subTitle='Review, approve, or reject customer driving licenses for vehicle safety and insurance compliance'
            />

            <div className='mt-8 space-y-6 max-w-5xl'>
                {submissions.length === 0 ? (
                    <div className='bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500'>
                        No license verification submissions yet.
                    </div>
                ) : (
                    submissions.map((sub) => (
                        <div key={sub._id} className='bg-white rounded-xl border border-slate-200 p-6 shadow-sm'>
                            <div className='flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100'>
                                <div>
                                    <h3 className='font-bold text-slate-800 text-lg'>{sub.name}</h3>
                                    <p className='text-xs text-slate-500'>{sub.email} • ID: {sub.licenseNumberMasked || 'N/A'}</p>
                                </div>
                                <span
                                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                        sub.kycStatus === 'Approved'
                                            ? 'bg-green-100 text-green-700'
                                            : sub.kycStatus === 'Pending'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-red-100 text-red-700'
                                    }`}
                                >
                                    {sub.kycStatus}
                                </span>
                            </div>

                            {/* Images Grid */}
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6'>
                                <div className='border border-slate-200 rounded-lg p-2 bg-slate-50'>
                                    <p className='text-xs font-semibold text-slate-600 mb-1.5'>License Front Side</p>
                                    <a href={sub.licenseFront} target='_blank' rel='noreferrer'>
                                        <img
                                            src={sub.licenseFront}
                                            alt='Front'
                                            className='w-full h-44 object-contain rounded bg-white hover:opacity-95 transition-opacity'
                                        />
                                    </a>
                                </div>
                                <div className='border border-slate-200 rounded-lg p-2 bg-slate-50'>
                                    <p className='text-xs font-semibold text-slate-600 mb-1.5'>License Back Side</p>
                                    <a href={sub.licenseBack} target='_blank' rel='noreferrer'>
                                        <img
                                            src={sub.licenseBack}
                                            alt='Back'
                                            className='w-full h-44 object-contain rounded bg-white hover:opacity-95 transition-opacity'
                                        />
                                    </a>
                                </div>
                            </div>

                            {sub.kycStatus === 'Rejected' && sub.kycRejectionReason && (
                                <p className='text-xs text-red-600 mb-4 bg-red-50 p-2.5 rounded border border-red-200'>
                                    Rejection Note: {sub.kycRejectionReason}
                                </p>
                            )}

                            {/* Action Buttons */}
                            <div className='flex gap-3 justify-end'>
                                <button
                                    disabled={reviewingId === sub._id || sub.kycStatus === 'Approved'}
                                    onClick={() => handleAction(sub._id, 'approve')}
                                    className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40'
                                >
                                    {reviewingId === sub._id ? 'Processing...' : 'Approve License'}
                                </button>
                                <button
                                    disabled={reviewingId === sub._id || sub.kycStatus === 'Rejected'}
                                    onClick={() => setRejectionModal(sub._id)}
                                    className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40'
                                >
                                    Reject License
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Rejection Reason Modal */}
            {rejectionModal && (
                <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
                    <div className='bg-white rounded-xl p-6 max-w-md w-full shadow-2xl'>
                        <h3 className='font-bold text-slate-800 text-lg mb-2'>Reject Driving License</h3>
                        <p className='text-xs text-slate-500 mb-4'>
                            Please explain why the document was rejected so the customer can correct and resubmit it.
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder='e.g. Image was too blurry, expired document, or corners cut off.'
                            rows={3}
                            className='w-full border border-slate-300 rounded-lg p-2.5 text-sm mb-4 outline-primary'
                        />
                        <div className='flex justify-end gap-3'>
                            <button
                                onClick={() => setRejectionModal(null)}
                                className='px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction(rejectionModal, 'reject', rejectionReason)}
                                className='px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg'
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
