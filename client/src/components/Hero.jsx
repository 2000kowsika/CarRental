import React, { useState } from 'react'
import { assets, cityList } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { motion } from 'motion/react'

const Hero = () => {
    const [pickupLocation, setPickupLocation] = useState('')
    const { pickupDate, setPickupDate, returnDate, setReturnDate, navigate } = useAppContext()

    const handleSearch = (e) => {
        e.preventDefault()
        navigate('/cars?pickupLocation=' + pickupLocation + '&pickupDate=' + pickupDate + '&returnDate=' + returnDate)
    }



    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className='h-screen flex flex-col items-center justify-center gap-14 bg-light text-center'>

            <motion.h1 initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className='text-4xl md:text-5xl font-semibold'>Luxury cars on Rent</motion.h1>

            <motion.form
                initial={{ y: 0.95, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}

                onSubmit={handleSearch} className='flex flex-col md:flex-row items-stretch md:items-center justify-between p-6 rounded-2xl md:rounded-full w-full max-w-5xl bg-white shadow-[0px_8px_20px_rgba(0,0,0,0.08)] gap-6'>
                <div className='flex flex-col md:flex-row items-start md:items-center gap-10 min-md:ml-8'>
                    {/* Location Selection */}
                    <div className='flex flex-col items-start gap-2'>
                        <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Location</label>
                        <select
                            required
                            value={pickupLocation}
                            onChange={(e) => setPickupLocation(e.target.value)}
                            className='outline-none bg-transparent font-medium text-gray-700 cursor-pointer w-full text-sm'
                        >
                            <option value="">Pickup Location</option>
                            {cityList.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <p className='text-xs text-gray-400'>
                            {pickupLocation ? pickupLocation : 'Please select location'}
                        </p>
                    </div>
                    <div className='hidden md:block w-px h-10 bg-gray-200'></div>

                    {/* Pick-up Date */}
                    <div className='flex flex-col items-start gap-2'>
                        <label htmlFor='pickup-date' className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Pick-up Date</label>
                        <input value={pickupDate} onChange={e => setPickupDate(e.target.value)} type="date" id="pickup-date"
                            min={new Date().toISOString().split('T')[0]}
                            className='text-sm text-gray-700 outline-none bg-transparent font-medium cursor-pointer w-full'
                            required
                        />
                    </div>

                    <div className='hidden md:block w-px h-10 bg-gray-200'></div>

                    {/* Return Date */}
                    <div className='flex flex-col items-start gap-2 '>
                        <label htmlFor='return-date' className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Return Date</label>
                        <input value={returnDate} onChange={e => setReturnDate(e.target.value)}
                            type="date"
                            id="return-date"
                            min={pickupDate || new Date().toISOString().split('T')[0]}
                            className='text-sm text-gray-500' required />
                    </div>
                </div>

                {/* Search Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className='flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary-dull text-white rounded-full transition-all cursor-pointer shadow-md self-center md:self-auto'
                >
                    <img src={assets.search_icon} alt="search" className=' brightness-300' />
                    Search
                </motion.button>
            </motion.form>

            <motion.img
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                src={assets.main_car} alt="car" className='max-h-74' />
        </motion.div>
    )
}

export default Hero