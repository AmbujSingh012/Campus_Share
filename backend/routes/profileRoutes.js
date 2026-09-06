
const express = require("express");
const db = require("../db");

const router = express.Router();

// GET PROFILE
router.get("/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const [users] = await db.execute(
      `SELECT id, name, email, location, availability, created_at
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    const [taskCount] = await db.execute(
      "SELECT COUNT(*) AS count FROM tasks WHERE user_id = ?",
      [userId]
    );

    const [resourceCount] = await db.execute(
      "SELECT COUNT(*) AS count FROM resources WHERE user_id = ?",
      [userId]
    );

    const [acceptedTaskCount] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM acceptances
       WHERE helper_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        location: user.location,
        availability: user.availability,
        postedTasks: Number(taskCount[0].count),
        postedResources: Number(resourceCount[0].count),
        acceptedTasks: Number(acceptedTaskCount[0].count),
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
});

module.exports = router;