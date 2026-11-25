import nodemailer from "nodemailer";

let testAccount = null;

export const sendResetPasswordEmail = async (toEmail, resetUrl) => {
    try {
        let transporter;

        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
                secure: process.env.SMTP_SECURE === "true",
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        } else {
            // Ethereal / development fallback if custom SMTP is not configured
            if (!testAccount) {
                testAccount = await nodemailer.createTestAccount();
            }
            transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Car Rental" <no-reply@carrental.com>',
            to: toEmail,
            subject: "Password Reset Request - Car Rental",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #2563eb; text-align: center;">Car Rental Password Reset</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset your Car Rental account password.</p>
                    <p>Please click the button below to choose a new password. This link is valid for <strong>15 minutes</strong>.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #4b5563;"><a href="${resetUrl}">${resetUrl}</a></p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="color: #6b7280; font-size: 12px;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);

        // If using test ethereal account, log preview URL
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log("Preview email URL (Ethereal): %s", previewUrl);
        }

        return { success: true, previewUrl };
    } catch (error) {
        console.error("Error sending email:", error.message);
        return { success: false, error: error.message };
    }
};
