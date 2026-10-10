import React, { useState } from 'react'
import { assets, ownerMenuLinks, dummyUserData } from '../../assets/assets';
import { useLocation, NavLink } from 'react-router-dom';

const Sidebar = () => {
    const [user, setUser] = useState(dummyUserData);
    const location = useLocation();
    const [image, setImage] = useState(null);

    const updateImage = async () => {
        if (image) {
            setUser(prev => ({ ...prev, image: URL.createObjectURL(image) }));
            setImage(null);
        }
    }

    return (
        <div className='relative min-h-screen md:flex flex-col items-center pt-8 max-w-13 md:max-w-60 w-full border-r border-borderColor text-sm'>
            <div className='group relative'>
                <label htmlFor="image" className='cursor-pointer block relative'>
                    <img
                        src={image ? URL.createObjectURL(image) : user?.image || "http://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300"}
                        alt="Profile"
                        className='h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto object-cover'
                    />
                    <input
                        type="file"
                        id="image"
                        accept="image/*"
                        hidden
                        onChange={(e) => setImage(e.target.files[0])}
                    />

                    <div className='absolute hidden top-0 right-0 left-0 bottom-0 bg-black/20 rounded-full group-hover:flex items-center justify-center cursor-pointer'>
                        <img src={assets.edit_icon} alt="Edit" className='w-4 h-4' />
                    </div>
                </label>
            </div>

            {image && (
                <button
                    onClick={updateImage}
                    className='mt-2 flex items-center p-1.5 px-3 gap-1 bg-primary/10 text-primary cursor-pointer rounded-md text-xs font-medium'
                >
                    Save <img src={assets.check_icon} width={13} alt="Check" />
                </button>
            )}

            <p className='mt-2 text-base max-md:hidden font-medium'>{user?.name}</p>

            <div className='w-full mt-4'>
                {ownerMenuLinks.map((link, index) => (
                    <NavLink
                        key={index}
                        to={link.path}
                        className={`relative flex items-center gap-2 w-full py-3 pl-4 first:mt-2 ${link.path === location.pathname ? 'bg-primary/10 text-primary' : 'text-gray-600'}`}
                    >
                        <img src={link.path === location.pathname ? link.coloredIcon : link.icon} alt={link.name} />
                        <span className='max-md:hidden'>{link.name}</span>
                        <div className={`${link.path === location.pathname ? 'bg-primary' : ''} w-1.5 h-8 rounded-l right-0 absolute`}></div>
                    </NavLink>
                ))}
            </div>
        </div>
    )
}

export default Sidebar