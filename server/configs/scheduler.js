import cron from "node-cron";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Car from "../models/Car.js";
import { sendBookingReminderEmail } from "./email.js";

// Initialize cron scheduler to scan every hour for bookings starting in the next 24-25 hours
export const initBookingReminderScheduler = () => {
    // Runs at the 0th minute of every hour: '0 * * * *'
    cron.schedule("0 * * * *", async () => {
        try {
            console.log("[Scheduler] Running hourly booking reminder check...");

            const now = new Date();
            const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

            // Find confirmed bookings within the 24h window that haven't received a reminder yet
            const upcomingBookings = await Booking.find({
                status: "confirmed",
                reminderSent: { $ne: true },
                pickupDate: { $gte: in24Hours, $lt: in25Hours },
            })
                .populate("user")
                .populate("car");

            for (const booking of upcomingBookings) {
                if (booking.user && booking.car) {
                    await sendBookingReminderEmail(booking.user, booking, booking.car);
                    booking.reminderSent = true;
                    await booking.save();
                    console.log(`[Scheduler] 24h reminder sent for Booking #${booking._id}`);
                }
            }
        } catch (error) {
            console.error("[Scheduler Error] Booking reminder cron job failed:", error.message);
        }
    });

    console.log("[Scheduler] Booking reminder cron job initialized (hourly check)");
};
