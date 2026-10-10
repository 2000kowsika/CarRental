import React from 'react'
import { assets } from '../assets/assets'

const Loader = () => {
    return (
        <div className='flex justify-center items-center h-[80vh]' >
            <div className='animate-spin rounded-full h-4 w-14 border-4 border-gray-300 border-t-p'></div>


        </div>
    )
}

export default Loader