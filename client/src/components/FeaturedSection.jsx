import React from 'react'
import { assets } from '../assets/assets'
import CarCard from './CarCard'
import Title from './Title'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAppContext } from '../context/AppContext'

const FeaturedSection = () => {

    const navigate = useNavigate()
    const { cars, searchTerm } = useAppContext()

    const searchFilteredCars = searchTerm.trim()
        ? cars.filter((car) => {
            const query = searchTerm.toLowerCase()
            return (
                car.brand?.toLowerCase().includes(query) ||
                car.model?.toLowerCase().includes(query) ||
                car.category?.toLowerCase().includes(query) ||
                car.transmission?.toLowerCase().includes(query) ||
                car.fuel_type?.toLowerCase().includes(query) ||
                car.location?.toLowerCase().includes(query) ||
                `${car.brand} ${car.model}`.toLowerCase().includes(query)
            )
        })
        : null

    const displayedCars = searchFilteredCars ? searchFilteredCars : cars.slice(0, 2)

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className='flex flex-col items-center py-24 px-6 md:px-16 lg:px-24 xl:px-32'>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
            >
                <Title title="Featured Vehicles" subTitle='Explore our selection of premium vehicles available for your next adventure.' />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 100 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}

                className={`grid gap-8 mt-18 max-w-4xl w-full ${displayedCars.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-2'}`}>
                {
                    displayedCars.length > 0 ? (
                        displayedCars.map((car) => (
                            <motion.div key={car._id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                            >
                                <CarCard car={car} />
                            </motion.div>
                        ))
                    ) : (
                        <div className='col-span-full text-center py-12 text-gray-500'>
                            <p className='text-lg font-medium'>No cars found</p>
                            <p className='text-sm mt-1'>Try searching for a different car name, brand, or model.</p>
                        </div>
                    )
                }
            </motion.div>

            <motion.button
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}

                onClick={() => {
                    navigate('/cars'); scrollTo(0, 0)
                }}
                className='flex items-center justify-center gap-2 px-6 py-2 border borderColor hover:bg-gray-50 rounded-md mt-18 curser-pointer'>
                Explore all cars <img src={assets.arrow_icon} alt="arrow" />
            </motion.button>

        </motion.div >
    )
}

export default FeaturedSection