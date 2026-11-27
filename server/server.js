import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js"
import bookingRouter from "./routes/bookingRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import kycRouter from "./routes/kycRoutes.js";
import analyticsRouter from "./routes/analyticsRoutes.js";
import { initBookingReminderScheduler } from "./configs/scheduler.js";

// Initialize Express App
const app = express()

// Connect Database
await connectDB()

// Start 24h Booking Reminder Scheduler
initBookingReminderScheduler()

//middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.send("Server is running"))
app.use('/api/user', userRouter)
app.use('/api/owner', ownerRouter)
app.use('/api/bookings', bookingRouter)
app.use('/api/payment', paymentRouter)
app.use('/api/reviews', reviewRouter)
app.use('/api/kyc', kycRouter)
app.use('/api/analytics', analyticsRouter)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))


