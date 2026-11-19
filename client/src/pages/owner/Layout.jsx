import React, { useEffect } from 'react'
import NavbarOwner from '../../components/owner/NavbarOwner'
import Sidebar from '../../components/owner/Sidebar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'

const Layout = () => {
    const { isOwner, navigate, token } = useAppContext()

    useEffect(() => {
        // Only redirect if token was checked and user is definitively not an owner
        const storedToken = localStorage.getItem('token')
        if (!storedToken) {
            navigate('/')
        } else if (token && !isOwner) {
            navigate('/')
        }
    }, [isOwner, token])
    return (
        <div className='flex flex-col'>
            <NavbarOwner />
            <div className='flex'>
                <Sidebar />
                <Outlet />
            </div>
        </div>
    )
}

export default Layout