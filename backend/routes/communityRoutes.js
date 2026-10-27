const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

function getUserContext(req) {
  const userId = Number(req.user?.userId);
  const collegeId = Number(req.user?.collegeId);

  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    !Number.isSafeInteger(collegeId) ||
    collegeId <= 0
  ) {
    return null;
  }

  return { userId, collegeId };
}

// List connection requests and accepted connections.
router.get("/connections", async (req, res) => {
  const context = getUserContext(req);

  if (!context) {
    return res.status(401).json({
      success: false,
      message: "Valid user and college context required",
    });
  }

  try {
    const [rows] = await db.execute(
      `SELECT
         c.requester_id AS requesterId,
         c.recipient_id AS recipientId,
         c.id AS connectionId,
         c.status,
         c.created_at AS createdAt,
         CASE
           WHEN c.requester_id = ? THEN c.recipient_id
           ELSE c.requester_id
         END AS otherUserId,
         u.name,
         u.username,
        u.profile_picture AS profilePicture,
         u.bio,
         u.department,
         u.study_year AS studyYear
       FROM connections c
       JOIN users u
         ON u.id = CASE
           WHEN c.requester_id = ? THEN c.recipient_id
           ELSE c.requester_id
         END
       WHERE c.college_id = ?
         AND (c.requester_id = ? OR c.recipient_id = ?)
       ORDER BY c.updated_at DESC`,
      [
        context.userId,
        context.userId,
        context.collegeId,
        context.userId,
        context.userId,
      ]
    );

    return res.json({ success: true, connections: rows });
  } catch (error) {
    console.error("List connections error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load connections",
    });
  }
});

// Accept or reject a request addressed to the logged-in user.
router.patch("/connections/:id", async (req, res) => {
  const context = getUserContext(req);

  if (!context) {
    return res.status(401).json({
      success: false,
      message: "Valid user and college context required",
    });
  }

  const connectionId = Number(req.params.id);
  const { status } = req.body || {};

  if (
    !Number.isSafeInteger(connectionId) ||
    connectionId <= 0 ||
    !["accepted", "rejected"].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid connection ID and status are required",
    });
  }

  try {
    const [result] = await db.execute(
      `UPDATE connections
       SET status = ?
       WHERE id = ?
         AND recipient_id = ?
         AND college_id = ?
         AND status = 'pending'`,
      [status, connectionId, context.userId, context.collegeId]
    );

    if (result.affectedRows !== 1) {
      return res.status(404).json({
        success: false,
        message: "Pending connection request not found",
      });
    }

    return res.json({ success: true, status });
  } catch (error) {
    console.error("Update connection error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update connection request",
    });
  }
});

// Read messages only when the user belongs to an accepted connection.
router.get("/connections/:id/messages", async (req, res) => {
  const context = getUserContext(req);

  if (!context) {
    return res.status(401).json({
      success: false,
      message: "Valid user and college context required",
    });
  }

  const connectionId = Number(req.params.id);

  if (!Number.isSafeInteger(connectionId) || connectionId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid connection ID",
    });
  }

  try {
    const [access] = await db.execute(
      `SELECT id
       FROM connections
       WHERE id = ?
         AND college_id = ?
         AND status = 'accepted'
         AND (requester_id = ? OR recipient_id = ?)
       LIMIT 1`,
      [
        connectionId,
        context.collegeId,
        context.userId,
        context.userId,
      ]
    );

    if (access.length === 0) {
      return res.status(403).json({
        success: false,
        message: "An accepted connection is required to view this chat",
      });
    }

    const [messages] = await db.execute(
      `SELECT
         id,
         connection_id AS connectionId,
         sender_id AS senderId,
         message_text AS messageText,
         created_at AS createdAt,
         read_at AS readAt
       FROM messages
       WHERE connection_id = ?
       ORDER BY created_at ASC, id ASC
       LIMIT 200`,
      [connectionId]
    );

    await db.execute(
      `UPDATE messages
       SET read_at = CURRENT_TIMESTAMP
       WHERE connection_id = ?
         AND sender_id <> ?
         AND read_at IS NULL`,
      [connectionId, context.userId]
    );

    return res.json({ success: true, messages });
  } catch (error) {
    console.error("Load messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load messages",
    });
  }
});

// Send a message only to an accepted connection.
router.post("/connections/:id/messages", async (req, res) => {
  const context = getUserContext(req);

  if (!context) {
    return res.status(401).json({
      success: false,
      message: "Valid user and college context required",
    });
  }

  const connectionId = Number(req.params.id);
  const messageText =
    typeof req.body?.messageText === "string"
      ? req.body.messageText.trim()
      : "";

  if (!Number.isSafeInteger(connectionId) || connectionId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid connection ID",
    });
  }

  if (!messageText || messageText.length > 4000) {
    return res.status(400).json({
      success: false,
      message: "Message must contain 1–4000 characters",
    });
  }

  try {
    const [access] = await db.execute(
      `SELECT id
       FROM connections
       WHERE id = ?
         AND college_id = ?
         AND status = 'accepted'
         AND (requester_id = ? OR recipient_id = ?)
       LIMIT 1`,
      [
        connectionId,
        context.collegeId,
        context.userId,
        context.userId,
      ]
    );

    if (access.length === 0) {
      return res.status(403).json({
        success: false,
        message: "An accepted connection is required to send messages",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO messages (connection_id, sender_id, message_text)
       VALUES (?, ?, ?)`,
      [connectionId, context.userId, messageText]
    );

    const [savedRows] = await db.execute(
      `SELECT
         id,
         connection_id AS connectionId,
         sender_id AS senderId,
         message_text AS messageText,
         created_at AS createdAt
       FROM messages
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    const message = savedRows[0] || {
      id: result.insertId,
      connectionId,
      senderId: context.userId,
      messageText,
    };

    const io = req.app.get("io");
    if (io) {
      io.to(`chat:${connectionId}`).emit("new_message", message);
    }

    return res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send message",
    });
  }
});

/**
 * Send a connection request only after a verified exchange.
 * Body: { "recipientId": 123 }
 */
router.post("/connections/request", async (req, res) => {
  const context = getUserContext(req);

  if (!context) {
    return res.status(401).json({
      success: false,
      message: "Valid user and college context required",
    });
  }

  const recipientId = Number(req.body?.recipientId);

  if (
    !Number.isSafeInteger(recipientId) ||
    recipientId <= 0 ||
    recipientId === context.userId
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid, different recipient is required",
    });
  }

  try {
    // Both users must belong to the active college.
    const [users] = await db.execute(
      `SELECT id
       FROM users
       WHERE id IN (?, ?)
         AND college_id = ?
       LIMIT 2`,
      [context.userId, recipientId, context.collegeId]
    );

    if (users.length !== 2) {
      return res.status(404).json({
        success: false,
        message: "Both users must belong to your college",
      });
    }

    // Check for a completed task with a matching successful payment.
   const [taskExchanges] = await db.execute(
  `SELECT t.id
   FROM tasks t
   JOIN acceptances a
     ON a.task_id = t.id
   JOIN payments p
     ON p.task_id = t.id
    AND p.status = 'paid'
    AND p.payer_id = t.user_id
    AND p.receiver_id = a.helper_id
   WHERE t.college_id = ?
     AND t.status = 'completed'
     AND a.status = 'accepted'
     AND a.payment_status = 'paid'
     AND (
       (t.user_id = ? AND a.helper_id = ?)
       OR
       (t.user_id = ? AND a.helper_id = ?)
     )
   LIMIT 1`,
  [
    context.collegeId,
    context.userId,
    recipientId,
    recipientId,
    context.userId,
  ]
);

    // A resource exchange qualifies only after the borrower returned it.
    const [resourceExchanges] = await db.execute(
      `SELECT reh.id
       FROM resource_exchange_history reh
       WHERE reh.college_id = ?
         AND reh.returned_at IS NOT NULL
         AND (
           (reh.owner_id = ? AND reh.borrower_id = ?)
           OR
           (reh.owner_id = ? AND reh.borrower_id = ?)
         )
       LIMIT 1`,
      [
        context.collegeId,
        context.userId,
        recipientId,
        recipientId,
        context.userId,
      ]
    );



    if (
      taskExchanges.length === 0 &&
      resourceExchanges.length === 0
    ) {
      return res.status(403).json({
        success: false,
        eligible: false,
        message:
          "A completed task exchange or a returned resource exchange is required before connecting",
      });
    }

    // Check both directions to prevent duplicate connection pairs.
    const [existing] = await db.execute(
      `SELECT id, status
       FROM connections
       WHERE college_id = ?
         AND (
           (requester_id = ? AND recipient_id = ?)
           OR
           (requester_id = ? AND recipient_id = ?)
         )
       LIMIT 1`,
      [
        context.collegeId,
        context.userId,
        recipientId,
        recipientId,
        context.userId,
      ]
    );

    if (existing.length > 0) {
      const connection = existing[0];

      if (connection.status === "accepted") {
        return res.status(409).json({
          success: false,
          message: "You are already connected",
          connectionId: connection.id,
        });
      }

      if (connection.status === "pending") {
        return res.status(409).json({
          success: false,
          message: "A connection request is already pending",
          connectionId: connection.id,
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "A previous request exists for this pair. Resolve it before requesting again.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO connections
         (requester_id, recipient_id, college_id, status)
       VALUES (?, ?, ?, 'pending')`,
      [context.userId, recipientId, context.collegeId]
    );

    return res.status(201).json({
      success: true,
      message: "Connection request sent",
      connectionId: result.insertId,
      status: "pending",
    });
  } catch (error) {
    console.error("Create connection request error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send connection request",
    });
  }
});


module.exports = router;