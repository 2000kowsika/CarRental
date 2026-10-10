import React, { useState } from 'react'
import { assets, cityList } from '../assets/assets'

const Hero = () => {
    const [pickupLocation, setPickupLocation] = useState('')
    const [pickupDate, setPickupDate] = useState('')
    const [returnDate, setReturnDate] = useState('')

    return (
        <div className='min-h-screen flex flex-col items-center justify-center gap-10 bg-light text-center px-4 py-12'>
            <h1 className='text-4xl md:text-5xl font-semibold'>Luxury cars on Rent</h1>

            <form className='flex flex-col md:flex-row items-stretch md:items-center justify-between p-6 rounded-2xl md:rounded-full w-full max-w-5xl bg-white shadow-[0px_8px_20px_rgba(0,0,0,0.08)] gap-6'>
                <div className='flex flex-col md:flex-row items-start md:items-center gap-6 md:ml-4 w-full justify-between'>
                    {/* Location Selection */}
                    <div className='flex flex-col items-start gap-1 text-left w-full md:w-auto'>
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
                    <div className='flex flex-col items-start gap-1 text-left w-full md:w-auto'>
                        <label htmlFor='pickup-date' className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Pick-up Date</label>
                        <input
                            type="date"
                            id="pickup-date"
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className='text-sm text-gray-700 outline-none bg-transparent font-medium cursor-pointer w-full'
                            required
                        />
                    </div>

                    <div className='hidden md:block w-px h-10 bg-gray-200'></div>

                    {/* Return Date */}
                    <div className='flex flex-col items-start gap-1 text-left w-full md:w-auto'>
                        <label htmlFor='return-date' className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Return Date</label>
                        <input
                            type="date"
                            id="return-date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            min={pickupDate || new Date().toISOString().split('T')[0]}
                            className='text-sm text-gray-700 outline-none bg-transparent font-medium cursor-pointer w-full'
                            required
                        />
                    </div>
                </div>

                {/* Search Button */}
                <button
                    type='submit'
                    className='flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary-dull text-white rounded-full transition-all cursor-pointer shadow-md self-center md:self-auto'
                >
                    <img src={assets.search_icon} alt="search" className='w-4 h-4 brightness-200' />
                    <span>Search</span>
                </button>
            </form>

            <img src={assets.main_car} alt="car" className='max-h-74 object-contain mt-4' />
        </div>
    )
}

export default Hero