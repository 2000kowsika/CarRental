import nodemailer from "nodemailer";

let testAccount = null;

// Reusable transporter factory
export const getTransporter = async () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // Ethereal / development fallback if custom SMTP is not configured
    if (!testAccount) {
        testAccount = await nodemailer.createTestAccount();
    }
    return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
};

// Generic mail dispatcher
export const sendEmail = async ({ to, subject, html }) => {
    try {
        const transporter = await getTransporter();
        const from = process.env.EMAIL_FROM || '"Car Rental" <no-reply@carrental.com>';

        const info = await transporter.sendMail({
            from,
            to,
            subject,
            html,
        });

        console.log(`Email dispatched to ${to} [${subject}] MessageID: ${info.messageId}`);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log("Email Preview URL (Ethereal):", previewUrl);
        }

        return { success: true, messageId: info.messageId, previewUrl };
    } catch (error) {
        console.error("Email dispatch failed:", error.message);
        return { success: false, error: error.message };
    }
};

// Base HTML layout
const emailLayout = (title, content) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
    <div style="background-color: #1E3A8A; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">CAR RENTAL</h1>
        <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 12px;">Premium Vehicles & Seamless Journeys</p>
    </div>
    <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 15px;">${title}</h2>
    <div style="color: #334155; font-size: 14px; line-height: 1.6;">
        ${content}
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
    <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0;">
        Need help? Contact support@carrental.com | +94 11 234 5678<br />
        &copy; ${new Date().getFullYear()} Car Rental. All rights reserved.
    </p>
</div>
`;

// 1. Successful Customer Registration
export const sendWelcomeEmail = async (user) => {
    const html = emailLayout(
        `Welcome to Car Rental, ${user.name}!`,
        `
        <p>Your account has been created successfully.</p>
        <p>You can now browse our fleet of luxury and everyday vehicles, reserve cars with real-time availability, and manage your trips.</p>
        <p style="margin-top: 20px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/cars" style="background-color: #1E3A8A; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Explore Vehicles</a>
        </p>
        `
    );
    return sendEmail({ to: user.email, subject: "Welcome to Car Rental!", html });
};

// 2. Booking Request Received
export const sendBookingReceivedEmail = async (user, booking, car) => {
    const html = emailLayout(
        "Booking Request Received",
        `
        <p>Hello ${user.name},</p>
        <p>Thank you for choosing Car Rental. We have received your booking request for the <strong>${car.brand} ${car.model}</strong>.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 3px 0;"><strong>Booking Ref:</strong> #${booking._id}</p>
            <p style="margin: 3px 0;"><strong>Vehicle:</strong> ${car.brand} ${car.model} (${car.year})</p>
            <p style="margin: 3px 0;"><strong>Pickup Date:</strong> ${booking.pickupDate.toISOString().split("T")[0]}</p>
            <p style="margin: 3px 0;"><strong>Return Date:</strong> ${booking.returnDate.toISOString().split("T")[0]}</p>
            <p style="margin: 3px 0;"><strong>Total Fare:</strong> ${process.env.PAYHERE_CURRENCY || 'LKR'} ${booking.price}</p>
            <p style="margin: 3px 0;"><strong>Status:</strong> ${booking.status.toUpperCase()}</p>
        </div>
        <p>You will be notified once the car owner confirms your reservation.</p>
        `
    );
    return sendEmail({ to: user.email, subject: `Booking Received - #${booking._id.toString().slice(-8).toUpperCase()}`, html });
};

// 3. Booking Confirmed by Owner
export const sendBookingConfirmedEmail = async (user, booking, car) => {
    const html = emailLayout(
        "Your Booking is Confirmed!",
        `
        <p>Great news, ${user.name}!</p>
        <p>Your reservation for the <strong>${car.brand} ${car.model}</strong> has been confirmed by the owner.</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 3px 0; color: #166534;"><strong>Status:</strong> CONFIRMED</p>
            <p style="margin: 3px 0;"><strong>Pickup Location:</strong> ${car.location}</p>
            <p style="margin: 3px 0;"><strong>Rental Period:</strong> ${booking.pickupDate.toISOString().split("T")[0]} to ${booking.returnDate.toISOString().split("T")[0]}</p>
        </div>
        <p>Please make sure to have your driver's license ready at pickup.</p>
        <p style="margin-top: 20px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-bookings" style="background-color: #1E3A8A; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View My Bookings</a>
        </p>
        `
    );
    return sendEmail({ to: user.email, subject: `Booking Confirmed - #${booking._id.toString().slice(-8).toUpperCase()}`, html });
};

// 4. Booking Cancelled
export const sendBookingCancelledEmail = async (user, booking, car) => {
    const html = emailLayout(
        "Booking Cancellation Confirmation",
        `
        <p>Hello ${user.name},</p>
        <p>Your booking for <strong>${car.brand} ${car.model}</strong> has been cancelled.</p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 3px 0; color: #991b1b;"><strong>Status:</strong> CANCELLED</p>
            <p style="margin: 3px 0;"><strong>Booking Ref:</strong> #${booking._id}</p>
            <p style="margin: 3px 0;"><strong>Refund Status:</strong> ${booking.paymentStatus === 'refund_pending' ? 'Refund Initiated (Pending Processing)' : 'N/A'}</p>
        </div>
        <p>We hope to serve you on your next trip.</p>
        `
    );
    return sendEmail({ to: user.email, subject: `Booking Cancelled - #${booking._id.toString().slice(-8).toUpperCase()}`, html });
};

// 5. Successful Payment Confirmation
export const sendPaymentSuccessEmail = async (user, booking, car, transactionId) => {
    const html = emailLayout(
        "Payment Receipt & Confirmation",
        `
        <p>Hello ${user.name},</p>
        <p>We have successfully received your payment for Booking <strong>#${booking._id}</strong>.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 3px 0;"><strong>Amount Paid:</strong> ${process.env.PAYHERE_CURRENCY || 'LKR'} ${booking.price}</p>
            <p style="margin: 3px 0;"><strong>Payment Method:</strong> ${booking.paymentMethod || 'PayHere'}</p>
            <p style="margin: 3px 0;"><strong>Transaction ID:</strong> ${transactionId || 'N/A'}</p>
            <p style="margin: 3px 0;"><strong>Vehicle:</strong> ${car.brand} ${car.model}</p>
        </div>
        <p>You can download your PDF invoice directly from your My Bookings dashboard.</p>
        `
    );
    return sendEmail({ to: user.email, subject: `Payment Confirmed - Booking #${booking._id.toString().slice(-8).toUpperCase()}`, html });
};

// 6. Payment Failure
export const sendPaymentFailedEmail = async (user, booking, car) => {
    const html = emailLayout(
        "Payment Unsuccessful",
        `
        <p>Hello ${user.name},</p>
        <p>Your payment attempt for <strong>${car.brand} ${car.model}</strong> could not be completed.</p>
        <p>Your booking remains on hold. You can retry paying anytime from your My Bookings page.</p>
        <p style="margin-top: 20px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-bookings" style="background-color: #dc2626; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Retry Payment</a>
        </p>
        `
    );
    return sendEmail({ to: user.email, subject: `Payment Failed - Booking #${booking._id.toString().slice(-8).toUpperCase()}`, html });
};

// 7. Refund Confirmation
export const sendRefundConfirmedEmail = async (user, booking, car) => {
    const html = emailLayout(
        "Refund Processed Successfully",
        `
        <p>Hello ${user.name},</p>
        <p>Your refund of <strong>${process.env.PAYHERE_CURRENCY || 'LKR'} ${booking.price}</strong> for Booking #${booking._id} (${car.brand} ${car.model}) has been processed.</p>
        <p>Funds will reflect in your original payment method in 3–5 business days depending on your bank.</p>
        `
    );
    return sendEmail({ to: user.email, subject: `Refund Processed - #${booking._id.toString().slice(-8).toUpperCase()}`, html });
};

// 8. Driver License Verification Approved or Rejected
export const sendKYCStatusEmail = async (user, status, reason = "") => {
    const isApproved = status === "Approved";
    const html = emailLayout(
        isApproved ? "Driver's License Approved!" : "Driver's License Verification Update",
        `
        <p>Hello ${user.name},</p>
        ${
            isApproved
                ? `<p style="color: #166534; font-weight: bold;">Congratulations! Your driver's license has been successfully verified.</p>
                   <p>You can now take delivery of all your vehicle reservations with zero friction.</p>`
                : `<p style="color: #991b1b; font-weight: bold;">Your driver's license submission was not approved.</p>
                   <p><strong>Reason provided:</strong> ${reason || 'Document images were blurry or unreadable.'}</p>
                   <p>Please visit your profile to submit clearer photos.</p>
                   <p style="margin-top: 20px;">
                       <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/driver-license" style="background-color: #1E3A8A; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Resubmit License</a>
                   </p>`
        }
        `
    );
    return sendEmail({ to: user.email, subject: `Driver License Verification: ${status}`, html });
};

// 9. 24-Hour Booking Reminder
export const sendBookingReminderEmail = async (user, booking, car) => {
    const html = emailLayout(
        "Upcoming Trip Reminder - 24 Hours Away!",
        `
        <p>Hello ${user.name},</p>
        <p>Your trip with the <strong>${car.brand} ${car.model}</strong> is scheduled for tomorrow!</p>
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 3px 0;"><strong>Pickup Date:</strong> ${booking.pickupDate.toISOString().split("T")[0]}</p>
            <p style="margin: 3px 0;"><strong>Return Date:</strong> ${booking.returnDate.toISOString().split("T")[0]}</p>
            <p style="margin: 3px 0;"><strong>Pickup Hub:</strong> ${car.location}</p>
        </div>
        <p><strong>Quick Checklist:</strong></p>
        <ul>
            <li>Bring your valid Driving License and National ID.</li>
            <li>Review the vehicle condition alongside the owner upon key handover.</li>
        </ul>
        <p>Drive safely!</p>
        `
    );
    return sendEmail({ to: user.email, subject: `Reminder: Your Car Rental Trip Tomorrow! (${car.brand} ${car.model})`, html });
};

// Password Reset Email (Exported for userController)
export const sendResetPasswordEmail = async (toEmail, resetUrl) => {
    const html = emailLayout(
        "Password Reset Request",
        `
        <p>We received a request to reset your Car Rental account password.</p>
        <p>Please click the button below to choose a new password. This link is valid for <strong>15 minutes</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1E3A8A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4b5563;"><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="color: #64748b; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
        `
    );
    return sendEmail({ to: toEmail, subject: "Password Reset Request - Car Rental", html });
};
