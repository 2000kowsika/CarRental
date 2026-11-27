import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";

// Helper to recalculate car average rating and total reviews
const updateCarRatingStats = async (carId) => {
    const reviews = await Review.find({ car: carId });
    const totalReviews = reviews.length;
    const averageRating =
        totalReviews > 0
            ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
            : 0;

    await Car.findByIdAndUpdate(carId, { averageRating, totalReviews });
    return { averageRating, totalReviews };
};

// 1. Submit a Review
export const addReview = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : null;
        const { carId, bookingId, rating, comment, customerEmail } = req.body;

        if (!carId || !bookingId || !rating || !comment) {
            return res.json({ success: false, message: "Please provide all review fields" });
        }

        const numRating = Number(rating);
        if (numRating < 1 || numRating > 5) {
            return res.json({ success: false, message: "Rating must be between 1 and 5 stars" });
        }

        // Verify booking eligibility
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.json({ success: false, message: "Booking record not found" });
        }

        // Verify user authorization: match authenticated user, or match customer email
        const userMatches = userId && booking.user && booking.user.toString() === userId.toString();
        const emailMatches = (req.user && req.user.email?.toLowerCase() === booking.customerEmail?.toLowerCase()) ||
            (customerEmail && customerEmail.toLowerCase() === booking.customerEmail?.toLowerCase());

        if (!userMatches && !emailMatches) {
            return res.json({ success: false, message: "Unauthorized: This booking does not match your credentials" });
        }

        // Must correspond to the car being reviewed
        if (booking.car.toString() !== carId.toString()) {
            return res.json({ success: false, message: "Booking does not match this car" });
        }

        // Check if booking is completed (rental return date in past, and not cancelled)
        const now = new Date();
        const returnDate = new Date(booking.returnDate);
        if (booking.status === "cancelled") {
            return res.json({ success: false, message: "Cannot review a cancelled booking" });
        }
        if (now < returnDate) {
            return res.json({
                success: false,
                message: "You can submit a review only after completing your rental return date.",
            });
        }

        // Check duplicate review for same booking
        const existingReview = await Review.findOne({ booking: bookingId });
        if (existingReview) {
            return res.json({
                success: false,
                message: "You have already submitted a review for this completed booking",
            });
        }

        const newReview = await Review.create({
            car: carId,
            user: userId || booking.user,
            customerName: booking.customerName || (req.user ? req.user.name : "Verified Customer"),
            booking: bookingId,
            rating: numRating,
            comment: comment.trim(),
            isApproved: true,
        });

        await updateCarRatingStats(carId);

        const populatedReview = await Review.findById(newReview._id).populate("user", "name image");

        res.json({
            success: true,
            message: "Review submitted successfully! Thank you for your feedback.",
            review: populatedReview,
        });
    } catch (error) {
        console.error("Add review error:", error);
        res.json({ success: false, message: error.message });
    }
};

// 2. Get All Reviews for a Specific Car
export const getCarReviews = async (req, res) => {
    try {
        const { carId } = req.params;
        const reviews = await Review.find({ car: carId, isApproved: { $ne: false } })
            .populate("user", "name image")
            .sort({ createdAt: -1 });

        res.json({ success: true, reviews });
    } catch (error) {
        console.error("Get reviews error:", error);
        res.json({ success: false, message: error.message });
    }
};

// 3. Edit Review (Only by the author)
export const updateReview = async (req, res) => {
    try {
        const { _id } = req.user;
        const { reviewId, rating, comment } = req.body;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.json({ success: false, message: "Review not found" });
        }

        if (review.user.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized to edit this review" });
        }

        if (rating) {
            const num = Number(rating);
            if (num >= 1 && num <= 5) review.rating = num;
        }
        if (comment) review.comment = comment.trim();

        await review.save();
        await updateCarRatingStats(review.car);

        res.json({ success: true, message: "Review updated successfully", review });
    } catch (error) {
        console.error("Update review error:", error);
        res.json({ success: false, message: error.message });
    }
};

// 4. Delete Review (By Author or Admin)
export const deleteReview = async (req, res) => {
    try {
        const { _id, role } = req.user;
        const { reviewId } = req.params;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.json({ success: false, message: "Review not found" });
        }

        // Author or Admin can delete
        if (review.user.toString() !== _id.toString() && role !== "admin") {
            return res.json({ success: false, message: "Unauthorized to delete this review" });
        }

        const carId = review.car;
        await Review.findByIdAndDelete(reviewId);
        await updateCarRatingStats(carId);

        res.json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
        console.error("Delete review error:", error);
        res.json({ success: false, message: error.message });
    }
};

// 5. Check If User Has Eligible Bookings to Review a Car
export const getEligibleBookingForReview = async (req, res) => {
    try {
        const { _id } = req.user;
        const { carId } = req.params;

        // Find confirmed bookings for this car where the return date has passed
        const now = new Date();
        const bookings = await Booking.find({
            user: _id,
            car: carId,
            status: "confirmed",
            returnDate: { $lte: now },
        }).sort({ returnDate: -1 });

        // Filter out bookings that already have reviews
        const reviewedBookingIds = (
            await Review.find({ user: _id, car: carId }).select("booking")
        ).map((r) => r.booking.toString());

        const eligibleBooking = bookings.find(
            (b) => !reviewedBookingIds.includes(b._id.toString())
        );

        res.json({
            success: true,
            hasEligibleBooking: !!eligibleBooking,
            bookingId: eligibleBooking ? eligibleBooking._id : null,
        });
    } catch (error) {
        console.error("Check eligible booking error:", error);
        res.json({ success: false, message: error.message });
    }
};
