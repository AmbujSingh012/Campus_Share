const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured in .env");
}

/*
========================================
REGISTER
POST /api/auth/register
========================================
*/

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      college_id,
    } = req.body;

    // Basic validation
    if (!name || !email || !password || !college_id) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and college are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const collegeId = Number(college_id);

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Basic email validation
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

    // Check that selected college actually exists
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

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.execute(
      `INSERT INTO users
       (name, email, password, college_id)
       VALUES (?, ?, ?, ?)`,
      [
        cleanName,
        cleanEmail,
        passwordHash,
        collegeId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
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
========================================
LOGIN
POST /api/auth/login
========================================
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

    // Get user + college information
    const [users] = await db.execute(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.password,
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

    // Compare password with bcrypt hash
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

module.exports = router;