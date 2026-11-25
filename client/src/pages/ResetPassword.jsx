import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { motion } from 'motion/react'

const ResetPassword = () => {
    const { token } = useParams()
    const navigate = useNavigate()
    const { axios, setShowLogin } = useAppContext()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const onSubmitHandler = async (e) => {
        e.preventDefault()

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters long')
            return
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            const { data } = await axios.post(`/api/user/reset-password/${token}`, {
                password,
                confirmPassword,
            })

            if (data.success) {
                setIsSuccess(true)
                toast.success(data.message)
                setTimeout(() => {
                    setShowLogin(true)
                    navigate('/')
                }, 2500)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-lg p-8 text-gray-600"
            >
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Reset <span className="text-primary">Password</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Enter your new password below.
                    </p>
                </div>

                {isSuccess ? (
                    <div className="text-center py-6 flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold">
                            ✓
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">Password Reset Successful!</h2>
                        <p className="text-sm text-gray-500">
                            Your password has been updated. Redirecting you to login...
                        </p>
                        <button
                            onClick={() => {
                                setShowLogin(true)
                                navigate('/')
                            }}
                            className="mt-3 px-6 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dull transition-colors"
                        >
                            Open Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={onSubmitHandler} method="post" action="#" className="flex flex-col gap-4 text-sm">
                        <div>
                            <label htmlFor="new-password" className="block text-gray-700 font-medium mb-1">New Password</label>
                            <input
                                id="new-password"
                                name="newPassword"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="block text-gray-700 font-medium mb-1">Confirm New Password</label>
                            <input
                                id="confirm-password"
                                name="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your new password"
                                autoComplete="new-password"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-primary hover:bg-blue-800 text-white font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Updating Password...' : 'Reset Password'}
                        </button>

                        <div className="text-center mt-3 text-xs">
                            <Link to="/" className="text-gray-500 hover:text-primary">
                                ← Return to Home
                            </Link>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    )
}

export default ResetPassword
