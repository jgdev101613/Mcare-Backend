/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import express from "express";
import cors from "cors";
import "dotenv/config";
import { connectDB } from "./lib/db.js";
import "./lib/scheduler.js";
import job from "./lib/cron.js";

// Routes Import
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.1.6:5173",
  process.env.ALLOWED_ORIGIN,
];

// Middleware
app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
  })
);
// Increase body size limit
app.use(express.json({ limit: "10mb" })); // Allow up to 10MB
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Job to run every 10 minutes
job.start();
app.get("/", (req, res) => {
  res.send("MCare Backend");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/admin", adminRoutes);

// Listen to port
app.listen(PORT, () => {
  console.log(`Server start on port ${PORT}`);
  connectDB();
});
