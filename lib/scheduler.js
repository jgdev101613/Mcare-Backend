/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import cron from "node-cron";
import Duty from "../models/Duty.js";
import { sendDutyReminder } from "./mailer.js";

const [hour, minute] = process.env.REMINDER_TIME.split(":").map(Number);
const cronExp = `${minute} ${hour} * * *`;

cron.schedule(cronExp, async () => {
  console.log("⏰Running duty reminder check");

  // tomorrow’s date range
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  try {
    const duties = await Duty.find({
      date: { $gte: tomorrow, $lte: tomorrowEnd },
    }).populate({
      path: "group",
      populate: { path: "members", select: "email name" },
    });

    for (const duty of duties) {
      const users = duty.group.members.map((m) => ({
        name: m.name,
        email: m.email,
      }));

      if (users.length > 0) {
        await sendDutyReminder(users, duty, duty.group.name);
        console.log(`✅ Reminder sent for duty: ${duty.task} (${duty.group.name})`);
      }
    }
  } catch (err) {
    console.error("❌ Error sending duty reminders:", err.message);
  }
});
