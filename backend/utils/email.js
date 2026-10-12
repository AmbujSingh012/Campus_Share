const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPasswordResetEmail(to, resetLink) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [to],
    subject: "Reset your CampusShare password",
    text: `You requested a password reset for CampusShare.

Open this link to reset your password:
${resetLink}

This link expires in 15 minutes.

If you did not request this, you can safely ignore this email.`,
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

  if (error) {
    console.error("Resend email error:", error);
    throw new Error(error.message || "Failed to send password reset email");
  }

  console.log("Password reset email sent:", data?.id);
}

module.exports = { sendPasswordResetEmail };
