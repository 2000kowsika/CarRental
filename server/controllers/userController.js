import User from "../models/User.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import Car from "../models/Car.js"
import { sendResetPasswordEmail } from "../configs/email.js"

// Generate JWT Token
const generateToken = (userId) => {
    const payload = userId;
    return jwt.sign({ id: userId }, process.env.JWT_SECRET)
}

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password || password.length < 8) {
            return res.json({ success: false, message: 'Fill all the fields' })
        }
        const userExist = await User.findOne({ email })
        if (userExist) {
            return res.json({ success: false, message: "User already exists" })

        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({ name, email, password: hashedPassword })
        const token = generateToken(user._id.toString())
        res.json({ success: true, token })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}
// Login User
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.json({ success: false, message: "User not found" })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid Credentials" })
        }
        const token = generateToken(user._id.toString())
        res.json({ success: true, token })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })

    }
}

// Get user data using Token (JWT)
export const getUserData = async (req, res) => {
    try {
        const { user } = req;
        res.json({ success: true, user })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}
// Get All the Cars for the Frontend
export const getCars = async (req, res) => {
    try {
        const cars = await Car.find({ isAvailable: true })
        res.json({ success: true, cars })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// Forgot Password - send reset link to registered email
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        if (!email) {
            return res.json({ success: false, message: "Please provide an email address" })
        }

        const user = await User.findOne({ email: email.toLowerCase() })

        // To prevent account enumeration, respond with success message even if email is not found
        if (!user) {
            return res.json({
                success: true,
                message: "If an account with that email exists, a password reset link has been sent."
            })
        }

        // Generate a secure random token
        const resetToken = crypto.randomBytes(32).toString("hex")

        // Hash token for database storage
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

        // Set token expiration to 15 minutes from now
        user.resetPasswordToken = hashedToken
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000
        await user.save()

        // Construct reset URL for client
        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173"
        const resetUrl = `${clientUrl}/reset-password/${resetToken}`

        const emailResult = await sendResetPasswordEmail(user.email, resetUrl)

        res.json({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent.",
            // In development or test environments, previewUrl is provided if available
            previewUrl: emailResult.previewUrl || null,
            resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined
        })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

// Reset Password - verify token and update password
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params
        const { password, confirmPassword } = req.body

        if (!token) {
            return res.json({ success: false, message: "Reset token is missing or invalid" })
        }

        if (!password || password.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters long" })
        }

        if (password !== confirmPassword) {
            return res.json({ success: false, message: "Passwords do not match" })
        }

        // Hash the incoming token to match against the hashed token in database
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        })

        if (!user) {
            return res.json({
                success: false,
                message: "Password reset link is invalid or has expired."
            })
        }

        // Hash new password using existing bcrypt method
        const hashedPassword = await bcrypt.hash(password, 10)

        // Update password and invalidate reset token
        user.password = hashedPassword
        user.resetPasswordToken = null
        user.resetPasswordExpires = null
        await user.save()

        res.json({
            success: true,
            message: "Password has been successfully reset. You can now log in."
        })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}
