/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import express from "express";

// Models
import Attendance from "../models/Attendance.js";
import Duty from "../models/Duty.js";
import User from "../models/User.js";

// Authentication
import protectRoutes from "../middleware/auth.middleware.js";
import selfOrAdmin from "../middleware/auth.user.js";

// Mailer
import {
  sendDutyNotification,
  sendUpdateDutyNotification,
} from "../lib/mailer.js";

const studentRoutes = express.Router();

// ********** START: ATTENDANCE ENDPOINTS ********** //
/** Fetch A Student's Attendances **/
studentRoutes.get(
  "/attendance/fetchAttendance/:schoolId",
  protectRoutes,
  selfOrAdmin,
  async (req, res) => {
    try {
      const { schoolId } = req.params;

      const user = await User.findOne({ schoolId });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      const records = await Attendance.find({ schoolId })
        .sort({ date: -1 }) // latest first
        .select("-__v") // remove __v field for cleaner response
        .lean();

      console.log(
        "✅ Get User(" + schoolId + ") attendance record: ",
        req.originalUrl
      );

      res.status(200).json({
        success: true,
        message: "Attendance records retrieved successfully.",
        user: {
          id: user._id,
          name: user.name,
          schoolId: user.schoolId,
        },
        records,
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);
// ********** END: ATTENDANCE ENDPOINTS ********** //

// ********** START: DUTIES ENDPOINTS ********** //
/** Get Duties Of Particular User **/
studentRoutes.get(
  "/duties/fetchDuties/:id",
  protectRoutes,
  selfOrAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Find user
      const user = await User.findById(id).populate("group");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      if (!user.group) {
        return res.status(404).json({
          success: false,
          message: "This user does not belong to any group, so no duties.",
        });
      }

      // 2. Find all duties for user's group
      const duties = await Duty.find({ group: user.group._id })
        .populate({
          path: "group",
          populate: { path: "members", select: "name email schoolId" },
        })
        .sort({ date: 1 });

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          group: user.group.name,
        },
        duties,
      });
    } catch (error) {
      console.error("Error fetching user duties:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);
// ********** END: DUTIES ENDPOINTS ********** //

// ********** START: UPDATE USER ENDPOINTS ********** //
/** Edit User Information **/
studentRoutes.put(
  "/update/:id/information",
  protectRoutes,
  selfOrAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Extract fields
      const { name, section, course, department } = req.body;

      // Build update object dynamically, only if field is not blank
      const updateData = {};
      if (name && name.trim() !== "") updateData.name = name;
      if (section && section.trim() !== "") updateData.section = section;
      if (course && course.trim() !== "") updateData.course = course;
      if (department && department.trim() !== "")
        updateData.department = department;

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      res.json({
        success: true,
        message: "User updated successfully.",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update error:", error.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  }
);
// ********** END: UPDATE USER ENDPOINTS ********** //

export default studentRoutes;
