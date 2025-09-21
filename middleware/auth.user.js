/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import User from "../models/User.js";

const selfOrAdmin = async (req, res, next) => {
  const loggedInUser = req.user; // from protectRoutes
  const { _id, id, schoolId } = req.params;

  if (!loggedInUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // ✅ allow admin
  if (loggedInUser.role === "admin") {
    return next();
  }

  // ✅ allow professor
  if (loggedInUser.role === "professor") {
    return next();
  }

  // ✅ if checking by userId
  if (id && loggedInUser._id.toString() === id.toString()) {
    return next();
  }

  // ✅ if checking by userId
  if (_id && loggedInUser._id.toString() === _id.toString()) {
    return next();
  }

  // ✅ if checking by schoolId
  if (schoolId) {
    const targetUser = await User.findOne({ schoolId }).select("_id");
    if (
      targetUser &&
      targetUser._id.toString() === loggedInUser._id.toString()
    ) {
      return next();
    }
  }

  // ❌ not allowed
  return res.status(403).json({
    success: false,
    message: "Access denied. Not your account.",
  });
};

export default selfOrAdmin;
