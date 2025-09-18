/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schoolId: { 
      type: String, 
      required: true 
    },
    date: {
      type: Date,
      required: true,
    },
    timeIn: {
      type: String, // HH:mm:ss
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure unique attendance per user per day
attendanceSchema.index({ schoolId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
