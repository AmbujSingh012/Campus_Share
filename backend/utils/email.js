const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendPasswordResetEmail(to, resetLink) {
  await transporter.sendMail({
    from: `"CampusShare" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your CampusShare password",
    text: `You requested a password reset for CampusShare.\n\nOpen this link to reset your password:\n${resetLink}\n\nThis link expires in 15 minutes.\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Reset your CampusShare password</h2>
        <p>You requested a password reset for your CampusShare account.</p>
        <p>
          <a href="${resetLink}"
             style="display:inline-block;padding:12px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:8px">
            Reset Password
          </a>
        </p>
        <p>This link expires in <strong>15 minutes</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
