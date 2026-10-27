
const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// GET a public community profile.
// Private contact details such as email, mobile and UPI are not returned.

// Search public student profiles in the authenticated user's active college.
router.get("/discover", authenticateToken, async (req, res) => {
  const viewerId = Number(req.user?.userId);
  const collegeId = Number(req.user?.collegeId);
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (
    !Number.isSafeInteger(viewerId) || viewerId <= 0 ||
    !Number.isSafeInteger(collegeId) || collegeId <= 0
  ) {
    return res.status(401).json({
      success: false,
      message: "Valid login and active college are required",
    });
  }

  if (query.length > 80) {
    return res.status(400).json({
      success: false,
      message: "Search must be 80 characters or fewer",
    });
  }

  try {
    const search = `%${query}%`;
    const [students] = await db.execute(
      `SELECT u.id, u.name, u.username,
        u.profile_picture AS profilePicture, u.bio, u.department,
              u.study_year AS studyYear
       FROM users u
       WHERE u.college_id = ?
         AND u.id <> ?
         AND (
           ? = ''
           OR u.name LIKE ?
           OR u.username LIKE ?
           OR u.department LIKE ?
         )
       ORDER BY u.name ASC
       LIMIT 50`,
      [collegeId, viewerId, query, search, search, search]
    );

    return res.json({
      success: true,
      students: students.map((student) => ({
        id: student.id,
        name: student.name || "CampusShare member",
        username: student.username || null,
        bio: student.bio || "",
        department: student.department || "",
        studyYear: student.studyYear == null
          ? null
          : Number(student.studyYear),
      })),
    });
  } catch (error) {
    console.error("Discover students error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to discover students",
    });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const viewerId = Number(req.user?.userId);
    const collegeId = Number(req.user?.collegeId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (
      !Number.isSafeInteger(viewerId) ||
      viewerId <= 0 ||
      !Number.isSafeInteger(collegeId) ||
      collegeId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Valid login and active college are required",
      });
    }

    // Only return profiles belonging to the active college.
    const [users] = await db.execute(
      `SELECT
        u.id,
        u.name,
        u.username,
        u.profile_picture,
        u.bio,
        u.department,
        u.study_year,
        u.location,
        u.availability,
        u.created_at,
        COALESCE(
          (
            SELECT ROUND(AVG(r.rating), 1)
            FROM ratings r
            WHERE r.rated_user_id = u.id
          ),
          0
        ) AS averageRating,
        (
          SELECT COUNT(*)
          FROM ratings r
          WHERE r.rated_user_id = u.id
        ) AS ratingCount
      FROM users u
      WHERE u.id = ?
        AND u.college_id = ?
      LIMIT 1`,
      [userId, collegeId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found in the active college",
      });
    }

    const user = users[0];

    const [taskCount] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM tasks
       WHERE user_id = ?
         AND college_id = ?`,
      [userId, collegeId]
    );

    const [resourceCount] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM resources
       WHERE user_id = ?
         AND college_id = ?`,
      [userId, collegeId]
    );

    const [acceptedTaskCount] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM acceptances a
       JOIN tasks t ON t.id = a.task_id
       WHERE a.helper_id = ?
         AND t.college_id = ?
         AND a.status = 'accepted'`,
      [userId, collegeId]
    );

    return res.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        username: user.username || null,
        profilePicture: user.profile_picture || null,
        bio: user.bio || "",
        department: user.department || "",
        study_year:
          user.study_year == null ? null : Number(user.study_year),
        location: user.location || null,
        availability: user.availability || null,
        created_at: user.created_at,
        averageRating: Number(user.averageRating || 0),
        ratingCount: Number(user.ratingCount || 0),
        postedTasks: Number(taskCount[0].count || 0),
        postedResources: Number(resourceCount[0].count || 0),
        acceptedTasks: Number(acceptedTaskCount[0].count || 0),
      },
    });
  } catch (error) {
    console.error("Get community profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
});

module.exports = router;
