import express from "express";
import {
    addReview,
    getCarReviews,
    updateReview,
    deleteReview,
    getEligibleBookingForReview,
} from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";

const reviewRouter = express.Router();

// Public: Fetch all reviews for a car
reviewRouter.get("/car/:carId", getCarReviews);

// Protected: Check eligibility to write a review
reviewRouter.get("/eligible/:carId", protect, getEligibleBookingForReview);

// Protected: Submit, update, and delete reviews
reviewRouter.post("/add", protect, addReview);
reviewRouter.put("/update", protect, updateReview);
reviewRouter.delete("/delete/:reviewId", protect, deleteReview);

export default reviewRouter;
