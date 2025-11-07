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
import Group from "../models/Group.js";
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

studentRoutes.get(
  "/attendance/fetchAllAttendance",
  protectRoutes,
  selfOrAdmin,
  async (req, res) => {
    try {
      // 📦 Fetch all attendance records, newest first
      const attendances = await Attendance.find({ attendanceType: "Class" })
        .sort({ date: -1 }) // latest first
        .select("-__v")
        .populate("user", "_id username name year schoolId section") // still populate user info
        .lean();

      if (!attendances.length) {
        return res.status(404).json({
          success: false,
          message: "No attendance records found.",
        });
      }

      // ✅ Direct response, no grouping
      res.status(200).json({
        success: true,
        message: "All attendance records retrieved successfully.",
        attendances, // return full list
      });
    } catch (error) {
      console.error("❌ Error fetching all attendance:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

studentRoutes.get(
  "/attendance/fetchAllDutyAttendance",
  protectRoutes,
  selfOrAdmin,
  async (req, res) => {
    try {
      // 📦 Fetch all attendance records, newest first
      const attendances = await Attendance.find({ attendanceType: "Duty" })
        .sort({ date: -1 }) // latest first
        .select("-__v")
        .populate("user", "_id username name year schoolId section")
        .populate("group", "name") // still populate user info
        .lean();

      if (!attendances.length) {
        return res.status(404).json({
          success: false,
          message: "No attendance records found.",
        });
      }

      // ✅ Direct response, no grouping
      res.status(200).json({
        success: true,
        message: "All attendance records retrieved successfully.",
        attendances, // return full list
      });
    } catch (error) {
      console.error("❌ Error fetching all attendance:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
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

studentRoutes.get(
  "/duties/fetchAllDuties",
  protectRoutes,
  selfOrAdmin,
  async (req, res) => {
    try {
      // 1. Find all groups, with members populated
      const groups = await Group.find()
        .populate("members", "name email schoolId")
        .lean();

      if (!groups || groups.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No groups found.",
        });
      }

      // 2. Fetch all duties and map them to their group
      const duties = await Duty.find()
        .populate("group", "name") // only populate group name
        .sort({ date: 1 })
        .lean();

      // 3. Structure response: group details + duties belonging to it
      const result = groups.map((group) => {
        const groupDuties = duties.filter(
          (duty) =>
            duty.group && duty.group._id.toString() === group._id.toString()
        );

        return {
          id: group._id,
          name: group.name,
          members: group.members,
          duties: groupDuties,
        };
      });

      res.status(200).json({
        success: true,
        message: "All groups' duties retrieved successfully.",
        groups: result,
      });
    } catch (error) {
      console.error("❌ Error fetching all duties:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

studentRoutes.get(
  "/duties/fetchAllDutiesByArea",
  protectRoutes,
  selfOrAdmin,
  async (req, res) => {
    try {
      // 1. Fetch all duties and populate needed fields
      const duties = await Duty.find()
        .populate("group", "name") // optional: include group name
        .sort({ date: 1 })
        .lean();

      if (!duties || duties.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No duties found.",
        });
      }

      // 2. Group duties by area
      const dutiesByArea = duties.reduce((acc, duty) => {
        const area = duty.area || "Unassigned"; // handle missing area
        if (!acc[area]) acc[area] = [];
        acc[area].push(duty);
        return acc;
      }, {});

      // 3. Structure response for frontend
      const result = Object.keys(dutiesByArea).map((area) => ({
        area,
        duties: dutiesByArea[area],
      }));

      res.status(200).json({
        success: true,
        message: "All duties grouped by area retrieved successfully.",
        areas: result,
      });
    } catch (error) {
      console.error("❌ Error fetching duties by area:", error);
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

      // Only extract the specific fields for this route's purpose
      const {
        fathersName,
        fathersNumber,
        mothersName,
        mothersNumber,
        guardian, // Corrected spelling
        guardiansNumber, // Corrected spelling
        address,
      } = req.body;

      // Helper function for safe trimming and existence check
      const getCleanedString = (value) => {
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed === "" ? null : trimmed;
        }
        // Ignore non-string values (like null, undefined, or numbers if they somehow ended up here)
        return null;
      };

      // Build update object dynamically
      const updateData = {};

      // Fields to be checked and added to the update object
      const fieldsToUpdate = {
        fathersName,
        fathersNumber,
        mothersName,
        mothersNumber,
        guardian,
        guardiansNumber,
        address,
      };

      for (const key in fieldsToUpdate) {
        const cleanedValue = getCleanedString(fieldsToUpdate[key]);
        if (cleanedValue !== null) {
          updateData[key] = cleanedValue;
        }
      }

      // Check if any valid fields were provided
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid family or address fields provided for update.",
        });
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        id,
        // Use $set to only update the fields present in updateData
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password");

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      res.json({
        success: true,
        message: "User contact information updated successfully.",
        user: updatedUser,
      });
    } catch (error) {
      console.error("❌ Update contact information error:", error.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  }
);
// ********** END: UPDATE USER ENDPOINTS ********** //

export default studentRoutes;
