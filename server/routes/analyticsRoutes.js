import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import { protect } from "../middleware/auth.js";

const analyticsRouter = express.Router();

// Middleware ensuring user is an owner or admin
const requireOwner = (req, res, next) => {
    if (!req.user || (req.user.role !== "owner" && req.user.role !== "admin")) {
        return res.status(403).json({ success: false, message: "Access denied. Owner permissions required." });
    }
    next();
};

// GET /api/analytics/owner
// Supports query params:
// - carId: filter by specific car (optional)
// - startDate: ISO string (optional)
// - endDate: ISO string (optional)
// - year: number e.g. 2026 (optional)
analyticsRouter.get("/owner", protect, requireOwner, async (req, res) => {
    try {
        const ownerId = new mongoose.Types.ObjectId(req.user._id);
        const { carId, startDate, endDate, year } = req.query;

        // Build base match filter for owner's bookings
        const matchFilter = { owner: ownerId };

        if (carId && mongoose.Types.ObjectId.isValid(carId)) {
            matchFilter.car = new mongoose.Types.ObjectId(carId);
        }

        // Date range filtering on booking createdAt
        if (startDate || endDate) {
            matchFilter.createdAt = {};
            if (startDate) {
                matchFilter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchFilter.createdAt.$lte = end;
            }
        }

        // Fetch owner's cars for filter dropdown
        const ownerCars = await Car.find({ owner: ownerId }).select("_id brand model year image");

        // Total cars count
        const totalCarsCount = ownerCars.length;

        // 1. Overall Booking & Revenue Stats using Aggregation
        const allBookings = await Booking.find(matchFilter).populate("car", "brand model pricePerDay image");

        const totalBookings = allBookings.length;
        const pendingCount = allBookings.filter((b) => b.status === "pending").length;
        const confirmedCount = allBookings.filter((b) => b.status === "confirmed").length;
        const cancelledCount = allBookings.filter((b) => b.status === "cancelled").length;

        // Completed bookings: confirmed bookings whose returnDate is in the past
        const now = new Date();
        const completedCount = allBookings.filter(
            (b) => b.status === "confirmed" && new Date(b.returnDate) < now
        ).length;

        // Verified Revenue: Only include paid bookings, minus any full refunds
        // Never include failed payments or unverified bookings
        const totalVerifiedRevenue = allBookings
            .filter((b) => b.paymentStatus === "paid")
            .reduce((sum, b) => sum + (b.price || 0), 0);

        // Monthly Revenue (Current Month)
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const currentMonthRevenue = allBookings
            .filter(
                (b) =>
                    b.paymentStatus === "paid" &&
                    new Date(b.createdAt) >= currentMonthStart &&
                    new Date(b.createdAt) <= currentMonthEnd
            )
            .reduce((sum, b) => sum + (b.price || 0), 0);

        // 2. Monthly Revenue Breakdown for Charts (Selected or Current Year)
        const targetYear = year ? parseInt(year, 10) : now.getFullYear();

        const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
            monthIndex: i + 1,
            monthName: new Date(targetYear, i, 1).toLocaleString("en-US", { month: "short" }),
            revenue: 0,
            bookings: 0,
        }));

        allBookings.forEach((b) => {
            const bDate = new Date(b.createdAt);
            if (bDate.getFullYear() === targetYear) {
                const month = bDate.getMonth();
                monthlyStats[month].bookings += 1;
                if (b.paymentStatus === "paid") {
                    monthlyStats[month].revenue += b.price || 0;
                }
            }
        });

        // 3. Yearly Revenue Comparison
        const yearlyStatsMap = {};
        allBookings.forEach((b) => {
            const y = new Date(b.createdAt).getFullYear();
            if (!yearlyStatsMap[y]) {
                yearlyStatsMap[y] = { year: y, revenue: 0, bookings: 0 };
            }
            yearlyStatsMap[y].bookings += 1;
            if (b.paymentStatus === "paid") {
                yearlyStatsMap[y].revenue += b.price || 0;
            }
        });
        const yearlyStats = Object.values(yearlyStatsMap).sort((a, b) => a.year - b.year);

        // 4. Most Popular Cars & Utilization
        const carStatsMap = {};

        ownerCars.forEach((c) => {
            carStatsMap[c._id.toString()] = {
                carId: c._id,
                name: `${c.brand} ${c.model}`,
                image: c.image,
                totalBookings: 0,
                confirmedBookings: 0,
                totalRevenue: 0,
                rentalDays: 0,
            };
        });

        allBookings.forEach((b) => {
            if (!b.car) return;
            const cid = b.car._id.toString();
            if (!carStatsMap[cid]) {
                carStatsMap[cid] = {
                    carId: b.car._id,
                    name: `${b.car.brand} ${b.car.model}`,
                    image: b.car.image,
                    totalBookings: 0,
                    confirmedBookings: 0,
                    totalRevenue: 0,
                    rentalDays: 0,
                };
            }

            carStatsMap[cid].totalBookings += 1;
            if (b.status === "confirmed") {
                carStatsMap[cid].confirmedBookings += 1;
                const picked = new Date(b.pickupDate);
                const returned = new Date(b.returnDate);
                const days = Math.max(1, Math.ceil((returned - picked) / (1000 * 60 * 60 * 24)));
                carStatsMap[cid].rentalDays += days;
            }
            if (b.paymentStatus === "paid") {
                carStatsMap[cid].totalRevenue += b.price || 0;
            }
        });

        const popularCars = Object.values(carStatsMap).sort(
            (a, b) => b.totalBookings - a.totalBookings
        );

        // Calculate average utilization rate (days rented vs 365 days)
        const popularCarsWithUtilization = popularCars.map((c) => ({
            ...c,
            utilizationRate: Math.min(100, Math.round((c.rentalDays / 365) * 100)),
        }));

        res.json({
            success: true,
            analytics: {
                summary: {
                    totalCars: totalCarsCount,
                    totalBookings,
                    pendingBookings: pendingCount,
                    confirmedBookings: confirmedCount,
                    completedBookings: completedCount,
                    cancelledBookings: cancelledCount,
                    totalRevenue: totalVerifiedRevenue,
                    monthlyRevenue: currentMonthRevenue,
                },
                monthlyStats,
                yearlyStats,
                popularCars: popularCarsWithUtilization,
                ownerCars,
                appliedFilters: {
                    carId: carId || "all",
                    startDate: startDate || null,
                    endDate: endDate || null,
                    year: targetYear,
                },
            },
        });
    } catch (error) {
        console.error("Owner analytics error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/analytics/export - Export Owner Bookings Report as CSV
analyticsRouter.get("/export", protect, requireOwner, async (req, res) => {
    try {
        const ownerId = new mongoose.Types.ObjectId(req.user._id);
        const { carId, startDate, endDate } = req.query;

        const matchFilter = { owner: ownerId };
        if (carId && mongoose.Types.ObjectId.isValid(carId)) {
            matchFilter.car = new mongoose.Types.ObjectId(carId);
        }
        if (startDate || endDate) {
            matchFilter.createdAt = {};
            if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchFilter.createdAt.$lte = end;
            }
        }

        const bookings = await Booking.find(matchFilter)
            .populate("car", "brand model")
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        // Generate CSV Header & rows
        const headers = [
            "Booking ID",
            "Customer Name",
            "Customer Email",
            "Vehicle",
            "Pick-up Date",
            "Return Date",
            "Price",
            "Status",
            "Payment Status",
            "Payment Method",
            "Transaction ID",
            "Created Date",
        ];

        const escapeCSV = (str) => `"${String(str || "").replace(/"/g, '""')}"`;

        const rows = bookings.map((b) => [
            escapeCSV(b._id),
            escapeCSV(b.user?.name),
            escapeCSV(b.user?.email),
            escapeCSV(`${b.car?.brand || ""} ${b.car?.model || ""}`),
            escapeCSV(b.pickupDate ? b.pickupDate.toISOString().split("T")[0] : ""),
            escapeCSV(b.returnDate ? b.returnDate.toISOString().split("T")[0] : ""),
            b.price,
            escapeCSV(b.status),
            escapeCSV(b.paymentStatus),
            escapeCSV(b.paymentMethod || "N/A"),
            escapeCSV(b.paymentTransactionId || "N/A"),
            escapeCSV(b.createdAt ? b.createdAt.toISOString().split("T")[0] : ""),
        ]);

        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=car-rental-analytics-${Date.now()}.csv`
        );
        res.status(200).send(csvContent);
    } catch (error) {
        console.error("Export error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default analyticsRouter;
