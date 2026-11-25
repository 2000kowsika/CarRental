import React, { useState, useEffect } from 'react'
import Title from '../components/Title'
import { assets, dummyCarData } from '../assets/assets'
import CarCard from '../components/CarCard'
import { useSearchParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { motion } from 'motion/react'

const Cars = () => {

    //getting search params from url
    const [searchParams] = useSearchParams()
    const pickupLocation = searchParams.get('pickupLocation')
    const pickupDate = searchParams.get('pickupDate')
    const returnDate = searchParams.get('returnDate')

    const { cars, axios, searchTerm, setSearchTerm } = useAppContext()

    const [input, setInput] = useState(searchTerm || '')

    useEffect(() => {
        if (searchTerm !== input) {
            setInput(searchTerm)
        }
    }, [searchTerm])

    const isSearchData = pickupLocation && pickupDate && returnDate
    const [filteredCars, setFilteredCars] = useState([])

    const applyFilter = () => {
        const sourceCars = cars && cars.length > 0 ? cars : dummyCarData
        const query = (input || '').trim().toLowerCase()
        if (query === '') {
            setFilteredCars(sourceCars)
            return null
        }
        const filtered = sourceCars.slice().filter((car) => {
            return car.brand?.toLowerCase().includes(query)
                || car.model?.toLowerCase().includes(query)
                || car.category?.toLowerCase().includes(query)
                || car.transmission?.toLowerCase().includes(query)
                || car.fuel_type?.toLowerCase().includes(query)
                || car.location?.toLowerCase().includes(query)
                || `${car.brand} ${car.model}`.toLowerCase().includes(query)
        })
        setFilteredCars(filtered)
    }

    const searchCarAvailability = async () => {
        try {
            const { data } = await axios.post('/api/bookings/check-availability', { location: pickupLocation, pickupDate, returnDate })
            if (data.success) {
                setFilteredCars(data.availableCars)
                if (data.availableCars.length === 0) {
                    toast('No cars available')
                }
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (isSearchData) {
            searchCarAvailability()
        } else {
            applyFilter()
        }
    }, [isSearchData, cars])

    useEffect(() => {
        if (!isSearchData) {
            applyFilter()
        }
    }, [input])

    return (
        <div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}

                className='flex flex-col items-center py-20 bg-light max-md:px-4'>
                <Title title='Available Cars' subTitle='Browse our selection of premium vehicles available for your next adventure' />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}

                    className='flex items-center bg-white px-4 mt-6 max-w-140 w-full h-12 rounded-full shadow'>
                    <img src={assets.search_icon} alt="" className='w-4.5 h-4.5 mr-2' />

                    <input onChange={(e) => {
                        setInput(e.target.value)
                        setSearchTerm(e.target.value)
                    }} value={input} type="text" placeholder='Search by make, model, or features' className='w-full h-full outline-none text-gray-500' />

                    <img src={assets.filter_icon} alt="" className='w-4.5 h-4.5 ml-2' />

                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}

                className='px-6 md:px-16 lg:px-24 xl:px-32 mt-10'>
                <p className='text-gray-500 xl:px-20 max-w-7xl mx-auto'>Showing {filteredCars.length} Cars</p>

                {filteredCars.length > 0 ? (
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-4 xl:px-20 max-w-7xl mx-auto'>
                        {filteredCars.map((car, index) => (
                            <motion.div key={car._id || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.1 * index, duration: 0.4 }}
                            >
                                <CarCard car={car} />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className='text-center py-16 text-gray-500'>
                        <p className='text-xl font-medium'>No cars found</p>
                        <p className='text-sm mt-1'>No cars match your search keyword. Try a different make or model.</p>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
export default Cars