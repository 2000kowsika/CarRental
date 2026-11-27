import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types

const bookingSchema = new mongoose.Schema({
    bookingId: { type: String, unique: true, index: true },
    car: { type: ObjectId, ref: "Car", required: true },
    user: { type: ObjectId, ref: "User", default: null },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    specialRequests: { type: String, default: "" },
    owner: { type: ObjectId, ref: "User", required: true },
    pickupLocation: { type: String, default: "" },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    status: { type: String, enum: ["pending", "confirmed", "cancellation_requested", "cancelled"], default: "pending" },
    price: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    paymentMethod: { type: String, default: "" },
    paymentTransactionId: { type: String, default: "" },

    // Driving Licence Verification Fields
    licenseNumber: { type: String, default: "" },
    licenseNumberMasked: { type: String, default: "" },
    licenseFront: { type: String, default: "" },
    licenseBack: { type: String, default: "" },
    licenseStatus: {
        type: String,
        enum: ["Pending", "Verified", "Rejected"],
        default: "Pending"
    },
    licenseRejectionReason: { type: String, default: "" },
    licenseVerifiedAt: { type: Date, default: null },

    cancellationRequestedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: "" },
    reminderSent: { type: Boolean, default: false },
}, { timestamps: true })

const Booking = mongoose.model('Booking', bookingSchema)

export default Booking