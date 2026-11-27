import express from "express";
import {
    addReview,
    getCarReviews,
    updateReview,
    deleteReview,
    getEligibleBookingForReview,
} from "../controllers/reviewController.js";
import { protect, optionalAuth } from "../middleware/auth.js";

const reviewRouter = express.Router();

// Public: Fetch all reviews for a car
reviewRouter.get("/car/:carId", getCarReviews);

// Check eligibility to write a review (authenticated or guest)
reviewRouter.get("/eligible/:carId", optionalAuth, getEligibleBookingForReview);

// Submit review (supports logged in users or guests with completed booking)
reviewRouter.post("/add", optionalAuth, addReview);
reviewRouter.put("/update", protect, updateReview);
reviewRouter.delete("/delete/:reviewId", protect, deleteReview);

export default reviewRouter;
