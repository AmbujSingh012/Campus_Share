const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// All resource APIs require authentication
router.use(authenticateToken);

// GET ALL RESOURCES
// Only resources from the logged-in user's college
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;

    const [users] = await db.execute(
      "SELECT college_id FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const collegeId = users[0].college_id;

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with a college",
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
        r.college_id,
        r.created_at,
        u.name AS postedBy
       FROM resources r
       JOIN users u ON r.user_id = u.id
       WHERE r.college_id = ?
       ORDER BY r.created_at DESC`,
      [collegeId]
    );

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
// Only allow access to resources from the logged-in user's college
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID",
      });
    }

    const userId = req.user.userId;

    const [users] = await db.execute(
      "SELECT college_id FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0 || !users[0].college_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with a college",
      });
    }

    const collegeId = users[0].college_id;

    const [resources] = await db.execute(
      `SELECT
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.category,
        r.availability,
        r.college_id,
        r.created_at,
        u.name AS postedBy
       FROM resources r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?
         AND r.college_id = ?`,
      [id, collegeId]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Resource not found in your college",
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
// college_id comes from authenticated user, NOT frontend
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      availability,
      location,
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: "Title and category are required",
      });
    }

    const userId = req.user.userId;

    const [users] = await db.execute(
      "SELECT id, name, college_id FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const user = users[0];

    if (!user.college_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with a college",
      });
    }

    const collegeId = user.college_id;

    const [result] = await db.execute(
      `INSERT INTO resources
       (user_id, title, description, category, availability, college_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        title.trim(),
        description || "",
        category.trim(),
        availability || location || null,
        collegeId,
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
        r.college_id,
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

// UPDATE RESOURCE
// User can update only their own resource
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID",
      });
    }

    const {
      title,
      description,
      category,
      availability,
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: "Title and category are required",
      });
    }

    const userId = req.user.userId;

    const [result] = await db.execute(
      `UPDATE resources
       SET title = ?,
           description = ?,
           category = ?,
           availability = ?
       WHERE id = ?
         AND user_id = ?`,
      [
        title.trim(),
        description || "",
        category.trim(),
        availability || null,
        id,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Resource not found or you are not the owner",
      });
    }

    res.json({
      success: true,
      message: "Resource updated successfully",
    });
  } catch (error) {
    console.error("Update resource error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating resource",
    });
  }
});

// DELETE RESOURCE
// User can delete only their own resource
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID",
      });
    }

    const userId = req.user.userId;

    const [result] = await db.execute(
      `DELETE FROM resources
       WHERE id = ?
         AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Resource not found or you are not the owner",
      });
    }

    res.json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("Delete resource error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while deleting resource",
    });
  }
});

module.exports = router;
