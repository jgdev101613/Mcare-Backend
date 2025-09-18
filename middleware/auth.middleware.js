/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protectRoutes = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  console.log("🔐 Protected route accessed:", req.method, req.originalUrl);
  console.log("🔐 Authorization header:", authHeader);

  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized Access, please login.",
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid/Expired token" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("❌ JWT Error in:", req.originalUrl);
    return res.status(401).json({
      success: false,
      message: `Invalid Token: ${error.message}`,
    });
  }
};

export default protectRoutes;