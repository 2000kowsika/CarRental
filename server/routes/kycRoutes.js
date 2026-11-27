import express from "express";
import multer from "multer";
import {
    submitLicenseKYC,
    getMyKYCStatus,
    getPendingKYCList,
    reviewKYCSubmission,
} from "../controllers/kycController.js";
import { protect } from "../middleware/auth.js";

const kycRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Customer endpoints
kycRouter.get("/status", protect, getMyKYCStatus);
kycRouter.post(
    "/upload",
    protect,
    upload.fields([
        { name: "front", maxCount: 1 },
        { name: "back", maxCount: 1 },
    ]),
    submitLicenseKYC
);

// Admin / Reviewer endpoints
kycRouter.get("/admin/list", protect, getPendingKYCList);
kycRouter.post("/admin/review", protect, reviewKYCSubmission);

export default kycRouter;
