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
        try {
            const { data } = await axios.post('/api/bookings/create', {
                car: id,
                pickupDate,
                returnDate
            })

            if (data.success) {
                toast.success(data.message)
                navigate('/my-bookings')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
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

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12'>
                {/* Left: Car Image & Details*/}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}

                    className='lg:col-span-2'>
                    <motion.img
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}

                        src={car.image} alt="" className='w-full h-auto md:max-h-100 object-cover rounded-xl mb-6 shadow-md' />

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
                                                className={`text-2xl cursor-pointer transition-colors ${
                                                    star <= rating ? 'text-amber-500' : 'text-slate-300'
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

                    onSubmit={handleSubmit} className='shadow-lg h-max sticky top-18 rounded-xl p-6 space-y-6 text-gray-500'>

                    <p className='flex items-center justify-between text-2xl text-gray-800 font-semibold'>{currency}{car.pricePerDay}<span className='text-base text-gray-400 font-normal'>per day</span></p>

                    <hr className='border-borderColor my-6' />

                    <div className='flex flex-col gap-2'>
                        <label htmlFor="pickup-date">Pickup Date</label>
                        <input value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} type="date" className='border border-borderColor px-3 py-2 rounded-lg' required id='pickup-date' min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className='flex flex-col gap-2'>
                        <label htmlFor="return-date">Return Date</label>
                        <input value={returnDate} onChange={(e) => setReturnDate(e.target.value)} type="date" className='border border-borderColor px-3 py-2 rounded-lg' required id='return-date' min={pickupDate || new Date().toISOString().split('T')[0]} />
                    </div>

                    <button className='w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium text-white rounded-xl cursor-pointer'>Book Now</button>

                    <p className='text-center text-sm'>No credit card required to reserve</p>
                </motion.form>

            </div>

        </div>
    ) : <Loader />
}

export default CarDetails