import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { dummyCarData } from '../assets/assets'
import { assets } from '../assets/assets'
import Loader from '../components/Loader'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { motion } from 'motion/react'

const CarDetails = () => {

    const { id } = useParams()
    const { cars, axios, pickupDate, setPickupDate, returnDate, setReturnDate, user } = useAppContext()

    const navigate = useNavigate()
    const [car, setCar] = useState(null)
    const currency = import.meta.env.VITE_CURRENCY
    const [isLoading, setIsLoading] = useState(false)

    // Reviews State
    const [reviews, setReviews] = useState([])
    const [eligibleBookingId, setEligibleBookingId] = useState(null)
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [submittingReview, setSubmittingReview] = useState(false)

    // Customer Booking Form State
    const [customerName, setCustomerName] = useState(user?.name || '')
    const [customerEmail, setCustomerEmail] = useState(user?.email || '')
    const [customerPhone, setCustomerPhone] = useState(user?.phone || '')
    const [specialRequests, setSpecialRequests] = useState('')

    // Driving Licence Verification Form State
    const [licenseFrontFile, setLicenseFrontFile] = useState(null)
    const [licenseBackFile, setLicenseBackFile] = useState(null)
    const [licenseFrontPreview, setLicenseFrontPreview] = useState(null)
    const [licenseBackPreview, setLicenseBackPreview] = useState(null)

    const [bookingSuccessModal, setBookingSuccessModal] = useState(null)
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)

    // Handle Front Licence Upload & Preview
    const handleFrontFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const allowedExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowedExtensions.includes(file.type)) {
            return toast.error("Only JPG, JPEG, PNG, or PDF files are allowed")
        }
        if (file.size > 5 * 1024 * 1024) {
            return toast.error("Licence front file must be under 5MB")
        }

        setLicenseFrontFile(file)
        if (file.type.startsWith('image/')) {
            setLicenseFrontPreview(URL.createObjectURL(file))
        } else {
            setLicenseFrontPreview('pdf')
        }
    }

    // Handle Back Licence Upload & Preview
    const handleBackFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const allowedExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowedExtensions.includes(file.type)) {
            return toast.error("Only JPG, JPEG, PNG, or PDF files are allowed")
        }
        if (file.size > 5 * 1024 * 1024) {
            return toast.error("Licence back file must be under 5MB")
        }

        setLicenseBackFile(file)
        if (file.type.startsWith('image/')) {
            setLicenseBackPreview(URL.createObjectURL(file))
        } else {
            setLicenseBackPreview('pdf')
        }
    }

    useEffect(() => {
        if (user) {
            if (!customerName) setCustomerName(user.name || '')
            if (!customerEmail) setCustomerEmail(user.email || '')
            if (!customerPhone && user.phone) setCustomerPhone(user.phone || '')
        }
    }, [user])

    const fetchReviews = async () => {
        try {
            const { data } = await axios.get(`/api/reviews/car/${id}`)
            if (data.success) {
                setReviews(data.reviews)
            }
        } catch (error) {
            console.error('Error fetching reviews:', error)
        }
    }

    const checkReviewEligibility = async () => {
        if (!user) return
        try {
            const { data } = await axios.get(`/api/reviews/eligible/${id}`)
            if (data.success && data.hasEligibleBooking) {
                setEligibleBookingId(data.bookingId)
            } else {
                setEligibleBookingId(null)
            }
        } catch (error) {
            console.error('Error checking review eligibility:', error)
        }
    }

    const handleReviewSubmit = async (e) => {
        e.preventDefault()
        if (!eligibleBookingId) return

        setSubmittingReview(true)
        try {
            const { data } = await axios.post('/api/reviews/add', {
                carId: id,
                bookingId: eligibleBookingId,
                rating,
                comment,
            })
            if (data.success) {
                toast.success(data.message)
                setComment('')
                setRating(5)
                setEligibleBookingId(null)
                fetchReviews()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setSubmittingReview(false)
        }
    }

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Are you sure you want to delete this review?')) return
        try {
            const { data } = await axios.delete(`/api/reviews/delete/${reviewId}`)
            if (data.success) {
                toast.success(data.message)
                fetchReviews()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Frontend validation
        if (!customerName.trim()) {
            return toast.error("Please enter your full name");
        }
        if (!customerEmail.trim() || !customerEmail.includes('@')) {
            return toast.error("Please enter a valid email address");
        }
        if (!customerPhone.trim()) {
            return toast.error("Please enter your contact phone number");
        }
        if (!licenseFrontFile) {
            return toast.error("Please upload the Front side of your Driving Licence");
        }
        if (!licenseBackFile) {
            return toast.error("Please upload the Back side of your Driving Licence");
        }
        if (!pickupDate || !returnDate) {
            return toast.error("Please select both pickup and return dates");
        }

        try {
            setIsSubmittingBooking(true);
            const formData = new FormData();
            formData.append("car", id);
            formData.append("pickupDate", pickupDate);
            formData.append("returnDate", returnDate);
            formData.append("customerName", customerName.trim());
            formData.append("customerEmail", customerEmail.trim());
            formData.append("customerPhone", customerPhone.trim());
            formData.append("specialRequests", specialRequests.trim());
            formData.append("licenseFront", licenseFrontFile);
            formData.append("licenseBack", licenseBackFile);

            const { data } = await axios.post('/api/bookings/create', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.success) {
                toast.success(data.message)
                setBookingSuccessModal(data.booking)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setIsSubmittingBooking(false);
        }
    }

    useEffect(() => {
        const allCars = cars && cars.length > 0 ? cars : dummyCarData
        setCar(allCars.find(c => c._id === id))
        fetchReviews()
        checkReviewEligibility()
    }, [cars, id, user])

    return car ? (
        <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16'>

            <button onClick={() => navigate(-1)} className='flex items-center gap-2 mb-6 text-gray-500 cursor-pointer'>
                <img src={assets.arrow_icon} alt="" className='rotate-180 opacity-65' />
                Back to all cars
            </button>

            <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start'>
                {/* Left: Car Card (Image & Details) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className='lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm'>
                    <div className='w-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2 mb-5'>
                        <motion.img
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            src={car.image}
                            alt={`${car.brand} ${car.model}`}
                            className='w-full h-auto max-h-72 sm:max-h-80 object-contain rounded-lg transition-transform duration-300 hover:scale-[1.02]'
                        />
                    </div>

                    <motion.div className='space-y-6'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <div>
                            <h1 className='text-3xl font-bold'>{car.brand} {car.model}</h1>
                            <p className='text-gray-500 text-lg'>{car.category} . {car.year}</p>
                        </div>
                        <hr className='border-borderColor my-6' />

                        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                            {[
                                { icon: assets.users_icon, text: `${car.seating_capacity} Seats` },
                                { icon: assets.fuel_icon, text: car.fuel_type },
                                { icon: assets.car_icon, text: car.transmission },
                                { icon: assets.location_icon, text: car.location },
                            ].map(({ icon, text }) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}

                                    key={text} className='flex flex-col items-center bg-light p-4 rounded-lg'>
                                    <img src={icon} alt="" className='h-5 mb-2' />
                                    {text}
                                </motion.div>
                            ))}
                        </div>
                        {/* Description */}
                        <div>
                            <h1 className='text-xl font-medium mb-3'>Description</h1>
                            <p className='text-gray-500'>{car.description}</p>
                        </div>
                        {/* Features */}
                        <div>
                            <h1 className='text-xl font-medium mb-3'>Features</h1>
                            <ul className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                                {
                                    ["360 Camera", "Heated Seats", "GPS", "Bluetooth", "Rear view Mirror"].map((item) => (
                                        <li key={item} className='flex items-center text-gray-500'>
                                            <img src={assets.check_icon} className='h-4 mr-2' alt="" />
                                            {item}
                                        </li>
                                    ))
                                }

                            </ul>
                        </div>
                    </motion.div>

                    {/* Customer Reviews Section */}
                    <div className='mt-10 border-t border-slate-200 pt-8'>
                        <div className='flex items-center justify-between mb-6'>
                            <h2 className='text-xl font-semibold text-slate-800'>
                                Customer Reviews ({reviews.length})
                            </h2>
                            <div className='flex items-center gap-1.5 text-amber-500 font-bold'>
                                <span>★</span>
                                <span className='text-slate-800 text-lg'>
                                    {reviews.length > 0
                                        ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1)
                                        : 'No ratings yet'}
                                </span>
                            </div>
                        </div>

                        {/* Leave a Review Form (If Eligible) */}
                        {eligibleBookingId && (
                            <form onSubmit={handleReviewSubmit} className='bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8'>
                                <h3 className='font-semibold text-slate-800 mb-2'>Leave Your Review</h3>
                                <p className='text-xs text-slate-500 mb-4'>
                                    You completed a trip with this car. Share your experience with future renters!
                                </p>

                                <div className='flex items-center gap-2 mb-3'>
                                    <span className='text-sm text-slate-700 font-medium'>Rating:</span>
                                    <div className='flex gap-1'>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                type='button'
                                                key={star}
                                                onClick={() => setRating(star)}
                                                className={`text-2xl cursor-pointer transition-colors ${star <= rating ? 'text-amber-500' : 'text-slate-300'
                                                    }`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    <span className='text-xs text-slate-500 ml-2 font-medium'>({rating} of 5 stars)</span>
                                </div>

                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder='Write your honest feedback here (cleanliness, performance, comfort)...'
                                    rows={3}
                                    required
                                    className='w-full border border-slate-200 rounded-lg p-3 text-sm outline-primary bg-white'
                                />

                                <div className='mt-3 flex justify-end'>
                                    <button
                                        type='submit'
                                        disabled={submittingReview}
                                        className='px-5 py-2 bg-primary hover:bg-primary-dull text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50'
                                    >
                                        {submittingReview ? 'Submitting...' : 'Post Review'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Reviews List */}
                        {reviews.length === 0 ? (
                            <p className='text-sm text-slate-500 italic py-4'>
                                No reviews yet. Be the first to rent and share your thoughts!
                            </p>
                        ) : (
                            <div className='space-y-4'>
                                {reviews.map((rev) => (
                                    <div key={rev._id} className='p-4 rounded-xl border border-slate-200/80 bg-white'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-3'>
                                                <div className='w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm'>
                                                    {rev.user?.name ? rev.user.name[0].toUpperCase() : 'U'}
                                                </div>
                                                <div>
                                                    <p className='text-sm font-medium text-slate-800'>{rev.user?.name || 'Verified Customer'}</p>
                                                    <p className='text-xs text-slate-400'>{new Date(rev.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <div className='text-amber-500 text-sm'>
                                                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                                                </div>
                                                {user && (user._id === rev.user?._id || user.role === 'admin') && (
                                                    <button
                                                        onClick={() => handleDeleteReview(rev._id)}
                                                        className='text-xs text-red-500 hover:text-red-700 ml-2'
                                                        title='Delete review'
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className='text-sm text-slate-600 mt-3 leading-relaxed'>{rev.comment}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </motion.div>

                {/* Right: Booking Form*/}
                <motion.form
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}

                    onSubmit={handleSubmit} className='lg:col-span-5 shadow-lg h-max sticky top-18 rounded-2xl p-6 bg-white border border-gray-100 space-y-4 text-gray-600'>

                    <div>
                        <p className='flex items-baseline justify-between text-2xl text-gray-900 font-bold'>
                            <span>{currency}{car.pricePerDay}</span>
                            <span className='text-sm text-gray-400 font-normal'>per day</span>
                        </p>
                        <p className='text-xs text-gray-400 mt-0.5'>Location: {car.location || "Colombo"}</p>
                    </div>

                    <hr className='border-borderColor my-3' />

                    {/* Customer Information (Login not required) */}
                    <div className='space-y-3 text-sm'>
                        <div>
                            <label className='block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1'>Full Name *</label>
                            <input
                                type="text"
                                required
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Your full name"
                                className='w-full border border-borderColor px-3 py-2 rounded-lg text-sm outline-primary focus:border-primary bg-slate-50/50'
                            />
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                            <div>
                                <label className='block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1'>Phone *</label>
                                <input
                                    type="tel"
                                    required
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="e.g. 0771234567"
                                    className='w-full border border-borderColor px-3 py-2 rounded-lg text-sm outline-primary focus:border-primary bg-slate-50/50'
                                />
                            </div>
                            <div>
                                <label className='block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1'>Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className='w-full border border-borderColor px-3 py-2 rounded-lg text-sm outline-primary focus:border-primary bg-slate-50/50'
                                />
                            </div>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                            <div>
                                <label htmlFor="pickup-date" className='block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1'>Pickup Date *</label>
                                <input
                                    value={pickupDate}
                                    onChange={(e) => setPickupDate(e.target.value)}
                                    type="date"
                                    className='w-full border border-borderColor px-3 py-2 rounded-lg text-sm outline-primary bg-slate-50/50'
                                    required
                                    id='pickup-date'
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div>
                                <label htmlFor="return-date" className='block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1'>Return Date *</label>
                                <input
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    type="date"
                                    className='w-full border border-borderColor px-3 py-2 rounded-lg text-sm outline-primary bg-slate-50/50'
                                    required
                                    id='return-date'
                                    min={pickupDate || new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>

                        <div>
                            <label className='block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1'>Special Requests (Optional)</label>
                            <textarea
                                value={specialRequests}
                                onChange={(e) => setSpecialRequests(e.target.value)}
                                rows={2}
                                placeholder="Child seat, airport delivery, flight arrival details..."
                                className='w-full border border-borderColor px-3 py-2 rounded-lg text-sm outline-primary focus:border-primary bg-slate-50/50 resize-none'
                            />
                        </div>

                        {/* DRIVING LICENCE VERIFICATION SECTION */}
                        <div className='pt-3 border-t border-slate-200'>
                            <div className='flex items-center gap-2 mb-2'>
                                <span className='text-primary font-bold'>🪪</span>
                                <h3 className='font-bold text-gray-800 text-sm'>Driving Licence Verification</h3>
                            </div>
                            <p className='text-xs text-slate-500 mb-4'>
                                Required by car rental insurance regulations. Uploaded documents are encrypted and protected from public exposure.
                            </p>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                {/* Front Document Upload */}
                                <div className='border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50/70 text-center hover:border-primary/70 transition-colors'>
                                    <div className='flex items-center justify-between mb-2'>
                                        <p className='text-xs font-bold text-slate-700'>Front Side Document *</p>
                                        <span className='text-[10px] text-slate-400 uppercase font-semibold'>Max 5MB</span>
                                    </div>
                                    {licenseFrontPreview ? (
                                        <div className='relative'>
                                            {licenseFrontPreview === 'pdf' ? (
                                                <div className='h-24 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold text-xs border border-red-200'>
                                                    📄 PDF Document Attached
                                                </div>
                                            ) : (
                                                <img src={licenseFrontPreview} alt="Front preview" className='h-24 w-full object-cover rounded-xl border border-slate-200' />
                                            )}
                                            <label className='mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold cursor-pointer'>
                                                <span>🔄 Replace file</span>
                                                <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFrontFileChange} className='hidden' />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className='flex flex-col items-center justify-center h-24 border border-dashed border-slate-200 rounded-xl bg-white cursor-pointer text-slate-400 hover:text-primary transition-colors'>
                                            <span className='text-2xl mb-1'>📷</span>
                                            <span className='text-xs font-semibold text-slate-700'>Upload Front Side</span>
                                            <span className='text-[10px] text-slate-400'>JPG, PNG, PDF</span>
                                            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required onChange={handleFrontFileChange} className='hidden' />
                                        </label>
                                    )}
                                </div>

                                {/* Back Document Upload */}
                                <div className='border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50/70 text-center hover:border-primary/70 transition-colors'>
                                    <div className='flex items-center justify-between mb-2'>
                                        <p className='text-xs font-bold text-slate-700'>Back Side Document *</p>
                                        <span className='text-[10px] text-slate-400 uppercase font-semibold'>Max 5MB</span>
                                    </div>
                                    {licenseBackPreview ? (
                                        <div className='relative'>
                                            {licenseBackPreview === 'pdf' ? (
                                                <div className='h-24 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold text-xs border border-red-200'>
                                                    📄 PDF Document Attached
                                                </div>
                                            ) : (
                                                <img src={licenseBackPreview} alt="Back preview" className='h-24 w-full object-cover rounded-xl border border-slate-200' />
                                            )}
                                            <label className='mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold cursor-pointer'>
                                                <span>🔄 Replace file</span>
                                                <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleBackFileChange} className='hidden' />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className='flex flex-col items-center justify-center h-24 border border-dashed border-slate-200 rounded-xl bg-white cursor-pointer text-slate-400 hover:text-primary transition-colors'>
                                            <span className='text-2xl mb-1'>📷</span>
                                            <span className='text-xs font-semibold text-slate-700'>Upload Back Side</span>
                                            <span className='text-[10px] text-slate-400'>JPG, PNG, PDF</span>
                                            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required onChange={handleBackFileChange} className='hidden' />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Calculated Price Breakdown */}
                    {pickupDate && returnDate && (
                        <div className='bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 text-gray-600'>
                            <div className='flex justify-between'>
                                <span>Estimated Days:</span>
                                <span className='font-semibold'>
                                    {Math.max(1, Math.ceil((new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24)))} days
                                </span>
                            </div>
                            <div className='flex justify-between font-bold text-sm text-gray-900 pt-1 border-t border-slate-200'>
                                <span>Total Price:</span>
                                <span className='text-primary'>
                                    {currency}
                                    {car.pricePerDay * Math.max(1, Math.ceil((new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24)))}
                                </span>
                            </div>
                        </div>
                    )}

                    <button
                        type='submit'
                        disabled={isSubmittingBooking}
                        className='w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium text-white rounded-xl cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-2'
                    >
                        {isSubmittingBooking ? 'Reserving Vehicle...' : 'Confirm Booking'}
                    </button>

                    <p className='text-center text-xs text-gray-400'>
                        🔒 No account or credit card required to submit reservation
                    </p>
                </motion.form>

            </div>

            {/* Booking Confirmation Modal */}
            {bookingSuccessModal && (
                <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className='bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100 text-center'
                    >
                        <div className='w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center text-3xl mb-4'>
                            ✓
                        </div>
                        <h2 className='text-2xl font-bold text-gray-900'>Booking Confirmed!</h2>
                        <p className='text-sm text-gray-500 mt-1'>
                            Your reservation has been created and sent to the owner for approval.
                        </p>

                        <div className='bg-slate-50 border border-slate-200 rounded-xl p-4 my-5 text-left text-xs space-y-2'>
                            <div className='flex justify-between items-center pb-2 border-b border-slate-200'>
                                <span className='text-gray-500'>Unique Booking ID:</span>
                                <span className='font-mono font-bold text-primary text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200'>
                                    {bookingSuccessModal.bookingId}
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-gray-500'>Vehicle:</span>
                                <span className='font-semibold text-gray-800'>{car.brand} {car.model}</span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-gray-500'>Customer:</span>
                                <span className='font-semibold text-gray-800'>{bookingSuccessModal.customerName}</span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-gray-500'>Pickup Location:</span>
                                <span className='font-semibold text-gray-800'>{bookingSuccessModal.pickupLocation || car.location}</span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-gray-500'>Rental Period:</span>
                                <span className='font-semibold text-gray-800'>
                                    {new Date(bookingSuccessModal.pickupDate).toISOString().split('T')[0]} to {new Date(bookingSuccessModal.returnDate).toISOString().split('T')[0]}
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-gray-500'>Payment Status:</span>
                                <span className='font-semibold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded'>
                                    {bookingSuccessModal.paymentStatus || "Pending"}
                                </span>
                            </div>
                            <div className='flex justify-between pt-1 border-t border-slate-200 text-sm'>
                                <span className='font-bold text-gray-700'>Total Amount:</span>
                                <span className='font-bold text-primary'>{currency}{bookingSuccessModal.price}</span>
                            </div>
                        </div>

                        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                            <button
                                onClick={() => {
                                    setBookingSuccessModal(null);
                                    navigate('/my-bookings');
                                }}
                                className='px-6 py-2.5 bg-primary hover:bg-primary-dull text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm'
                            >
                                View My Bookings
                            </button>
                            <button
                                onClick={() => {
                                    setBookingSuccessModal(null);
                                    navigate('/cars');
                                }}
                                className='px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer'
                            >
                                Browse More Cars
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

        </div>
    ) : <Loader />
}

export default CarDetails