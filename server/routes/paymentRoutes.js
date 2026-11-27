import express from "express";
import { initiatePayment, handlePayHereNotify, verifyPaymentStatus } from "../controllers/paymentController.js";
import { protect, optionalAuth } from "../middleware/auth.js";

const paymentRouter = express.Router();

// Generate secure PayHere hash & initiation object (supports guests or users)
paymentRouter.post("/initiate", optionalAuth, initiatePayment);

// Server-to-server callback from PayHere (no auth header, authenticated via MD5 hash signature)
paymentRouter.post("/notify", express.urlencoded({ extended: true }), handlePayHereNotify);

// Client-side verification check
paymentRouter.post("/verify", protect, verifyPaymentStatus);

export default paymentRouter;
