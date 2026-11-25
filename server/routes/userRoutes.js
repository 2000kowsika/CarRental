import express from "express";
import { getCars, getUserData, registerUser, loginUser, forgotPassword, resetPassword } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/forgot-password', forgotPassword)
userRouter.post('/reset-password/:token', resetPassword)
userRouter.get('/data', protect, getUserData)
userRouter.get('/cars', getCars)

export default userRouter;