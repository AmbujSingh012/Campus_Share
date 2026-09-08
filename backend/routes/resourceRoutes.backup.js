
const express = require("express");
const db = require("../db");

const router = express.Router();

// GET ALL RESOURCES
router.get("/", async (req, res) => {
  try {
    const [resources] = await db.execute(`
      SELECT
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.category,
        r.availability,
        r.created_at,
        u.name AS postedBy
      FROM resources r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);

    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error("Get resources error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching resources",
    });
  }
});

// GET RESOURCE BY ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID",
      });
    }

    const [resources] = await db.execute(
      `SELECT
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.category,
        r.availability,
        r.created_at,
        u.name AS postedBy
       FROM resources r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    res.json({
      success: true,
      resource: resources[0],
    });
  } catch (error) {
    console.error("Get resource error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching resource",
    });
  }
});

// CREATE RESOURCE
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      postedBy,
      location,
      userId,
      availability,
    } = req.body;

    // Accept userId from the new API.
    // Keep postedBy temporarily supported for frontend compatibility.
    const ownerId = userId || postedBy;

    if (!title || !category || !ownerId) {
      return res.status(400).json({
        success: false,
        message: "Title, category and userId are required",
      });
    }

    const numericUserId = Number(ownerId);

    if (!Number.isInteger(numericUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const [users] = await db.execute(
      "SELECT id, name FROM users WHERE id = ?",
      [numericUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO resources
       (user_id, title, description, category, availability)
       VALUES (?, ?, ?, ?, ?)`,
      [
        numericUserId,
        title.trim(),
        description || "",
        category.trim(),
        availability || location || null,
      ]
    );

    const [newResource] = await db.execute(
      `SELECT
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.category,
        r.availability,
        r.created_at,
        u.name AS postedBy
       FROM resources r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Resource created successfully",
      resource: newResource[0],
    });
  } catch (error) {
    console.error("Create resource error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating resource",
    });
  }
});

module.exports = router;