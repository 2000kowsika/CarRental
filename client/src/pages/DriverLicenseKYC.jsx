import React, { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { motion } from 'motion/react'

const DriverLicenseKYC = () => {
    const { axios, user } = useAppContext()

    const [kyc, setKyc] = useState({
        status: 'Not Submitted',
        rejectionReason: '',
        licenseNumberMasked: '',
        hasFront: false,
        hasBack: false,
        submittedAt: null,
    })

    const [licenseNumber, setLicenseNumber] = useState('')
    const [frontFile, setFrontFile] = useState(null)
    const [backFile, setBackFile] = useState(null)
    const [frontPreview, setFrontPreview] = useState(null)
    const [backPreview, setBackPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)

    const fetchKYCStatus = async () => {
        try {
            const { data } = await axios.get('/api/kyc/status')
            if (data.success) {
                setKyc(data.kyc)
            }
        } catch (error) {
            console.error('Error fetching KYC status:', error)
        } finally {
            setFetching(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchKYCStatus()
        }
    }, [user])

    const handleFrontChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setFrontFile(file)
            setFrontPreview(URL.createObjectURL(file))
        }
    }

    const handleBackChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setBackFile(file)
            setBackPreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!frontFile || !backFile) {
            toast.error('Please upload both Front and Back images of your license.')
            return
        }

        const formData = new FormData()
        formData.append('licenseNumber', licenseNumber)
        formData.append('front', frontFile)
        formData.append('back', backFile)

        setLoading(true)
        try {
            const { data } = await axios.post('/api/kyc/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            if (data.success) {
                toast.success(data.message)
                fetchKYCStatus()
                setFrontFile(null)
                setBackFile(null)
                setFrontPreview(null)
                setBackPreview(null)
                setLicenseNumber('')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return (
            <div className='flex justify-center items-center py-24'>
                <div className='animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-primary'></div>
            </div>
        )
    }

    return (
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className='bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden'
            >
                {/* Header */}
                <div className='bg-gradient-to-r from-slate-900 to-primary p-6 sm:p-8 text-white'>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        <div>
                            <h1 className='text-2xl sm:text-3xl font-bold'>Driver's License Verification</h1>
                            <p className='text-blue-100 text-sm mt-1'>
                                Required by car rental insurance regulations before taking delivery of vehicles.
                            </p>
                        </div>

                        {/* Status Badge */}
                        <div className='flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20'>
                            <span className='text-xs uppercase tracking-wider text-blue-200 font-semibold'>Status:</span>
                            <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                    kyc.status === 'Approved'
                                        ? 'bg-green-500 text-white'
                                        : kyc.status === 'Pending'
                                        ? 'bg-amber-400 text-slate-900'
                                        : kyc.status === 'Rejected'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-slate-200 text-slate-800'
                                }`}
                            >
                                {kyc.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className='p-6 sm:p-8'>
                    {/* Status Alerts */}
                    {kyc.status === 'Approved' && (
                        <div className='bg-green-50 border border-green-200 rounded-xl p-5 mb-8 flex items-start gap-4'>
                            <span className='text-2xl'>✓</span>
                            <div>
                                <h3 className='font-bold text-green-900'>Your Driver License is Verified!</h3>
                                <p className='text-sm text-green-700 mt-1'>
                                    Your documents have been approved by our verification team. You are authorized to book and drive any vehicle.
                                </p>
                                {kyc.licenseNumberMasked && (
                                    <p className='text-xs text-green-800 mt-2 font-mono'>
                                        Registered License: {kyc.licenseNumberMasked}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {kyc.status === 'Pending' && (
                        <div className='bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 flex items-start gap-4'>
                            <span className='text-2xl'>⏳</span>
                            <div>
                                <h3 className='font-bold text-amber-900'>Verification in Progress</h3>
                                <p className='text-sm text-amber-800 mt-1'>
                                    Your license images are currently being reviewed by our administrative team. Approvals usually take under 2 hours.
                                </p>
                                <p className='text-xs text-amber-700 mt-2 font-mono'>
                                    Masked ID: {kyc.licenseNumberMasked || 'Submitted'}
                                </p>
                            </div>
                        </div>
                    )}

                    {kyc.status === 'Rejected' && (
                        <div className='bg-red-50 border border-red-200 rounded-xl p-5 mb-8 flex items-start gap-4'>
                            <span className='text-2xl'>⚠️</span>
                            <div>
                                <h3 className='font-bold text-red-900'>Submission Rejected</h3>
                                <p className='text-sm text-red-700 mt-1'>
                                    Reason: <span className='font-medium'>{kyc.rejectionReason || 'Images were unreadable or invalid.'}</span>
                                </p>
                                <p className='text-xs text-red-600 mt-2'>
                                    Please review the instructions below and resubmit clear, glare-free photos.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Upload Form (Visible if Not Submitted or Rejected) */}
                    {(kyc.status === 'Not Submitted' || kyc.status === 'Rejected') && (
                        <form onSubmit={handleSubmit} className='space-y-6'>
                            <div>
                                <label className='block text-sm font-semibold text-slate-700 mb-1'>
                                    Driver's License Number (Optional / For Records)
                                </label>
                                <input
                                    type='text'
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    placeholder='e.g. B1234567 (Will be masked for privacy)'
                                    className='w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-primary'
                                />
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                                {/* Front Image */}
                                <div>
                                    <label className='block text-sm font-semibold text-slate-700 mb-1'>
                                        License Front Side *
                                    </label>
                                    <div className='border-2 border-dashed border-slate-300 hover:border-primary rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50'>
                                        <input
                                            type='file'
                                            id='front-upload'
                                            accept='image/jpeg,image/png,image/webp'
                                            onChange={handleFrontChange}
                                            className='hidden'
                                            required
                                        />
                                        <label htmlFor='front-upload' className='cursor-pointer flex flex-col items-center'>
                                            {frontPreview ? (
                                                <img src={frontPreview} alt='Front Preview' className='h-36 object-contain rounded-lg mb-2' />
                                            ) : (
                                                <div className='py-6'>
                                                    <span className='text-3xl block mb-2'>📸</span>
                                                    <span className='text-xs text-slate-600 font-medium'>Click to upload front photo</span>
                                                    <span className='text-[10px] text-slate-400 block mt-1'>JPG, PNG up to 5MB</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Back Image */}
                                <div>
                                    <label className='block text-sm font-semibold text-slate-700 mb-1'>
                                        License Back Side *
                                    </label>
                                    <div className='border-2 border-dashed border-slate-300 hover:border-primary rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50'>
                                        <input
                                            type='file'
                                            id='back-upload'
                                            accept='image/jpeg,image/png,image/webp'
                                            onChange={handleBackChange}
                                            className='hidden'
                                            required
                                        />
                                        <label htmlFor='back-upload' className='cursor-pointer flex flex-col items-center'>
                                            {backPreview ? (
                                                <img src={backPreview} alt='Back Preview' className='h-36 object-contain rounded-lg mb-2' />
                                            ) : (
                                                <div className='py-6'>
                                                    <span className='text-3xl block mb-2'>📸</span>
                                                    <span className='text-xs text-slate-600 font-medium'>Click to upload back photo</span>
                                                    <span className='text-[10px] text-slate-400 block mt-1'>JPG, PNG up to 5MB</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                type='submit'
                                disabled={loading}
                                className='w-full py-3 bg-primary hover:bg-primary-dull text-white font-semibold rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50'
                            >
                                {loading ? 'Uploading Securely...' : 'Submit Documents for Verification'}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export default DriverLicenseKYC
