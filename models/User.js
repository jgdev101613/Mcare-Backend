/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    schoolId: {type: String, required: true},
    username: { type: String, required: true },
    qrCode: {type: String, required: true},
    name: {type: String},
    section: {type: String},
    course: {type: String},
    year: {type: Number},
    department: {type: String},
    email: { type: String, required: true, unique: true },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    password: { type: String, requried: true, minlength: 6 },
    profileImage: { type: String, default: "" },
  },
  { timestamps: true, minimize: false }
);

// Has Password Before Saving To Database
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.log(error.message);
  }
  next();
});

// Compare Password Function
userSchema.methods.comparePassword = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;