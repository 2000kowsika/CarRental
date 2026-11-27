import crypto from "crypto";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from "../configs/email.js";

// Helper function to generate PayHere MD5 hash
// Formula: uppercase(md5(merchant_id + order_id + formatted_amount + currency + uppercase(md5(merchant_secret))))
export const generatePayHereHash = (orderId, amount, currency) => {
    const merchantId = process.env.PAYHERE_MERCHANT_ID || "";
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "";

    const formattedAmount = Number(amount).toFixed(2);

    const secretHash = crypto
        .createHash("md5")
        .update(merchantSecret)
        .digest("hex")
        .toUpperCase();

    const dataToHash = merchantId + orderId + formattedAmount + currency + secretHash;

    return crypto
        .createHash("md5")
        .update(dataToHash)
        .digest("hex")
        .toUpperCase();
};

// 1. Initiate PayHere Payment for a Booking
export const initiatePayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const { _id, name, email } = req.user;

        const booking = await Booking.findById(bookingId).populate("car");
        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        // Verify booking owner
        if (booking.user.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized for this booking" });
        }

        if (booking.status === "cancelled") {
            return res.json({ success: false, message: "Cannot pay for a cancelled booking" });
        }

        if (booking.paymentStatus === "paid") {
            return res.json({ success: false, message: "This booking is already paid" });
        }

        const merchantId = process.env.PAYHERE_MERCHANT_ID;
        if (!merchantId) {
            return res.json({
                success: false,
                message: "PayHere merchant credentials are not configured on server (.env)."
            });
        }

        const currency = process.env.PAYHERE_CURRENCY || "LKR";
        const orderId = booking._id.toString();
        const amount = Number(booking.price).toFixed(2);
        const hash = generatePayHereHash(orderId, amount, currency);

        const nameParts = (name || "Customer").split(" ");
        const firstName = nameParts[0] || "Customer";
        const lastName = nameParts.slice(1).join(" ") || "User";

        const paymentData = {
            sandbox: process.env.PAYHERE_MODE !== "live",
            merchant_id: merchantId,
            return_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/my-bookings?payment=success&bookingId=${orderId}`,
            cancel_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/my-bookings?payment=cancelled&bookingId=${orderId}`,
            notify_url: `${process.env.BACKEND_URL || "http://localhost:3000"}/api/payment/notify`,
            order_id: orderId,
            items: `Car Rental - ${booking.car?.brand} ${booking.car?.model}`,
            amount: amount,
            currency: currency,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: req.user.phone || "0771234567",
            address: req.user.address || "Sri Lanka",
            city: booking.car?.location || "Colombo",
            country: "Sri Lanka",
            hash: hash,
        };

        res.json({ success: true, paymentData });
    } catch (error) {
        console.error("Payment initiation error:", error);
        res.json({ success: false, message: error.message });
    }
};

// 2. PayHere Server-to-Server Webhook / Notification Callback
export const handlePayHereNotify = async (req, res) => {
    try {
        const {
            merchant_id,
            order_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            payment_id,
            method,
            status_message
        } = req.body;

        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "";

        // Verify authenticity of callback:
        // md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + uppercase(md5(merchant_secret)))
        const secretHash = crypto
            .createHash("md5")
            .update(merchantSecret)
            .digest("hex")
            .toUpperCase();

        const dataToHash = merchant_id + order_id + payhere_amount + payhere_currency + status_code + secretHash;

        const localMd5sig = crypto
            .createHash("md5")
            .update(dataToHash)
            .digest("hex")
            .toUpperCase();

        if (localMd5sig !== md5sig) {
            console.error("PayHere notification signature mismatch:", { expected: localMd5sig, received: md5sig });
            return res.status(400).send("Signature verification failed");
        }

        const booking = await Booking.findById(order_id);
        if (!booking) {
            return res.status(404).send("Booking not found");
        }

        // status_code: 2 = SUCCESS, 0 = PENDING, -1 = CANCELLED, -2 = FAILED, -3 = CHARGEDBACK
        if (Number(status_code) === 2) {
            // Update booking status only after verified payment
            if (booking.paymentStatus !== "paid") {
                booking.paymentStatus = "paid";
                booking.status = "confirmed";
                booking.paymentMethod = method || "PayHere";
                booking.paymentTransactionId = payment_id || md5sig;
                await booking.save();
                console.log(`Payment confirmed for Booking #${order_id}, Transaction ID: ${payment_id}`);

                // Send Payment Success Email
                const customer = await User.findById(booking.user);
                const car = await Car.findById(booking.car);
                if (customer && car) {
                    sendPaymentSuccessEmail(customer, booking, car, payment_id).catch((err) =>
                        console.error("Payment success email error:", err.message)
                    );
                }
            }
        } else if (Number(status_code) === -2 || Number(status_code) === -1) {
            if (booking.paymentStatus !== "paid") {
                booking.paymentStatus = "failed";
                await booking.save();

                const customer = await User.findById(booking.user);
                const car = await Car.findById(booking.car);
                if (customer && car) {
                    sendPaymentFailedEmail(customer, booking, car).catch((err) =>
                        console.error("Payment failed email error:", err.message)
                    );
                }
            }
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("PayHere notify error:", error);
        res.status(500).send("Server Error");
    }
};

// 3. Client Payment Verification Endpoint (for immediate frontend polling/verification)
export const verifyPaymentStatus = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const { _id } = req.user;

        const booking = await Booking.findById(bookingId).populate("car");
        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        if (booking.user.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized" });
        }

        res.json({
            success: true,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            transactionId: booking.paymentTransactionId
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
