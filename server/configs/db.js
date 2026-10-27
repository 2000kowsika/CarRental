import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log("✅ Database Connected"));
        mongoose.connection.on('error', (err) => console.log("❌ DB Error:", err.message));
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        });
    } catch (error) {
        console.log("❌ DB Connection Failed:", error.message);
    }
}

export default connectDB;