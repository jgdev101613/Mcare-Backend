/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import express from "express";

// Models
import Attendance from "../models/Attendance.js";
import Group from "../models/Group.js";
import Duty from "../models/Duty.js";
import User from "../models/User.js";

// Authentication
import protectRoutes from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/auth.admin.js";

// Mailer
import {
  sendDutyNotification,
  sendUpdateDutyNotification,
} from "../lib/mailer.js";

const adminRoutes = express.Router();

// ********** START: STUDENTS ENDPOINTS ********** //
/** Fetch All Students and their information **/
adminRoutes.get(
  "/students/fetchAllStudents",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const users = await User.find({ role: "user" })
        .select("-password")
        .populate("group", "name") // optional: show group name
        .lean();

      res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      console.error("Error in GET /members:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error.",
      });
    }
  }
);

/** Edit Student Information **/
adminRoutes.put(
  "/students/update/:id",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { schoolId, username, name, section, course, department, role } =
        req.body;

      // Build update object dynamically (only include non-empty fields)
      const updateData = {};
      if (schoolId && schoolId.trim() !== "")
        updateData.schoolId = schoolId.trim();
      if (username && username.trim() !== "")
        updateData.username = username.trim();
      if (name && name.trim() !== "") updateData.name = name.trim();
      if (section && section.trim() !== "") updateData.section = section.trim();
      if (course && course.trim() !== "") updateData.course = course.trim();
      if (department && department.trim() !== "")
        updateData.department = department.trim();
      if (role && ["user", "admin"].includes(role)) updateData.role = role;

      const updatedUser = await User.findByIdAndUpdate(
        id,
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
        message: "User updated successfully.",
        user: updatedUser,
      });
    } catch (error) {
      console.error("❌ Update user error:", error.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  }
);

/** Delete A Student **/

/**
 * Admin: Delete a User
 */
adminRoutes.delete(
  "/students/delete/:id",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const { id } = req.params;

      const deletedUser = await User.findByIdAndDelete(id);

      if (!deletedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "User deleted successfully.",
      });
    } catch (error) {
      console.error("Error in DELETE /delete/:id:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error.",
      });
    }
  }
);

// ********** END: STUDENTS ENDPOINTS ********** //

// ********** START: DUTIES ENDPOINTs ********** //
/** Create a Duty (Create Duty: date, place, time, clinical) With Email Notif **/
adminRoutes.post("/duty/create", protectRoutes, adminOnly, async (req, res) => {
  try {
    const { groupId, date, place, time, clinicalInstructor, area } = req.body;

    if (!groupId || !date || !clinicalInstructor || !area) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (group, date, place, time, clinicalInstructor, area) are required.",
      });
    }

    // Check group exists
    const group = await Group.findById(groupId).populate("members");
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found." });
    }

    // Normalize date to ignore time portion (only check by day)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if duty already exists for this group on the same day
    const existingDuty = await Duty.findOne({
      group: groupId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingDuty) {
      return res.status(400).json({
        success: false,
        message: "This group already has a duty assigned on the same date.",
      });
    }

    // Create duty
    const duty = await Duty.create({
      group: groupId,
      date,
      place,
      time,
      clinicalInstructor,
      area,
    });

    // Collect recipient info (email + name) from the group, not duty
    const recipients = group.members.map((member) => ({
      email: member.email,
      name: member.name,
    }));

    // Send notification
    if (recipients.length > 0) {
      await sendDutyNotification(recipients, duty, group.name);
    }

    res.status(201).json({
      success: true,
      message: "Duty created and assigned to group.",
      duty,
      assignedMembers: group.members,
    });
  } catch (error) {
    console.error("Error creating duty:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/** Update a Duty (edit duty: date, place, time, task)With Email Notif **/
adminRoutes.put(
  "/duty/update/:id",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { date, place, time, clinicalInstructor, area } = req.body;

      const duty = await Duty.findById(id).populate({
        path: "group",
        populate: { path: "members" }, // load group + members
      });

      if (!duty) {
        return res.status(404).json({
          success: false,
          message: "Duty not found.",
        });
      }

      // Update fields
      if (date) {
        const dutyDate = new Date(date);
        dutyDate.setHours(0, 0, 0, 0);
        duty.date = dutyDate;
      }
      if (place) duty.place = place.trim();
      if (time) duty.time = time.trim();
      if (clinicalInstructor)
        duty.clinicalInstructor = clinicalInstructor.trim();
      if (area) duty.area = area.trim();

      await duty.save();

      // Collect recipient info (email + name) from group members
      const recipients = duty.group.members.map((member) => ({
        email: member.email,
        name: member.name,
      }));

      // Send notification
      if (recipients.length > 0) {
        await sendUpdateDutyNotification(recipients, duty, duty.group.name);
      }

      res.status(200).json({
        success: true,
        message:
          "Duty updated successfully. Notifications sent to group members.",
        duty,
      });
    } catch (error) {
      console.error("Error in PUT /duties/:id:", error);
      return res.status(500).json({
        success: false,
        message: `Internal Server Error: ${error.message}`,
      });
    }
  }
);

/** Fetch All Duties **/
adminRoutes.get(
  "/duty/fetchAllDuties",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const duties = await Duty.find()
        .populate({
          path: "group",
          populate: { path: "members", select: "name email" },
        })
        .sort({ date: 1 });

      res.status(200).json({ success: true, duties });
    } catch (error) {
      console.error("Error fetching duties:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/** Fetch Duties Of A Particular Group **/
adminRoutes.get(
  "/duty/fetchAllDuties/:groupId",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const { groupId } = req.params;

      const duties = await Duty.find({ group: groupId })
        .populate({
          path: "group",
          populate: { path: "members", select: "name email" },
        })
        .sort({ date: 1 });

      res.status(200).json({ success: true, duties });
    } catch (error) {
      console.error("Error fetching group duties:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/** Delete A Duty **/
adminRoutes.delete(
  "/duty/delete/:id",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const duty = await Duty.findById(req.params.id);

      if (!duty) {
        return res
          .status(404)
          .json({ success: false, message: "Duty not found." });
      }

      await duty.deleteOne();
      res
        .status(200)
        .json({ success: true, message: "Duty deleted successfully." });
    } catch (error) {
      console.error("Error in DELETE /duties/:id:", error);
      return res.status(500).json({
        success: false,
        message: `Internal Server Error: ${error.message}`,
      });
    }
  }
);
// ********** END: DUTIES ENDPOINTs ********** //

// ********** START: GROUP ENDPOINTS ********** //
/** Create a Group: Admin creates a group with name and members **/
adminRoutes.post(
  "/group/create",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const { name, members } = req.body; // members = array of schoolIds

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Group name and members (schoolIds) are required.",
        });
      }

      // Ensure group name is unique
      const existingGroup = await Group.findOne({ name: name.trim() });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: "Group name already exists.",
        });
      }

      // Find users by schoolId
      const users = await User.find({ schoolId: { $in: members } });

      if (users.length !== members.length) {
        return res.status(400).json({
          success: false,
          message: "One or more schoolIds do not exist in the system.",
        });
      }

      // Check if any of these users already belong to another group
      const conflict = await Group.findOne({
        members: { $in: users.map((u) => u._id) },
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: "One or more members already belong to another group.",
        });
      }

      // Create group with ObjectIds of users
      const newGroup = new Group({
        name: name.trim(),
        members: users.map((u) => u._id),
      });

      await newGroup.save();

      // Update each user with group reference
      await User.updateMany(
        { _id: { $in: users.map((u) => u._id) } },
        { $set: { group: newGroup._id } }
      );

      res.status(201).json({
        success: true,
        message: "Group created successfully.",
        group: newGroup,
      });
    } catch (error) {
      console.error("Error in POST /groups:", error);
      return res.status(500).json({
        success: false,
        message: `Internal Server Error: ${error.message}`,
      });
    }
  }
);

/** Fetch All Groups **/
adminRoutes.get(
  "/group/fetchAllgroups",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const groups = await Group.find()
        .sort({ createdAt: -1 })
        .populate("members", "username email schoolId");

      res.json({ success: true, groups });
    } catch (error) {
      console.error("Error in GET /groups:", error);
      return res.status(500).json({
        success: false,
        message: `Internal Server Error: ${error.message}`,
      });
    }
  }
);

/** Search And Fetch Groups **/
adminRoutes.get("/group/", protectRoutes, adminOnly, async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      query = { name: regex };
    }

    const groups = await Group.find(query)
      .populate("members", "username email schoolId")
      .lean();

    res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error("Error in GET /group:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/** Add Members To A Group **/
adminRoutes.post(
  "/group/addMembers/:groupId",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      let { schoolId } = req.body;
      const { groupId } = req.params;

      if (!schoolId) {
        return res
          .status(400)
          .json({ success: false, message: "School ID(s) are required." });
      }

      // Normalize into array
      const schoolIds = Array.isArray(schoolId) ? schoolId : [schoolId];

      // Find target group
      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Group not found." });
      }

      const results = {
        added: [],
        skipped: [],
        notFound: [],
      };

      for (const id of schoolIds) {
        // Validate user exists (by schoolId)
        const user = await User.findOne({ schoolId: id });
        if (!user) {
          results.notFound.push(id);
          continue;
        }

        // Ensure user isn't already in ANY group
        const conflict = await Group.findOne({ members: user._id });
        if (conflict) {
          results.skipped.push({ schoolId: id, group: conflict.name });
          continue;
        }

        // Add user to group
        group.members.push(user._id);
        await group.save();

        // Update user with group reference
        user.group = group._id;
        await user.save();

        results.added.push({ schoolId: id, name: user.name || user.username });
      }

      res.status(200).json({
        success: true,
        message: "Processed member(s).",
        results,
        group,
      });
    } catch (error) {
      console.error("Error adding members:", error);
      res
        .status(500)
        .json({ success: false, message: `Server error: ${error.message}` });
    }
  }
);

/** Remove a single member from a group **/
adminRoutes.delete(
  "/group/:groupId/members/:userId",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Group not found." });
      }

      // Check if user is in the group
      if (!group.members.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: "User is not a member of this group.",
        });
      }

      // Remove member
      group.members = group.members.filter(
        (m) => m.toString() !== userId.toString()
      );
      await group.save();

      // Update the user -> set group to null
      await User.findByIdAndUpdate(userId, { $unset: { group: "" } });

      res.status(200).json({
        success: true,
        message: "Member removed successfully.",
        group,
      });
    } catch (error) {
      console.error("Error in DELETE /groups/:id/members/:userId:", error);
      return res.status(500).json({
        success: false,
        message: `Internal Server Error: ${error.message}`,
      });
    }
  }
);

/** Update Group Name **/
adminRoutes.put(
  "/group/update/:id",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "New group name is required.",
        });
      }

      // Check if group exists
      const group = await Group.findById(id);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Group not found." });
      }

      // Ensure the new name is unique
      const existingGroup = await Group.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: "Another group with this name already exists.",
        });
      }

      group.name = name.trim();
      await group.save();

      res.status(200).json({
        success: true,
        message: "Group name updated successfully.",
        group,
      });
    } catch (error) {
      console.error("Error in PUT /groups/:id:", error);
      return res.status(500).json({
        success: false,
        message: `Internal Server Error: ${error.message}`,
      });
    }
  }
);

/** Delete an entire Group **/
adminRoutes.delete(
  "/group/delete/:id",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);

      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Group not found." });
      }

      await group.deleteOne();
      res
        .status(200)
        .json({ success: true, message: "Group deleted successfully." });
    } catch (error) {
      console.error("Error in DELETE /groups/:id:", error);
      return res.status(500).json({
        success: false,
        message: `Internal Server Error: ${error.message}`,
      });
    }
  }
);

// ********** END: GROUP ENDPOINTS ********** //

// ********** START: ATTENDANCE ENDPOINTS ********** //
/** Mark A Student Attendance **/
adminRoutes.get(
  "/attendance/mark/:schoolId",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const { schoolId } = req.params;

      const user = await User.findOne({ schoolId });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      const today = new Date();
      const dateOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ); // midnight reset

      // Check if attendance already exists
      const existingAttendance = await Attendance.findOne({
        schoolId,
        date: dateOnly,
      });

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          message: "Student already has attendance today",
        });
      }

      // Save new attendance
      const attendance = new Attendance({
        user: user._id,
        schoolId,
        date: dateOnly,
        timeIn: today.toTimeString().split(" ")[0], // HH:mm:ss
      });

      await attendance.save();

      console.log(
        "✅ Marked User(" + schoolId + ") as present: ",
        req.originalUrl
      );

      res.status(201).json({
        success: true,
        message: "Attendance marked successfully!",
        data: {
          name: user.name,
          schoolId: user.schoolId,
          date: attendance.date,
          timeIn: attendance.timeIn,
        },
      });
    } catch (error) {
      console.error("Error marking attendance:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get attendance records of ALL users (admin only)
adminRoutes.get(
  "/attendance/fetchAllStudentsAttendance",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const records = await Attendance.find()
        .populate("user", "name username schoolId section course department") // attach user details
        .sort({ date: -1 }) // latest first
        .select("-__v") // remove __v field
        .lean();

      if (!records || records.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No attendance records found.",
        });
      }

      console.log("✅ Get all attendance record: ", req.originalUrl);

      res.status(200).json({
        success: true,
        message: "All attendance records retrieved successfully.",
        count: records.length,
        records,
      });
    } catch (error) {
      console.error("Error fetching all attendance:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ********** END: ATTENDANCE ENDPOINTS ********** //

export default adminRoutes;
