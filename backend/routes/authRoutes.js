
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../utils/email");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured in .env");
}

/*
=========================================
REGISTER
POST /api/auth/register
=========================================
*/
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      college_id,
    } = req.body;

    // Basic validation
    if (!name || !email || !mobile || !password || !college_id) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, mobile, password and college are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();
    const collegeId = Number(college_id);

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Mobile validation
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check that college exists
    const [colleges] = await db.execute(
      "SELECT id, name, email_domain FROM colleges WHERE id = ?",
      [collegeId]
    );

    if (colleges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid college selected",
      });
    }

    const college = colleges[0];

    // Check duplicate email
    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Check duplicate mobile
    const [existingMobile] = await db.execute(
      "SELECT id FROM users WHERE mobile = ?",
      [cleanMobile]
    );

    if (existingMobile.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    // wallet_address starts as NULL and can be connected later
    const [result] = await db.execute(
      `INSERT INTO users
       (name, email, mobile, password, college_id, wallet_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cleanName,
        cleanEmail,
        cleanMobile,
        passwordHash,
        collegeId,
        null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile,
        wallet_address: null,
        college_id: college.id,
        college: college.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

/*
=========================================
LOGIN
POST /api/auth/login
=========================================
*/
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Get user + college + wallet information
    const [users] = await db.execute(
      `SELECT
        u.id,
       u.name,
u.email,
u.mobile,
u.password,
u.wallet_address,
        u.college_id,
        c.name AS college
       FROM users u
       LEFT JOIN colleges c
         ON u.college_id = c.id
       WHERE u.email = ?`,
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        userId: user.id,
        collegeId: user.college_id,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        wallet_address: user.wallet_address || null,
        college_id: user.college_id,
        college: user.college,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

/*
=========================================
FORGOT PASSWORD
POST /api/auth/forgot-password
=========================================
*/
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await db.execute(
      "SELECT id, email FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.json({
        success: true,
        message: "If an account exists with this email, a reset link has been sent.",
      });
    }

    const user = users[0];

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await db.execute(
      "UPDATE users SET reset_password_token = ?, reset_password_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?",
      [hashedToken, user.id]
    );

    const resetLink =
      process.env.FRONTEND_URL + "/reset-password?token=" + rawToken;

    await sendPasswordResetEmail(user.email, resetLink);

    return res.json({
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send password reset email",
    });
  }
});

/*
=========================================
RESET PASSWORD
POST /api/auth/reset-password
=========================================
*/
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [users] = await db.execute(
      "SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()",
      [hashedToken]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or expired",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute(
      "UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?",
      [passwordHash, users[0].id]
    );

    return res.json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while resetting password",
    });
  }
});

/*
=========================================
GOOGLE LOGIN
GET /api/auth/google
GET /api/auth/google/callback
GET /api/auth/me
=========================================
*/

router.get("/google", (req, res) => {
  try {
    const collegeId = req.query.college_id || "";

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const state = Buffer.from(
      JSON.stringify({ collegeId }),
      "utf8"
    ).toString("base64url");

    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      state,
      prompt: "select_account",
    });

    return res.redirect(authUrl);
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start Google login",
    });
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send("Google authorization code is missing.");
    }

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).send("Unable to verify Google account.");
    }

    const email = payload.email.trim().toLowerCase();
    const name = payload.name || email.split("@")[0];

    let collegeId = null;

    if (state) {
      try {
        const decodedState = JSON.parse(
          Buffer.from(state, "base64url").toString("utf8")
        );

        collegeId = decodedState.collegeId
          ? Number(decodedState.collegeId)
          : null;
      } catch (stateError) {
        console.error("Google state error:", stateError);
      }
    }

    const [existingUsers] = await db.execute(
      "SELECT id, name, email, mobile, upi_id, wallet_address, college_id FROM users WHERE email = ?",
      [email]
    );

    let user;

    if (existingUsers.length > 0) {
      user = existingUsers[0];

      if (!user.college_id && collegeId) {
        await db.execute(
          "UPDATE users SET college_id = ? WHERE id = ?",
          [collegeId, user.id]
        );

        user.college_id = collegeId;
      }
    } else {
      const generatedPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      const [result] = await db.execute(
        "INSERT INTO users (name, email, password, college_id) VALUES (?, ?, ?, ?)",
        [name, email, passwordHash, collegeId]
      );

      user = {
        id: result.insertId,
        name,
        email,
        mobile: null,
        upi_id: null,
        wallet_address: null,
        college_id: collegeId,
      };
    }

    const token = jwt.sign(
      {
        userId: user.id,
        collegeId: user.college_id || null,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/login?google_token=${encodeURIComponent(token)}`
    );
  } catch (error) {
    console.error("Google callback error:", error);

    return res.status(500).send(
      "Google login failed. Please try again."
    );
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET);

    const [users] = await db.execute(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.mobile,
        u.upi_id,
        u.wallet_address,
        u.college_id,
        c.name AS college
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      WHERE u.id = ?`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
});

/*
=========================================
UPDATE PROFILE
PUT /api/auth/profile
=========================================
*/
router.put("/profile", async (req, res) => {
  try {
    const {
      id,
      name,
      email,
      mobile,
      upi_id,
      wallet_address,
    } = req.body;

    if (!id || !name || !email) {
      return res.status(400).json({
        success: false,
        message: "ID, name and email are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile =
      mobile !== undefined &&
      mobile !== null &&
      String(mobile).trim()
        ? String(mobile).trim()
        : null;

    const cleanUpiId =
      upi_id !== undefined &&
      upi_id !== null &&
      String(upi_id).trim()
        ? String(upi_id).trim().toLowerCase()
        : null;

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (
      cleanUpiId &&
      !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(cleanUpiId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid UPI ID",
      });
    }

    if (
      wallet_address !== undefined &&
      wallet_address !== null &&
      wallet_address !== "" &&
      (
        typeof wallet_address !== "string" ||
        wallet_address.length !== 58
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [cleanEmail, id]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered by another user",
      });
    }

    await db.execute(
      `UPDATE users
       SET name = ?,
           email = ?,
           mobile = ?,
           upi_id = ?,
           wallet_address = ?
       WHERE id = ?`,
      [
        cleanName,
        cleanEmail,
        cleanMobile,
        cleanUpiId,
        wallet_address || null,
        id,
      ]
    );

    const [users] = await db.execute(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.mobile,
        u.upi_id,
        u.wallet_address,
        u.college_id,
        c.name AS college
       FROM users u
       LEFT JOIN colleges c
         ON u.college_id = c.id
       WHERE u.id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || null,
        upi_id: user.upi_id || null,
        wallet_address: user.wallet_address || null,
        college_id: user.college_id,
        college: user.college,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
});

module.exports = router;