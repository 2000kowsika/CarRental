import Booking from "../models/Booking.js"
import Car from "../models/Car.js";
import User from "../models/User.js";
import {
    sendBookingReceivedEmail,
    sendBookingConfirmedEmail,
    sendBookingCancelledEmail,
} from "../configs/email.js";

// Function to Check Availability of Car for given Date
const checkAvailability = async (car, pickupDate, returnDate) => {
    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);

    const bookings = await Booking.find({
        car,
        status: { $ne: "cancelled" },
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

// API to craete Booking
export const createBooking = async (req, res) => {
    try {
        const { _id } = req.user;
        const { car, pickupDate, returnDate } = req.body;
        const isAvailable = await checkAvailability(car, pickupDate, returnDate)
        if (!isAvailable) {
            return res.json({ success: false, message: "Car is not available" })
        }

        const carData = await Car.findById(car)
        if (!carData) {
            return res.json({ success: false, message: "Car not found" })
        }

        // Calculate price based on pickupDate and returnDate

        const picked = new Date(pickupDate);
        const returned = new Date(returnDate);
        const noOfDays = Math.ceil((returned - picked) / (1000 * 60 * 60 * 24))
        const price = carData.pricePerDay * noOfDays;

        const newBooking = await Booking.create({ car, owner: carData.owner, user: _id, pickupDate, returnDate, price })

        // Send Booking Received confirmation email asynchronously
        sendBookingReceivedEmail(req.user, newBooking, carData).catch((err) =>
            console.error("Booking received email error:", err.message)
        );

        res.json({ success: true, message: "Booking Created" })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// API to List User Bookings
export const getUserBookings = async (req, res) => {
    try {
        const { _id } = req.user;
        const bookings = await Booking.find({ user: _id }).populate("car").sort({ createdAt: -1 })
        res.json({ success: true, bookings })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

// API to get Owner Bookings
export const getOwnerBookings = async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.json({ success: false, message: "Unauthorized" })
        }
        const bookings = await Booking.find({ owner: req.user._id })
            .populate('car')
            .populate({ path: 'user', select: '-password' })
            .sort({ createdAt: -1 })
        res.json({ success: true, bookings })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

// API to change booking status
export const changeBookingStatus = async (req, res) => {
    try {
        const { _id } = req.user;
        const { bookingId, status } = req.body
        const booking = await Booking.findById(bookingId)

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" })
        }

        if (booking.owner.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized" })
        }
        booking.status = status;
        await booking.save();

        // If owner confirmed the booking, notify the customer via email
        if (status === "confirmed") {
            const customer = await User.findById(booking.user);
            const car = await Car.findById(booking.car);
            if (customer && car) {
                sendBookingConfirmedEmail(customer, booking, car).catch((err) =>
                    console.error("Booking confirmed email error:", err.message)
                );
            }
        }

        res.json({ success: true, message: "Status Updated" })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

// API for customer to cancel their own booking
export const cancelBooking = async (req, res) => {
    try {
        const { _id } = req.user;
        const { bookingId, reason } = req.body;

        const booking = await Booking.findById(bookingId).populate("car");

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        // Authorization check: only the customer who made the booking can cancel it
        if (booking.user.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized to cancel this booking" });
        }

        // Check if already cancelled
        if (booking.status === "cancelled") {
            return res.json({ success: false, message: "This booking is already cancelled" });
        }

        // Cancellation policy: Cannot cancel if the rental start time has already passed
        const now = new Date();
        const pickup = new Date(booking.pickupDate);
        if (now >= pickup) {
            return res.json({
                success: false,
                message: "Cannot cancel a booking that has already started or passed its pick-up date"
            });
        }

        // Update booking status
        booking.status = "cancelled";
        booking.cancelledAt = new Date();
        booking.cancellationReason = reason || "Cancelled by customer";

        // Payment status note: If the booking was already paid online,
        // flag it as 'refund_pending' so it is not marked as completed until
        // confirmed/processed by the payment gateway or administrator.
        if (booking.paymentStatus === "paid") {
            booking.paymentStatus = "refund_pending";
        }

        await booking.save();

        // Dispatch cancellation email to customer asynchronously
        sendBookingCancelledEmail(req.user, booking, booking.car).catch((err) =>
            console.error("Booking cancellation email error:", err.message)
        );

        res.json({
            success: true,
            message: booking.paymentStatus === "refund_pending"
                ? "Booking cancelled successfully. Refund has been initiated and is pending processing."
                : "Booking cancelled successfully. Car availability has been restored for these dates.",
            booking
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
