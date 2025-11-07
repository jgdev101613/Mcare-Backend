import mongoose from "mongoose";
import User from "../models/User.js";

const MONGODB_URI =
  "mongodb+srv://jgadmin:jgadmin@mcare.5dyisws.mongodb.net/?retryWrites=true&w=majority&appName=Mcare";

async function runMigration() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Database connection successful.");

    const updateOperation = {
      // New fields to add to all existing documents
      $set: {
        fathersName: "",
        mothersName: "",
        guardian: "",
        guardiansNumber: "",
        fathersNumber: "",
        mothersNumber: "",
        address: "",
      },
    };

    // The first parameter {} means 'update ALL documents'
    const result = await User.updateMany({}, updateOperation);

    console.log(`✅ Migration complete!`);
    console.log(`Documents matched: ${result.matchedCount}`);
    console.log(`Documents modified: ${result.modifiedCount}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
