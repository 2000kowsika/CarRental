import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'
import { assets } from '../assets/assets'

const Login = () => {

    const { setShowLogin, axios, setToken, navigate } = useAppContext()

    const [state, setState] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        setLoading(true);
        try {
            if (state === "forgot") {
                const { data } = await axios.post('/api/user/forgot-password', { email });
                if (data.success) {
                    setForgotSuccess(true);
                    toast.success(data.message);
                } else {
                    toast.error(data.message);
                }
                setLoading(false);
                return;
            }

            const { data } = await axios.post(`/api/user/${state}`, { name, email, password })

            if (data.success) {
                // Set authenticated token and headers
                setToken(data.token)
                localStorage.setItem('token', data.token)
                toast.success(state === "login" ? "Logged in successfully" : "Account created successfully")

                // Dispatch native PasswordCredential store if supported
                if (window.PasswordCredential && navigator.credentials && formElement) {
                    try {
                        const cred = new window.PasswordCredential(formElement);
                        navigator.credentials.store(cred).catch(() => { });
                    } catch (e) {
                        // fallback silent
                    }
                }

                // Chrome requires the login form and inputs to remain in the DOM for a brief
                // window after submission while the password manager evaluates credentials.
                // Delaying modal dismissal by 500ms allows Chrome's native "Save password?" prompt to anchor.
                setTimeout(() => {
                    setShowLogin(false)
                    navigate('/')
                }, 500)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setLoading(false);
        }
    }

    return (
        <div onClick={() => setShowLogin(false)} className='fixed top-0 bottom-0 left-0 right-0 z-100 flex items-center text-sm text-gray-600 bg-black/50'>
            <form onSubmit={onSubmitHandler} onClick={(e) => e.stopPropagation()} method="post" action="#" className="flex flex-col gap-4 m-auto items-start p-8 py-10 w-80 sm:w-[352px] text-gray-500 rounded-lg shadow-xl border border-gray-200 bg-white">
                <p className="text-2xl font-medium m-auto">
                    <span className="text-primary">User</span> {state === "login" ? "Login" : state === "register" ? "Sign Up" : "Forgot Password"}
                </p>

                {state === "forgot" ? (
                    <>
                        <p className="text-xs text-gray-500 text-center w-full">
                            Enter your registered email address and we'll send you a password reset link.
                        </p>
                        <div className="w-full">
                            <label htmlFor="forgot-email" className="block mb-1">Email</label>
                            <input
                                id="forgot-email"
                                name="email"
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                placeholder="type here"
                                className="border border-gray-200 rounded w-full p-2 outline-primary"
                                type="email"
                                autoComplete="email"
                                required
                            />
                        </div>
                        {forgotSuccess && (
                            <div className="bg-blue-50 text-blue-700 text-xs p-2.5 rounded border border-blue-200 w-full text-center">
                                If that email is registered, a reset link has been sent to your inbox.
                            </div>
                        )}
                        <button
                            disabled={loading}
                            type="submit"
                            className="bg-primary hover:bg-blue-800 transition-all text-white w-full py-2 rounded-md cursor-pointer disabled:opacity-50"
                        >
                            {loading ? "Sending link..." : "Send Reset Link"}
                        </button>
                        <p className="text-center w-full">
                            Remember your password?{" "}
                            <span
                                onClick={() => {
                                    setState("login");
                                    setForgotSuccess(false);
                                }}
                                className="text-primary cursor-pointer hover:underline"
                            >
                                Back to Login
                            </span>
                        </p>
                    </>
                ) : (
                    <>
                        {state === "register" && (
                            <div className="w-full">
                                <label htmlFor="register-name" className="block mb-1">Name</label>
                                <input
                                    id="register-name"
                                    name="name"
                                    onChange={(e) => setName(e.target.value)}
                                    value={name}
                                    placeholder="type here"
                                    className="border border-gray-200 rounded w-full p-2 outline-primary"
                                    type="text"
                                    autoComplete="name"
                                    required
                                />
                            </div>
                        )}
                        <div className="w-full">
                            <label htmlFor="auth-email" className="block mb-1">Email</label>
                            <input
                                id="auth-email"
                                name="email"
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                placeholder="type here"
                                className="border border-gray-200 rounded w-full p-2 outline-primary"
                                type="email"
                                autoComplete="username"
                                required
                            />
                        </div>
                        <div className="w-full">
                            <label htmlFor="auth-password" className="block mb-1">Password</label>
                            <div className="relative flex items-center">
                                <input
                                    id="auth-password"
                                    name="password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    value={password}
                                    placeholder="type here"
                                    className="border border-gray-200 rounded w-full p-2 pr-10 outline-primary"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete={state === "login" ? "current-password" : "new-password"}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-2 p-1 text-gray-500 hover:text-gray-700 cursor-pointer focus:outline-none flex items-center justify-center"
                                >
                                    <img
                                        src={showPassword ? assets.eye_close_icon : assets.eye_icon}
                                        alt={showPassword ? "Hide password" : "Show password"}
                                        className="w-5 h-5 opacity-70 hover:opacity-100 transition-opacity"
                                    />
                                </button>
                            </div>
                            {state === "login" && (
                                <div className="text-right mt-1">
                                    <span
                                        onClick={() => {
                                            setState("forgot");
                                            setForgotSuccess(false);
                                        }}
                                        className="text-xs text-primary cursor-pointer hover:underline"
                                    >
                                        Forgot Password?
                                    </span>
                                </div>
                            )}
                        </div>
                        {state === "register" ? (
                            <p>
                                Already have account? <span onClick={() => setState("login")} className="text-primary cursor-pointer hover:underline">click here</span>
                            </p>
                        ) : (
                            <p>
                                Create an account? <span onClick={() => setState("register")} className="text-primary cursor-pointer hover:underline">click here</span>
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary hover:bg-blue-800 transition-all text-white w-full py-2 rounded-md cursor-pointer disabled:opacity-50"
                        >
                            {loading ? "Processing..." : (state === "register" ? "Create Account" : "Login")}
                        </button>
                    </>
                )}
            </form>
        </div>
    )
}

export default Login