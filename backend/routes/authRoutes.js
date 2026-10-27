
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../utils/email");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

/*
=========================================
REGISTER
POST /api/auth/register
=========================================
*/
router.post("/register", async (req, res) => {
  try {
    const { name, email, mobile, password, college_id } = req.body || {};

    if (!name || !email || !mobile || !password || !college_id) {
      return res.status(400).json({
        success: false,
        message: "Name, email, mobile, password and college are required",
      });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = String(mobile).trim();
    const collegeId = Number(college_id);

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (!Number.isInteger(collegeId) || collegeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid college selected",
      });
    }

    const [colleges] = await db.execute(
      "SELECT id, name FROM colleges WHERE id = ?",
      [collegeId]
    );

    if (colleges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid college selected",
      });
    }

    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = ?",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

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

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      `INSERT INTO users
       (name, email, mobile, password, college_id, wallet_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanName, cleanEmail, cleanMobile, passwordHash, collegeId, null]
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
        college_id: colleges[0].id,
        college: colleges[0].name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);

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
  const requestId = crypto.randomUUID();

  try {
    const { email, password, college_id } = req.body || {};

    console.log(`[LOGIN ${requestId}] Request received`);

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      console.warn(`[LOGIN ${requestId}] Missing email or password`);

      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        requestId,
      });
    }

    if (
      college_id === undefined ||
      college_id === null ||
      String(college_id).trim() === ""
    ) {
      console.warn(`[LOGIN ${requestId}] College ID missing`);

      return res.status(400).json({
        success: false,
        message: "Please select your college before login",
        requestId,
      });
    }

    const selectedCollegeId = Number(college_id);

    if (
      !Number.isInteger(selectedCollegeId) ||
      selectedCollegeId <= 0
    ) {
      console.warn(`[LOGIN ${requestId}] Invalid college ID`);

      return res.status(400).json({
        success: false,
        message: "Invalid college selected",
        requestId,
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [colleges] = await db.execute(
      "SELECT id, name FROM colleges WHERE id = ?",
      [selectedCollegeId]
    );

    if (colleges.length === 0) {
      console.warn(`[LOGIN ${requestId}] College not found`);

      return res.status(400).json({
        success: false,
        message: "Selected college not found",
        requestId,
      });
    }

    const [users] = await db.execute(
      `SELECT id, name, email, mobile, password, wallet_address
       FROM users
       WHERE LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [cleanEmail]
    );

    console.log(
      `[LOGIN ${requestId}] User found: ${users.length > 0}`
    );

    if (users.length === 0) {
      console.warn(`[LOGIN ${requestId}] Returning 401: user not found`);

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        requestId,
      });
    }

    const user = users[0];

    if (
      typeof user.password !== "string" ||
      !user.password.trim()
    ) {
      console.warn(
        `[LOGIN ${requestId}] Returning 401: password hash missing`
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        requestId,
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    console.log(
      `[LOGIN ${requestId}] Password match: ${passwordMatch}`
    );

    if (!passwordMatch) {
      console.warn(
        `[LOGIN ${requestId}] Returning 401: password mismatch`
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        requestId,
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        collegeId: selectedCollegeId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`[LOGIN ${requestId}] Token created successfully`);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || null,
        wallet_address: user.wallet_address || null,
        college_id: selectedCollegeId,
        college: colleges[0].name,
      },
    });
  } catch (error) {
    console.error(`[LOGIN ${requestId}] Login error:`, error.message);

    return res.status(500).json({
      success: false,
      message: "Server error during login",
      requestId,
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
    const { email } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await db.execute(
      "SELECT id, email FROM users WHERE LOWER(TRIM(email)) = ?",
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
      `UPDATE users
       SET reset_password_token = ?,
           reset_password_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
       WHERE id = ?`,
      [hashedToken, user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is not configured");
    }

    const resetLink =
      `${frontendUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await sendPasswordResetEmail(user.email, resetLink);

    return res.json({
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

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
    const { token, password } = req.body || {};

    if (
      typeof token !== "string" ||
      !token ||
      typeof password !== "string" ||
      !password
    ) {
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
      `SELECT id
       FROM users
       WHERE reset_password_token = ?
         AND reset_password_expires > NOW()`,
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
      `UPDATE users
       SET password = ?,
           reset_password_token = NULL,
           reset_password_expires = NULL
       WHERE id = ?`,
      [passwordHash, users[0].id]
    );

    return res.json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

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
=========================================
*/
router.get("/google", (req, res) => {
  try {
    const collegeId = Number(req.query.college_id);

    if (!Number.isInteger(collegeId) || collegeId <= 0) {
      return res.status(400).send(
        "Please select your college before Google login."
      );
    }

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
    console.error("Google login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to start Google login",
    });
  }
});

/*
=========================================
GOOGLE CALLBACK
GET /api/auth/google/callback
=========================================
*/
router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (typeof code !== "string" || !code) {
      return res.status(400).send(
        "Google authorization code is missing."
      );
    }

    let collegeId = null;

    if (typeof state === "string" && state) {
      try {
        const decodedState = JSON.parse(
          Buffer.from(state, "base64url").toString("utf8")
        );

        collegeId = decodedState.collegeId
          ? Number(decodedState.collegeId)
          : null;
      } catch (stateError) {
        console.error("Google state error:", stateError.message);
      }
    }

    if (!Number.isInteger(collegeId) || collegeId <= 0) {
      return res.status(400).send(
        "Please select your college before Google login."
      );
    }

    const [colleges] = await db.execute(
      "SELECT id, name FROM colleges WHERE id = ?",
      [collegeId]
    );

    if (colleges.length === 0) {
      return res.status(400).send(
        "Selected college was not found."
      );
    }

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    if (!tokens.id_token) {
      return res.status(400).send("Google ID token is missing.");
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (
      !payload ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      return res.status(400).send(
        "Unable to verify Google account. Please use a verified Google email."
      );
    }

    const email = payload.email.trim().toLowerCase();
    const name = payload.name || email.split("@")[0];

    const [existingUsers] = await db.execute(
      `SELECT id, name, email, mobile, upi_id, wallet_address
       FROM users
       WHERE LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [email]
    );

    let user;

    if (existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      const generatedPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      const [result] = await db.execute(
        `INSERT INTO users
         (name, email, password, college_id)
         VALUES (?, ?, ?, ?)`,
        [name, email, passwordHash, collegeId]
      );

      user = {
        id: result.insertId,
        name,
        email,
        mobile: null,
        upi_id: null,
        wallet_address: null,
      };
    }

    const token = jwt.sign(
      {
        userId: user.id,
        collegeId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is not configured");
    }

    return res.redirect(
      `${frontendUrl.replace(/\/+$/, "")}/login?google_token=${encodeURIComponent(token)}`
    );
  } catch (error) {
    console.error("Google callback error:", error.message);

    return res.status(500).send(
      "Google login failed. Please try again."
    );
  }
});

/*
=========================================
GET CURRENT USER
GET /api/auth/me
=========================================
*/
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

    if (!decoded.userId || !decoded.collegeId) {
      return res.status(401).json({
        success: false,
        message: "Invalid active college session",
      });
    }

    const activeCollegeId = Number(decoded.collegeId);

    if (
      !Number.isInteger(activeCollegeId) ||
      activeCollegeId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid active college",
      });
    }

    const [colleges] = await db.execute(
      "SELECT id, name FROM colleges WHERE id = ?",
      [activeCollegeId]
    );

    if (colleges.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Active college not found",
      });
    }

    const [users] = await db.execute(
      `SELECT id, name, email, mobile, upi_id, wallet_address
       FROM users
       WHERE id = ?`,
      [decoded.userId]
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || null,
        upi_id: user.upi_id || null,
        wallet_address: user.wallet_address || null,
        college_id: colleges[0].id,
        college: colleges[0].name,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error.message);

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

router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      name,
      email,
      mobile,
      upi_id,
      wallet_address,
      username,
      bio,
      department,
      study_year,
    } = req.body || {};
const mobileWasProvided = Object.prototype.hasOwnProperty.call(req.body || {}, "mobile");
const upiWasProvided = Object.prototype.hasOwnProperty.call(req.body || {}, "upi_id");
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername =
      typeof username === "string"
        ? username.trim().toLowerCase()
        : "";
    const cleanBio = typeof bio === "string" ? bio.trim() : "";
    const cleanDepartment =
      typeof department === "string" ? department.trim() : "";

    const cleanMobile =
      mobile != null && String(mobile).trim()
        ? String(mobile).trim()
        : null;

    const cleanUpiId =
      upi_id != null && String(upi_id).trim()
        ? String(upi_id).trim().toLowerCase()
        : null;

    const cleanStudyYear =
      study_year == null || String(study_year).trim() === ""
        ? null
        : Number(study_year);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (
      cleanUsername &&
      !/^[a-z0-9_]{3,30}$/.test(cleanUsername)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be 3–30 characters using letters, numbers or underscores",
      });
    }

    if (cleanBio.length > 500 || cleanDepartment.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Bio or department exceeds the allowed length",
      });
    }

    if (
      cleanStudyYear !== null &&
      (!Number.isInteger(cleanStudyYear) ||
        cleanStudyYear < 1 ||
        cleanStudyYear > 8)
    ) {
      return res.status(400).json({
        success: false,
        message: "Study year must be between 1 and 8",
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
      wallet_address != null &&
      wallet_address !== "" &&
      (typeof wallet_address !== "string" ||
        wallet_address.trim().length !== 58)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const [existingEmails] = await db.execute(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND id != ? LIMIT 1",
      [cleanEmail, userId]
    );

    if (existingEmails.length) {
      return res.status(409).json({
        success: false,
        message: "Email already registered by another user",
      });
    }

    if (cleanUsername) {
      const [existingUsernames] = await db.execute(
        "SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1",
        [cleanUsername, userId]
      );

      if (existingUsernames.length) {
        return res.status(409).json({
          success: false,
          message: "That username is already taken",
        });
      }
    }

    // Preserve the existing wallet address when this request omits it.
    const walletWasProvided =
      Object.prototype.hasOwnProperty.call(
        req.body || {},
        "wallet_address"
      );

    await db.execute(
      `UPDATE users
       SET name = ?,
           email = ?,
           mobile = CASE WHEN ? = 1 THEN ? ELSE mobile END,
          upi_id = CASE WHEN ? = 1 THEN ? ELSE upi_id END,
           wallet_address = CASE
             WHEN ? = 1 THEN ?
             ELSE wallet_address
           END,
           username = ?,
           bio = ?,
           department = ?,
           study_year = ?
       WHERE id = ?`,
      [
        cleanName,
        cleanEmail,
        mobileWasProvided ? 1 : 0,
cleanMobile,
upiWasProvided ? 1 : 0,
cleanUpiId,
        walletWasProvided ? 1 : 0,
        wallet_address ? wallet_address.trim() : null,
        cleanUsername || null,
        cleanBio || null,
        cleanDepartment || null,
        cleanStudyYear,
        userId,
      ]
    );

    const [users] = await db.execute(
      `SELECT
         id, name, email, mobile, upi_id, wallet_address,
         college_id, username, bio, department, study_year
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!users.length) {
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
        username: user.username || null,
        bio: user.bio || "",
        department: user.department || "",
        study_year:
          user.study_year == null ? null : Number(user.study_year),
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Username or email is already in use",
      });
    }

    console.error("Profile update error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
});


module.exports = router;
