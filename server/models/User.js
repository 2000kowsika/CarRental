import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "owner", "user"], default: 'user' },
    image: { type: String, default: '' },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    // Driver License / KYC Verification Fields
    licenseFront: { type: String, default: '' },
    licenseBack: { type: String, default: '' },
    licenseNumberMasked: { type: String, default: '' },
    kycStatus: {
        type: String,
        enum: ["Not Submitted", "Pending", "Approved", "Rejected"],
        default: "Not Submitted"
    },
    kycRejectionReason: { type: String, default: '' },
    kycSubmittedAt: { type: Date, default: null },
    kycReviewedAt: { type: Date, default: null },
}, { timestamps: true })

const User = mongoose.model('User', userSchema)

export default User