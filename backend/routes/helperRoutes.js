const express = require("express");
const db = require("../db");
const { extractKeywords } = require("../utils/helperMatcher");
const { buildHelperResponse } = require("../utils/helperResponse");

const router = express.Router();

// POST /api/helper
router.post("/", async (req, res) => {
  try {
    const { request } = req.body;

    if (!request || !request.trim()) {
      return res.status(400).json({
        success: false,
        message: "Request is required",
      });
    }

    const searchText = request.trim();
    const keywords = extractKeywords(searchText);

    if (keywords.length === 0) {
      return res.json({
        success: true,
        request: searchText,
        message: "I could not identify a useful search term.",
        results: {
          resources: [],
          tasks: [],
        },
      });
    }

    // Create SQL conditions for every keyword
    const resourceConditions = keywords
      .map(
        () =>
          `(r.title LIKE ? OR r.description LIKE ? OR r.category LIKE ?)`
      )
      .join(" OR ");

    const resourceParams = keywords.flatMap((word) => {
      const keyword = `%${word}%`;
      return [keyword, keyword, keyword];
    });

    // Search resources
    const [resources] = await db.execute(
      `
      SELECT
        r.id,
        r.title,
        r.description,
        r.category,
        r.availability,
        u.name AS postedBy
      FROM resources r
      JOIN users u ON r.user_id = u.id
      WHERE ${resourceConditions}
      ORDER BY r.created_at DESC
      LIMIT 5
      `,
      resourceParams
    );

    const taskConditions = keywords
      .map(
        () =>
          `(t.title LIKE ? OR t.description LIKE ? OR t.category LIKE ?)`
      )
      .join(" OR ");

    const taskParams = keywords.flatMap((word) => {
      const keyword = `%${word}%`;
      return [keyword, keyword, keyword];
    });

    // Search open tasks
    const [tasks] = await db.execute(
      `
      SELECT
        t.id,
        t.title,
        t.description,
        t.category,
        t.location,
        t.reward,
        t.status,
        t.deadline,
        u.name AS postedBy
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.status = 'open'
        AND (${taskConditions})
      ORDER BY t.created_at DESC
      LIMIT 5
      `,
      taskParams
    );

    const helperMessage = buildHelperResponse(
  searchText,
  resources,
  tasks
);

res.json({
  success: true,
  request: searchText,
  keywords,
  message: helperMessage,
  results: {
    resources,
    tasks,
  },
});
  } catch (error) {
    console.error("Campus Helper error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while processing Campus Helper request",
    });
  }
});
// GET AVAILABLE HELPERS
router.get("/available", async (req, res) => {
  try {
    const [helpers] = await db.execute(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.location,
        u.availability,
        u.college_id
       FROM users u
       WHERE u.availability = 'available'
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      count: helpers.length,
      helpers,
    });
  } catch (error) {
    console.error("Available helpers error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching available helpers",
    });
  }
});
module.exports = router;
