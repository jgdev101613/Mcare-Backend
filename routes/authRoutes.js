/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import express from "express";
import User from "../models/User.js";
import Group from "../models/Group.js";
import jwt from "jsonwebtoken";
import validator from "validator";
import QRCode from "qrcode";
import {
  sendPasswordResetNotification,
  sendWelcomeEmail,
} from "../lib/mailer.js";

// Authentication
import protectRoutes from "../middleware/auth.middleware.js";
import selfOrAdmin from "../middleware/auth.user.js";
import adminOnly from "../middleware/auth.admin.js";

// Mailer
import { sendPasswordChangeNotification } from "../lib/mailer.js";

// Updating User
import cloudinary from "../lib/cloudinary.js";
import multer from "multer";

const authRoutes = express.Router();

const upload = multer({ dest: "uploads/" }); // temporary storage

// Create Token For Authentication
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// Generate QR Code for School ID
const generateQRCode = async (schoolId) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(schoolId, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 256,
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`QR Code generation failed: ${error.message}`);
  }
};

// Password Validation Options
const passwordOptions = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSybols: 1,
};

// Check if a number
const isNumber = (variable) => {
  return typeof variable === "number" && !Number.isNaN(variable);
};

// --- USER AUTHENTICATION --- //

/**
 * Register A User
 */
authRoutes.post("/register", async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      name,
      course,
      year,
      section,
      department,
      schoolId,
      role,
    } = req.body;

    // --- VALIDATIONS --- //
    const hasSpace = /\s/.test(username);

    if (hasSpace) {
      return res
        .status(400)
        .json({ success: false, message: "Username can't have spaces." });
    }

    if (!isNumber(Number(year))) {
      return res
        .status(400)
        .json({ success: false, message: "Year should be a number." });
    }

    // Check If Fields Are Empty
    if (
      !email.trim() ||
      !username.trim() ||
      !password.trim() ||
      !schoolId.trim()
    )
      return res
        .status(400)
        .json({ success: false, message: "Required fields cannot be empty." });

    if (!validator.isEmail(email))
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address." });

    if (username.length < 3)
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters.",
      });

    if (!validator.isStrongPassword(password, passwordOptions))
      return res.status(400).json({
        success: false,
        message:
          "Your password is weak. It must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });

    // Check If Username, Email, or School ID Already Exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res
        .status(400)
        .json({ success: false, message: "Email already exists." });

    const existingUsername = await User.findOne({ username });
    if (existingUsername)
      return res
        .status(400)
        .json({ success: false, message: "Username already exists." });

    const existingSchoolId = await User.findOne({ schoolId });
    if (existingSchoolId)
      return res
        .status(400)
        .json({ success: false, message: "School ID already exists." });
    // --- END OF VALIDATION ---

    // Get Random Avatar For Default Profile Image
    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    // Generate QR Code for School ID
    const qrCode = await generateQRCode(schoolId);

    // -- CREATE USER ---
    const user = new User({
      schoolId,
      username,
      email,
      password,
      name,
      year,
      section,
      course,
      department,
      profileImage,
      qrCode,
      role: role || "user",
    });

    await user.save();

    // Get The Token From JWT
    const token = generateToken(user._id);

    // 📧 Send welcome email (don’t block the response)
    sendWelcomeEmail(user).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    res.status(201).json({
      success: true,
      token,
      message: "Registered Successfully!",
      user: {
        id: user._id,
        schoolId: user.schoolId,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        qrCode: user.qrCode,
        createdAt: user.createdAt,
      },
    });
    // -- END OF CREATE USER ---
  } catch (error) {
    // --- SERVER ERROR ---
    console.log("Error In 'routes/authRoutes.js' Line 12: ", error);
    return res.status(500).json({
      success: false,
      message: `Internal Server Error: ${error.message}`,
    });
  }
});

/**
 * Login A User
 */
authRoutes.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // -- VALIDATIONS --
    if (!email.trim() || !password.trim())
      return res
        .status(400)
        .json({ success: false, message: "Fields cannot be blank." });

    if (!validator.isEmail(email))
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address." });
    // -- END OF VALIDATIONS --

    // Check If User Exists
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found." });

    // Check If Password Match
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect)
      return res
        .status(400)
        .json({ success: false, message: "Password does not matched." });

    // -- LOGGED IN USER --
    // Get The Token From JWT
    const token = generateToken(user._id);

    // 🔍 Find groups where this user is a member
    const groups = await Group.find({ members: user._id })
      .select("_id name members createdAt updatedAt")
      .populate("members", "_id name username email");

    res.status(201).json({
      success: true,
      token,
      message: "Login Successfully!",
      user: {
        _id: user._id,
        schoolId: user.schoolId,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        qrCode: user.qrCode,
        section: user.section,
        course: user.course,
        department: user.department,
        createdAt: user.createdAt,
        groups, // ✅ include group(s) the user belongs to
      },
    });
    // -- END OF LOGGED IN USER --
  } catch (error) {
    // --- SERVER ERROR ---
    console.log("Error In 'routes/authRoutes.js' Line 103: ", error);
    return res.status(500).json({
      success: false,
      message: `Internal Server Error: ${error.message}`,
    });
  }
});

/**
 *  Optional: Add route to regenerate QR code
 */
authRoutes.put("/regenerate-qr/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Generate new QR code
    const newQrCode = await generateQRCode(user.schoolId);

    // Update user with new QR code
    user.qrCode = newQrCode;
    await user.save();

    res.status(200).json({
      success: true,
      message: "QR code regenerated successfully!",
      qrCode: newQrCode,
    });
  } catch (error) {
    console.log("Error regenerating QR code: ", error);
    return res.status(500).json({
      success: false,
      message: `Internal Server Error: ${error.message}`,
    });
  }
});

// --- PROFILE EDITING --- //

/**
 * Edit User Password
 */
authRoutes.put(
  "/update/:id/password",
  protectRoutes,
  selfOrAdmin,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      if (!validator.isStrongPassword(newPassword, passwordOptions))
        return res.status(400).json({
          success: false,
          message:
            "Your password is weak. It must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
        });

      const user = await User.findById(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // 🔑 If the logged-in user is not admin, require currentPassword check
      if (req.user.role !== "admin") {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: "Current password is required",
          });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
          });
        }
      }

      user.password = newPassword;
      await user.save();

      if (req.user.role !== "admin") {
        await sendPasswordChangeNotification(user);
      }

      res.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("❌ Update password error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

authRoutes.put(
  "/update/:id/resetpassword",
  protectRoutes,
  adminOnly,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      user.password = "mcare0613"; // Default Password
      await user.save();

      await sendPasswordResetNotification(user);

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("❌ Reset password error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * Edit User Profile Image
 */
authRoutes.put(
  "/update/:id/profile-image",
  protectRoutes,
  selfOrAdmin,
  upload.single("image"), // <-- "image" is the field name in Postman
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No image uploaded" });
      }

      const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: `MCare/${req.params.id}`,
        public_id: "profile", // always overwrite profile image
        overwrite: true,
      });

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { profileImage: uploadResponse.secure_url },
        { new: true }
      ).select("-password");

      res.json({
        success: true,
        message: "Profile image updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("❌ Upload error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * Edit Username
 */
authRoutes.put(
  "/update/:id/username",
  protectRoutes,
  selfOrAdmin,
  async (req, res) => {
    try {
      const { username } = req.body;

      if (!username || username.trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Username cannot be empty" });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { username },
        { new: true }
      ).select("-password");

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.json({
        success: true,
        message: "Username updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("❌ Update username error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * Get All Members / Users with optional search
 */
authRoutes.get("/members/user", protectRoutes, adminOnly, async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      query = {
        $or: [
          { username: regex },
          { email: regex },
          { schoolId: regex },
          { name: regex },
        ],
      };
    }

    const users = await User.find(query).lean();

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
});

export default authRoutes;
