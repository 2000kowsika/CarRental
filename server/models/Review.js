import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const reviewSchema = new mongoose.Schema(
    {
        car: { type: ObjectId, ref: "Car", required: true },
        user: { type: ObjectId, ref: "User", default: null },
        customerName: { type: String, default: "" },
        booking: { type: ObjectId, ref: "Booking", required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true, trim: true, maxlength: 1000 },
        isApproved: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Prevent same user from submitting more than one review for the same booking
reviewSchema.index({ booking: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
