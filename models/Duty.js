/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import mongoose from "mongoose";

const dutySchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    place: {
      type: String,       // you can make it required if needed
      required: true,
      trim: true,
    },
    time: {
      type: String,       // e.g. "08:00 AM - 10:00 AM"
      required: true,
      trim: true,
    },
    clinicalInstructor: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Duty", dutySchema);
