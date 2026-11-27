import crypto from "crypto";
import Booking from "../models/Booking.js"
import Car from "../models/Car.js";
import User from "../models/User.js";
import imagekit from "../configs/imageKit.js";
import { toFile } from "@imagekit/nodejs";
import {
    sendBookingReceivedEmail,
    sendBookingConfirmedEmail,
    sendBookingCancelledEmail,
} from "../configs/email.js";

// Helper: Mask sensitive driver license numbers (e.g. B1234567 -> B***4567)
const maskLicenseNumber = (num) => {
    if (!num) return "";
    const clean = num.trim();
    if (clean.length <= 4) return "****";
    return clean.slice(0, 1) + "***" + clean.slice(-4);
};

// Helper to generate a unique human-friendly Booking ID (e.g., CR-8F3A29B1)
export const generateUniqueBookingId = async () => {
    let id;
    let exists = true;
    while (exists) {
        const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
        id = `CR-${randomHex}`;
        const found = await Booking.findOne({ bookingId: id });
        if (!found) exists = false;
    }
    return id;
};

// Function to Check Availability of Car for given Date
const checkAvailability = async (car, pickupDate, returnDate) => {
    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);

    const bookings = await Booking.find({
        car,
        status: { $nin: ["cancelled"] },
        pickupDate: { $lte: returnD },
        returnDate: { $gte: pickup },
    })
    return bookings.length === 0;
}

// API to check Availability of Cars for the given Date and location
export const checkAvailabilityOfCar = async (req, res) => {
    try {
        const { location, pickupDate, returnDate } = req.body

        // fetch all available cars for the given location
        const cars = await Car.find({ location, isAvailable: true })

        // check car availability for the given date range using promise
        const availableCarsPromises = cars.map(async (car) => {
            const isAvailable = await checkAvailability(car._id, pickupDate, returnDate)
            return { ...car._doc, isAvailable: isAvailable }
        })

        let availableCars = await Promise.all(availableCarsPromises);
        availableCars = availableCars.filter(car => car.isAvailable === true)

        res.json({ success: true, availableCars })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// API to create Booking (supports logged-in users AND guest customers)
export const createBooking = async (req, res) => {
    try {
        const {
            car,
            pickupDate,
            returnDate,
            customerName,
            customerEmail,
            customerPhone,
            licenseNumber,
            specialRequests,
        } = req.body;

        const files = req.files;

        // Validation for required fields
        if (!customerName || !customerName.trim()) {
            return res.json({ success: false, message: "Customer Full Name is required" });
        }
        if (!customerEmail || !customerEmail.trim()) {
            return res.json({ success: false, message: "Customer Email Address is required" });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail.trim())) {
            return res.json({ success: false, message: "Please provide a valid email address" });
        }
        if (!customerPhone || !customerPhone.trim()) {
            return res.json({ success: false, message: "Phone Number is required" });
        }
        if (!files || !files.licenseFront || !files.licenseBack) {
            return res.json({
                success: false,
                message: "Please upload both Front and Back images/PDFs of your driving licence",
            });
        }
        if (!car || !pickupDate || !returnDate) {
            return res.json({ success: false, message: "Car and dates are required" });
        }

        const frontFile = files.licenseFront[0];
        const backFile = files.licenseBack[0];

        // Allowed document types: JPG, JPEG, PNG, WEBP, PDF
        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "application/pdf",
        ];
        if (!allowedTypes.includes(frontFile.mimetype) || !allowedTypes.includes(backFile.mimetype)) {
            return res.json({
                success: false,
                message: "Invalid file format. Accepted formats: JPG, JPEG, PNG, and PDF.",
            });
        }

        // Validate File Size: Max 5MB per document
        const maxSize = 5 * 1024 * 1024;
        if (frontFile.size > maxSize || backFile.size > maxSize) {
            return res.json({
                success: false,
                message: "Licence documents must be smaller than 5MB each.",
            });
        }

        const isAvailable = await checkAvailability(car, pickupDate, returnDate)
        if (!isAvailable) {
            return res.json({ success: false, message: "Car is not available for the selected dates" })
        }

        const carData = await Car.findById(car)
        if (!carData) {
            return res.json({ success: false, message: "Car not found" })
        }

        // Calculate price based on pickupDate and returnDate
        const picked = new Date(pickupDate);
        const returned = new Date(returnDate);
        const noOfDays = Math.max(1, Math.ceil((returned - picked) / (1000 * 60 * 60 * 24)))
        const price = carData.pricePerDay * noOfDays;

        const bookingId = await generateUniqueBookingId();
        const userId = req.user ? req.user._id : null;

        // Securely upload licence front and back documents to private folder in ImageKit
        const frontExt = frontFile.mimetype === "application/pdf" ? "pdf" : "jpg";
        const backExt = backFile.mimetype === "application/pdf" ? "pdf" : "jpg";

        const frontBuffer = await toFile(frontFile.buffer, `license_front_${bookingId}.${frontExt}`);
        const frontUpload = await imagekit.files.upload({
            file: frontBuffer,
            fileName: `license_front_${bookingId}.${frontExt}`,
            folder: "/booking_licenses",
        });

        const backBuffer = await toFile(backFile.buffer, `license_back_${bookingId}.${backExt}`);
        const backUpload = await imagekit.files.upload({
            file: backBuffer,
            fileName: `license_back_${bookingId}.${backExt}`,
            folder: "/booking_licenses",
        });

        const masked = licenseNumber ? maskLicenseNumber(licenseNumber) : "";

        const newBooking = await Booking.create({
            bookingId,
            car,
            owner: carData.owner,
            user: userId,
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim().toLowerCase(),
            customerPhone: customerPhone.trim(),
            licenseNumber: (licenseNumber || "").trim(),
            licenseNumberMasked: masked,
            licenseFront: frontUpload.url,
            licenseBack: backUpload.url,
            licenseStatus: "Pending",
            specialRequests: (specialRequests || "").trim(),
            pickupLocation: carData.location || "Default Location",
            pickupDate,
            returnDate,
            price,
            paymentStatus: "pending",
            status: "pending",
        })

        // Send Booking Received confirmation email asynchronously
        const customerProfile = {
            name: customerName.trim(),
            email: customerEmail.trim().toLowerCase(),
        };
        sendBookingReceivedEmail(customerProfile, newBooking, carData).catch((err) =>
            console.error("Booking received email error:", err.message)
        );

        res.json({
            success: true,
            message: "Booking Created Successfully!",
            bookingId: newBooking.bookingId,
            booking: newBooking,
        })

    } catch (error) {
        console.log("Create booking error:", error.message);
        res.json({ success: false, message: error.message })
    }
}

// API to get a single booking by ID or MongoDB _id (for confirmation page & invoice)
export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        let booking = null;
        if (id.startsWith("CR-")) {
            booking = await Booking.findOne({ bookingId: id }).populate("car").populate("owner", "name email phone");
        } else {
            booking = await Booking.findById(id).populate("car").populate("owner", "name email phone");
        }
        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }
        res.json({ success: true, booking });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// API to List User Bookings (by auth or matching customer email)
export const getUserBookings = async (req, res) => {
    try {
        const { _id, email } = req.user;
        const query = {
            $or: [
                { user: _id },
                { customerEmail: (email || "").toLowerCase() }
            ]
        };
        const bookings = await Booking.find(query).populate("car").sort({ createdAt: -1 })
        res.json({ success: true, bookings })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

// API to get Owner / Admin Bookings
export const getOwnerBookings = async (req, res) => {
    try {
        const isOwnerOrAdmin = req.user.role === 'owner' || req.user.role === 'admin';
        if (!isOwnerOrAdmin) {
            return res.json({ success: false, message: "Unauthorized" })
        }
        // If admin, can view all bookings across platform; if owner, view bookings for own cars
        const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };
        const bookings = await Booking.find(filter)
            .populate('car')
            .populate({ path: 'user', select: '-password' })
            .sort({ createdAt: -1 })
        res.json({ success: true, bookings })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

// API to change booking status or payment status (Admin/Owner)
export const changeBookingStatus = async (req, res) => {
    try {
        const { _id, role } = req.user;
        const { bookingId, status, paymentStatus } = req.body
        const booking = await Booking.findById(bookingId).populate("car")

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" })
        }

        if (role !== "admin" && booking.owner.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized" })
        }

        if (status) {
            // Prevent booking approval when the licence is rejected or still pending
            if (status === "confirmed") {
                if (booking.licenseStatus === "Rejected") {
                    return res.json({
                        success: false,
                        message: "Cannot approve this booking: Customer Driving Licence has been REJECTED. Licence must be verified first."
                    });
                }
                if (booking.licenseStatus === "Pending") {
                    return res.json({
                        success: false,
                        message: "Driving Licence verification is still Pending. Please review and verify the licence before approving this booking."
                    });
                }
            }

            booking.status = status;
            if (status === "cancelled") {
                booking.cancelledAt = new Date();
                if (booking.paymentStatus === "paid") {
                    booking.paymentStatus = "refunded";
                }
            }
        }
        if (paymentStatus) {
            booking.paymentStatus = paymentStatus;
        }

        await booking.save();

        // If owner confirmed the booking, notify the customer via email
        if (status === "confirmed") {
            const customerObj = {
                name: booking.customerName,
                email: booking.customerEmail,
            };
            sendBookingConfirmedEmail(customerObj, booking, booking.car).catch((err) =>
                console.error("Booking confirmed email error:", err.message)
            );
        } else if (status === "cancelled") {
            const customerObj = {
                name: booking.customerName,
                email: booking.customerEmail,
            };
            sendBookingCancelledEmail(customerObj, booking, booking.car).catch((err) =>
                console.error("Booking cancellation email error:", err.message)
            );
        }

        res.json({ success: true, message: "Booking status updated successfully", booking })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

// API for customer to request cancellation of their booking
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId, reason, email } = req.body;
        const booking = await Booking.findById(bookingId).populate("car");

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        // Authorization check: if logged in user matches, or if customer email matches
        const userMatches = req.user && booking.user && booking.user.toString() === req.user._id.toString();
        const emailMatches = (req.user && req.user.email?.toLowerCase() === booking.customerEmail?.toLowerCase()) ||
            (email && email.toLowerCase() === booking.customerEmail?.toLowerCase());

        if (!userMatches && !emailMatches && req.user?.role !== "admin") {
            return res.json({ success: false, message: "Unauthorized to request cancellation for this booking" });
        }

        if (booking.status === "cancelled") {
            return res.json({ success: false, message: "This booking is already cancelled" });
        }

        if (booking.status === "cancellation_requested") {
            return res.json({ success: false, message: "A cancellation request is already pending Admin review" });
        }

        const now = new Date();
        const pickup = new Date(booking.pickupDate);
        if (now >= pickup) {
            return res.json({
                success: false,
                message: "Cannot cancel a booking that has already started or passed its pick-up date"
            });
        }

        // Mark as cancellation_requested for Admin approval
        booking.status = "cancellation_requested";
        booking.cancellationRequestedAt = new Date();
        booking.cancellationReason = reason || "Customer submitted a cancellation request";

        await booking.save();

        res.json({
            success: true,
            message: "Cancellation request submitted. An Admin will review and approve your cancellation.",
            booking
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API for Admin to approve or reject a cancellation request
export const handleCancellationAction = async (req, res) => {
    try {
        const { _id, role } = req.user;
        const { bookingId, action, rejectionReason } = req.body; // action: 'approve' | 'reject'

        if (role !== "admin" && role !== "owner") {
            return res.status(403).json({ success: false, message: "Unauthorized: Admin authorization required" });
        }

        const booking = await Booking.findById(bookingId).populate("car");
        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        if (role !== "admin" && booking.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized for this booking" });
        }

        if (action === "approve") {
            booking.status = "cancelled";
            booking.cancelledAt = new Date();
            if (booking.paymentStatus === "paid") {
                booking.paymentStatus = "refunded";
            }
            await booking.save();

            const customerObj = { name: booking.customerName, email: booking.customerEmail };
            sendBookingCancelledEmail(customerObj, booking, booking.car).catch((err) =>
                console.error("Cancellation email error:", err.message)
            );

            return res.json({
                success: true,
                message: "Cancellation request approved. Booking has been cancelled and vehicle availability restored.",
                booking
            });
        } else if (action === "reject") {
            // Revert back to confirmed or pending depending on payment
            booking.status = booking.paymentStatus === "paid" ? "confirmed" : "pending";
            booking.cancellationReason = rejectionReason ? `Cancellation Rejected: ${rejectionReason}` : "Cancellation request rejected by Admin";
            await booking.save();

            return res.json({
                success: true,
                message: "Cancellation request rejected. Booking remains active.",
                booking
            });
        } else {
            return res.json({ success: false, message: "Invalid action. Choose approve or reject" });
        }
    } catch (error) {
        console.error("Cancellation action error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// API for Admin to review and update a booking's Driving Licence verification
export const verifyBookingLicense = async (req, res) => {
    try {
        const { role, _id } = req.user;
        const { bookingId, status, rejectionReason } = req.body; // status: 'Verified' | 'Rejected' | 'Pending'

        if (role !== "admin" && role !== "owner") {
            return res.status(403).json({ success: false, message: "Unauthorized: Admin authorization required" });
        }

        const booking = await Booking.findById(bookingId).populate("car");
        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        if (role !== "admin" && booking.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized for this booking" });
        }

        if (!["Pending", "Verified", "Rejected"].includes(status)) {
            return res.json({ success: false, message: "Invalid status. Must be Pending, Verified, or Rejected" });
        }

        booking.licenseStatus = status;
        if (status === "Verified") {
            booking.licenseVerifiedAt = new Date();
            booking.licenseRejectionReason = "";
        } else if (status === "Rejected") {
            booking.licenseRejectionReason = rejectionReason || "Driving Licence document did not meet verification criteria";
            // If booking was pending approval, keep it from being approved
        } else {
            booking.licenseRejectionReason = "";
        }

        await booking.save();

        res.json({
            success: true,
            message: `Licence verification status updated to ${status}`,
            booking,
        });
    } catch (error) {
        console.error("Verify booking license error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// API for authorized Admin/Owner to securely view a licence document URL
export const getLicenseDocument = async (req, res) => {
    try {
        const { role, _id } = req.user;
        const { bookingId, side } = req.params; // side: 'front' | 'back'

        if (role !== "admin" && role !== "owner") {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (role !== "admin" && booking.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized for this booking" });
        }

        const documentUrl = side === "front" ? booking.licenseFront : booking.licenseBack;
        if (!documentUrl) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }

        // Return the secure URL for viewing inside Admin portal
        res.json({ success: true, documentUrl, licenseNumberMasked: booking.licenseNumberMasked, licenseNumber: booking.licenseNumber });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
