import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types

const bookingSchema = new mongoose.Schema({
    car: { type: ObjectId, ref: "Car", required: true },
    user: { type: ObjectId, ref: "User", required: true },
    owner: { type: ObjectId, ref: "User", required: true },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    price: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refund_pending", "refunded"], default: "pending" },
    paymentMethod: { type: String, default: "" },
    paymentTransactionId: { type: String, default: "" },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: "" },
    reminderSent: { type: Boolean, default: false },
}, { timestamps: true })

const Booking = mongoose.model('Booking', bookingSchema)

export default Booking