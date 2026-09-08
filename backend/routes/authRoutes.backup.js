
const express = require("express");
const db = require("../db");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO users (name, email, password)
       VALUES (?, ?, ?)`,
      [name.trim(), normalizedEmail, password]
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: result.insertId,
        name: name.trim(),
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await db.execute(
      `SELECT id, name, email, password
       FROM users
       WHERE email = ?`,
      [normalizedEmail]
    );

    if (users.length === 0 || users[0].password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

module.exports = router;