import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";

// Initialize Express App
const app = express()

// Connect Database
await connectDB()

//middlewares
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Server is running"))

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))


