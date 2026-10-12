const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

function getActiveCollegeId(req) {
  const collegeId = Number(req.user?.collegeId);

  if (!Number.isInteger(collegeId) || collegeId <= 0) {
    return null;
  }

  return collegeId;
}

// GET notifications and unread count for the signed-in user
router.get("/", async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const collegeId = getActiveCollegeId(req);

    if (!userId || !collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

    const [notifications] = await db.execute(
      `
      SELECT
        n.id,
        n.actor_id AS actorId,
        actor.name AS actorName,
        n.notification_type AS type,
        n.entity_id AS entityId,
        n.title,
        n.message,
        n.created_at AS createdAt,
        n.read_at AS readAt
      FROM notifications n
      JOIN users actor ON actor.id = n.actor_id
      WHERE n.recipient_id = ?
        AND n.college_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
      `,
      [userId, collegeId]
    );

    const [counts] = await db.execute(
      `
      SELECT COUNT(*) AS unreadCount
      FROM notifications
      WHERE recipient_id = ?
        AND college_id = ?
        AND read_at IS NULL
      `,
      [userId, collegeId]
    );

    return res.json({
      success: true,
      notifications,
      unreadCount: Number(counts[0].unreadCount),
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch notifications",
    });
  }
});

// Mark all notifications as read for the signed-in user
router.patch("/read-all", async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const collegeId = getActiveCollegeId(req);

    if (!userId || !collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

    await db.execute(
      `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE recipient_id = ?
        AND college_id = ?
        AND read_at IS NULL
      `,
      [userId, collegeId]
    );

    return res.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("Mark notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to mark notifications as read",
    });
  }
});

module.exports = router;
