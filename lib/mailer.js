/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", 
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send Email Notif For Updating a Duty
 */
export const sendUpdateDutyNotification = async (recipients, duty, groupName) => {
   const formattedDate = new Date(duty.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  for (const recipient of recipients) {
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; background: #f9faf7; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2e7d32, #c0ca33); padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold;">MCare</h1>
            <p style="margin: 5px 0 0; color: #fdfde7; font-size: 14px;">Your Duty Has Been Updated</p>
          </div>

          <!-- Body -->
          <div style="padding: 20px; color: #333;">
            <p style="font-size: 16px;">Hello <b style="color: #2e7d32;">${recipient.name}</b>,</p>
            <p style="font-size: 16px;">Your previous duty has been updated with the following details:</p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Group</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${groupName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Date</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Time</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Place</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.place}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Clinical Instructor</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.clinicalInstructor}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Area</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.area}</td>
              </tr>
            </table>

            <p style="margin-top: 20px; font-size: 15px; color: #555;">
              Please be on time. This is an automated notification. 🌱
            </p>

            <!-- Call-to-Action Button -->
            <div style="text-align: center; margin-top: 20px;">
              <a href="#" style="background: #fdd835; color: #2e7d32; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Duty
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2e7d32; padding: 15px; text-align: center; font-size: 13px; color: #ffffff;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} MCare. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"MCare" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject: `Duty Updated for ${groupName} on ${formattedDate}`,
      html: htmlMessage,
    });
  }
}

/**
 * Send Email Notif For Creating A Duty
 */
export const sendDutyNotification = async (recipients, duty, groupName) => {
  const formattedDate = new Date(duty.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  for (const recipient of recipients) {
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; background: #f9faf7; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2e7d32, #c0ca33); padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold;">MCare</h1>
            <p style="margin: 5px 0 0; color: #fdfde7; font-size: 14px;">New Duty Assigned</p>
          </div>

          <!-- Body -->
          <div style="padding: 20px; color: #333;">
            <p style="font-size: 16px;">Hello <b style="color: #2e7d32;">${recipient.name}</b>,</p>
            <p style="font-size: 16px;">You have been assigned a new duty with the following details:</p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Group</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${groupName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Date</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Time</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Place</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.place}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Clinical Instructor</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.clinicalInstructor}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Area</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.area}</td>
              </tr>
            </table>

            <p style="margin-top: 20px; font-size: 15px; color: #555;">
              Please be on time. This is an automated notification. 🌱
            </p>

            <!-- Call-to-Action Button -->
            <div style="text-align: center; margin-top: 20px;">
              <a href="#" style="background: #fdd835; color: #2e7d32; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Duty
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2e7d32; padding: 15px; text-align: center; font-size: 13px; color: #ffffff;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} MCare. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"MCare" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject: `New Duty Assigned for ${groupName} on ${formattedDate}`,
      html: htmlMessage,
    });
  }
};

/**
 * Send Email Notif For Reminding A Scheduled Duty
 */
export const sendDutyReminder = async (users, duty, groupName) => {
  const formattedDate = new Date(duty.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  for (const user of users) {
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; background: #f9faf7; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2e7d32, #c0ca33); padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold;">MCare</h1>
            <p style="margin: 5px 0 0; color: #fdfde7; font-size: 14px;">Your Duty Reminder</p>
          </div>

          <!-- Body -->
          <div style="padding: 20px; color: #333;">
            <p style="font-size: 16px;">Hello <b style="color: #2e7d32;">${user.name}</b>,</p>
            <p style="font-size: 16px;">This is a reminder that you have a duty scheduled <b>tomorrow</b>:</p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Group</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${groupName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Date</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Time</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Place</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.place}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Clinical Instructor</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.clinicalInstructor}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background:#f9fbe7;">Area</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${duty.area}</td>
              </tr>
            </table>

            <p style="margin-top: 20px; font-size: 15px; color: #555;">
              Please prepare accordingly. Thank you for your commitment! 🌱
            </p>

            <!-- Call-to-Action Button -->
            <div style="text-align: center; margin-top: 20px;">
              <a href="#" style="background: #fdd835; color: #2e7d32; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Schedule
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2e7d32; padding: 15px; text-align: center; font-size: 13px; color: #ffffff;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} MCare. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"MCare" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Reminder: Duty Tomorrow (${groupName})`,
      html: htmlMessage,
    });
  }
};

/**
 * Send Email Notif If User Change Their Password
 */
export const sendPasswordChangeNotification = async (user) => {
  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; background: #f9faf7; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2e7d32, #c0ca33); padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold;">MCare</h1>
          <p style="margin: 5px 0 0; color: #fdfde7; font-size: 14px;">Password Change Alert</p>
        </div>

        <!-- Body -->
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Hello <b style="color: #2e7d32;">${user.name || user.username}</b>,</p>
          
          <p style="font-size: 16px;">
            Your account password was successfully updated on 
            <b>${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</b>.
          </p>

          <p style="margin-top: 15px; font-size: 15px; color: #555;">
            If <b>you made this change</b>, no further action is required.  
            <br>
            If <b>you did not make this change</b>, please contact the administration immediately to secure your account.
          </p>

          <!-- Call-to-Action Button -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="#" style="background: #fdd835; color: #2e7d32; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
              Contact Support
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #2e7d32; padding: 15px; text-align: center; font-size: 13px; color: #ffffff;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} MCare. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"MCare" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Your MCare Account Password Has Been Changed`,
    html: htmlMessage,
  });
};

/**
 * Send Welcome Email When a User Registers
 */
export const sendWelcomeEmail = async (user) => {
  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; background: #f9faf7; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2e7d32, #c0ca33); padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold;">Welcome to MCare 🎉</h1>
          <p style="margin: 5px 0 0; color: #fdfde7; font-size: 14px;">Your Student Duty & Attendance Companion</p>
        </div>

        <!-- Body -->
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Hello <b style="color: #2e7d32;">${user.name || user.username}</b>,</p>
          
          <p style="font-size: 16px;">
            Welcome to <b>MCare</b>! 🎓  
            We’re excited to have you on board. This app was built for Maryhill College students to make their academic life easier and more organized.
          </p>

          <p style="margin-top: 15px; font-size: 15px; color: #555;">
            With MCare, you can:
          </p>

          <ul style="margin: 10px 0 20px 20px; color: #2e7d32; font-size: 15px;">
            <li>View your duty schedule assigned by your professors</li>
            <li>Get notified about upcoming duties</li>
            <li>Easily record attendance using your unique QR code</li>
          </ul>

          <p style="font-size: 15px; color: #555;">
            Start exploring and take full advantage of MCare to stay on top of your duties and attendance.
          </p>

          <!-- Call-to-Action Button -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="#" style="background: #fdd835; color: #2e7d32; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
              Go to website
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #2e7d32; padding: 15px; text-align: center; font-size: 13px; color: #ffffff;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} MCare. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"MCare" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Welcome to MCare, ${user.name || user.username}! 🎓`,
    html: htmlMessage,
  });
};


