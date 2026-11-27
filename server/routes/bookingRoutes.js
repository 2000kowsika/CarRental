import express from "express";
import upload from "../middleware/multer.js";
import {
    cancelBooking,
    changeBookingStatus,
    checkAvailabilityOfCar,
    createBooking,
    getOwnerBookings,
    getUserBookings,
    handleCancellationAction,
    getBookingById,
    verifyBookingLicense,
    getLicenseDocument,
} from "../controllers/bookingController.js";
import { protect, optionalAuth } from "../middleware/auth.js";

const bookingRouter = express.Router();

bookingRouter.post('/check-availability', checkAvailabilityOfCar)
bookingRouter.post(
    '/create',
    upload.fields([
        { name: "licenseFront", maxCount: 1 },
        { name: "licenseBack", maxCount: 1 },
    ]),
    optionalAuth,
    createBooking
)
bookingRouter.get('/user', protect, getUserBookings)
bookingRouter.get('/owner', protect, getOwnerBookings)
bookingRouter.post('/change-status', protect, changeBookingStatus)
bookingRouter.post('/cancel', optionalAuth, cancelBooking)
bookingRouter.post('/admin/cancellation-action', protect, handleCancellationAction)
bookingRouter.get('/details/:id', optionalAuth, getBookingById)

// Admin Driving Licence Verification endpoints
bookingRouter.post('/admin/verify-license', protect, verifyBookingLicense)
bookingRouter.get('/admin/license-doc/:bookingId/:side', protect, getLicenseDocument)

export default bookingRouter; 