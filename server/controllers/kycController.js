import User from "../models/User.js";
import imagekit from "../configs/imageKit.js";
import { toFile } from "@imagekit/nodejs";
import { sendKYCStatusEmail } from "../configs/email.js";

// Helper: Mask sensitive driver license numbers (e.g. B1234567 -> B***4567)
const maskLicenseNumber = (num) => {
    if (!num) return "";
    const clean = num.trim();
    if (clean.length <= 4) return "****";
    return clean.slice(0, 1) + "***" + clean.slice(-4);
};

// 1. Customer Uploads Driver License (Front + Back)
export const submitLicenseKYC = async (req, res) => {
    try {
        const { _id } = req.user;
        const { licenseNumber } = req.body;
        const files = req.files;

        if (!files || !files.front || !files.back) {
            return res.json({
                success: false,
                message: "Please upload clear images of both front and back of your driving license.",
            });
        }

        const frontFile = files.front[0];
        const backFile = files.back[0];

        // Validate File Type (JPEG, PNG, WEBP)
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!allowedTypes.includes(frontFile.mimetype) || !allowedTypes.includes(backFile.mimetype)) {
            return res.json({
                success: false,
                message: "Invalid file format. Only JPG, PNG, and WEBP images are allowed.",
            });
        }

        // Validate File Size (Max 5MB each)
        const maxSize = 5 * 1024 * 1024;
        if (frontFile.size > maxSize || backFile.size > maxSize) {
            return res.json({
                success: false,
                message: "Each license image must be smaller than 5MB.",
            });
        }

        // Upload Front Image
        const frontBuffer = await toFile(frontFile.buffer, `license_front_${_id}_${Date.now()}.jpg`);
        const frontUpload = await imagekit.files.upload({
            file: frontBuffer,
            fileName: `license_front_${_id}.jpg`,
            folder: "/kyc_documents",
        });

        // Upload Back Image
        const backBuffer = await toFile(backFile.buffer, `license_back_${_id}_${Date.now()}.jpg`);
        const backUpload = await imagekit.files.upload({
            file: backBuffer,
            fileName: `license_back_${_id}.jpg`,
            folder: "/kyc_documents",
        });

        // Update User Profile
        const user = await User.findById(_id);
        user.licenseFront = frontUpload.url;
        user.licenseBack = backUpload.url;
        user.licenseNumberMasked = maskLicenseNumber(licenseNumber);
        user.kycStatus = "Pending";
        user.kycRejectionReason = "";
        user.kycSubmittedAt = new Date();

        await user.save();

        res.json({
            success: true,
            message: "Driving license submitted successfully. It is now pending administrative verification.",
            kycStatus: user.kycStatus,
            licenseNumberMasked: user.licenseNumberMasked,
        });
    } catch (error) {
        console.error("KYC upload error:", error);
        res.json({ success: false, message: error.message });
    }
};

// 2. Customer Checks Verification Status
export const getMyKYCStatus = async (req, res) => {
    try {
        const { _id } = req.user;
        const user = await User.findById(_id).select(
            "kycStatus kycRejectionReason licenseNumberMasked kycSubmittedAt kycReviewedAt licenseFront licenseBack"
        );

        res.json({
            success: true,
            kyc: {
                status: user.kycStatus,
                rejectionReason: user.kycRejectionReason,
                licenseNumberMasked: user.licenseNumberMasked,
                submittedAt: user.kycSubmittedAt,
                reviewedAt: user.kycReviewedAt,
                hasFront: !!user.licenseFront,
                hasBack: !!user.licenseBack,
            },
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// 3. Admin / Authorized Staff Fetches All Pending KYC Submissions
export const getPendingKYCList = async (req, res) => {
    try {
        // Allow owners or administrators to review documents
        if (req.user.role !== "admin" && req.user.role !== "owner") {
            return res.json({ success: false, message: "Unauthorized. Staff/Admin access required." });
        }

        const pendingUsers = await User.find({ kycStatus: { $in: ["Pending", "Approved", "Rejected"] } })
            .select("name email kycStatus kycRejectionReason licenseNumberMasked licenseFront licenseBack kycSubmittedAt")
            .sort({ kycSubmittedAt: -1 });

        res.json({ success: true, pendingUsers });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// 4. Admin Approves or Rejects a License
export const reviewKYCSubmission = async (req, res) => {
    try {
        if (req.user.role !== "admin" && req.user.role !== "owner") {
            return res.json({ success: false, message: "Unauthorized: Admin privileges required." });
        }

        const { targetUserId, action, rejectionReason } = req.body;

        if (!targetUserId || !action) {
            return res.json({ success: false, message: "Target user ID and action are required." });
        }

        const user = await User.findById(targetUserId);
        if (!user) {
            return res.json({ success: false, message: "Customer account not found." });
        }

        if (action === "approve") {
            user.kycStatus = "Approved";
            user.kycRejectionReason = "";
            user.kycReviewedAt = new Date();
        } else if (action === "reject") {
            user.kycStatus = "Rejected";
            user.kycRejectionReason = rejectionReason || "Document images were blurry or unreadable.";
            user.kycReviewedAt = new Date();
        } else {
            return res.json({ success: false, message: "Invalid action. Use 'approve' or 'reject'." });
        }

        await user.save();

        // Send Email Notification to Customer
        sendKYCStatusEmail(user, user.kycStatus, user.kycRejectionReason).catch((err) =>
            console.error("KYC notification email error:", err.message)
        );

        res.json({
            success: true,
            message: `KYC submission has been ${user.kycStatus.toLowerCase()} successfully.`,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                kycStatus: user.kycStatus,
                kycRejectionReason: user.kycRejectionReason,
            },
        });
    } catch (error) {
        console.error("KYC review error:", error);
        res.json({ success: false, message: error.message });
    }
};
