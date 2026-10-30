
const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const path = require("path");

const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const cloudinary = require("../cloudinary");

const router = express.Router();

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "application/pdf",
    ]);

    const allowedExtensions = new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf",
    ]);

    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedTypes.has(file.mimetype) ||
      !allowedExtensions.has(extension)
    ) {
      return cb(
        new Error("Only JPG, PNG, and PDF files are allowed.")
      );
    }

    cb(null, true);
  },
});



function uploadChatAttachment(file) {
  return new Promise((resolve, reject) => {
    const isImage =
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "campusshare/chat-attachments",
        resource_type: isImage ? "image" : "raw",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
}


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

router.get(
  "/connections/:id/messages/:messageId/attachment",
  async (req, res) => {
    const context = getUserContext(req);
    const connectionId = Number(req.params.id);
    const messageId = Number(req.params.messageId);

    if (
      !context ||
      !Number.isSafeInteger(connectionId) ||
      connectionId <= 0 ||
      !Number.isSafeInteger(messageId) ||
      messageId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid download request",
      });
    }

    try {
      const [rows] = await db.execute(
        `SELECT
           m.attachment_url AS attachmentUrl,
           m.attachment_name AS attachmentName,
           m.attachment_type AS attachmentType
         FROM messages m
         JOIN connections c ON c.id = m.connection_id
         WHERE m.id = ?
           AND c.id = ?
           AND c.college_id = ?
           AND c.status = 'accepted'
           AND (c.requester_id = ? OR c.recipient_id = ?)
         LIMIT 1`,
        [
          messageId,
          connectionId,
          context.collegeId,
          context.userId,
          context.userId,
        ]
      );

      if (!rows.length || !rows[0].attachmentUrl) {
        return res.status(404).json({
          success: false,
          message: "Attachment not found",
        });
      }

      const attachment = rows[0];
      const fileUrl = new URL(attachment.attachmentUrl);

      // Only allow files hosted on your configured Cloudinary domain.
      if (
        fileUrl.protocol !== "https:" ||
        fileUrl.hostname !== "res.cloudinary.com" ||
        !fileUrl.pathname.startsWith(
          `/${process.env.CLOUDINARY_CLOUD_NAME}/`
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid attachment source",
        });
      }

      const upstream = await fetch(fileUrl, {
        signal: AbortSignal.timeout(30000),
      });

      if (!upstream.ok || !upstream.body) {
        console.error("Cloudinary download failed:", upstream.status);
        return res.status(502).json({
          success: false,
          message: "Unable to retrieve the attachment",
        });
      }

      const safeName = path
        .basename(attachment.attachmentName || "Shared document")
        .replace(/[\r\n"]/g, "_");

      const isPdf = attachment.attachmentType === "application/pdf";

      res.setHeader(
        "Content-Type",
        isPdf ? "application/pdf" : attachment.attachmentType
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}"`
      );
      res.setHeader("X-Content-Type-Options", "nosniff");

      const { Readable } = require("stream");
      Readable.fromWeb(upstream.body).pipe(res);
    } catch (error) {
      console.error("Attachment download error:", error);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: "Unable to download attachment",
        });
      }

      res.destroy(error);
    }
  }
);
// Load message history for an accepted connection.
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
        message: "An accepted connection is required to view messages",
      });
    }

    const [rows] = await db.execute(
      `SELECT
         id,
         connection_id AS connectionId,
         sender_id AS senderId,
         message_text AS messageText,
         created_at AS createdAt,
         attachment_url AS attachmentUrl,
         attachment_name AS attachmentName,
         attachment_type AS attachmentType,
         attachment_size AS attachmentSize
       FROM messages
       WHERE connection_id = ?
       ORDER BY created_at ASC, id ASC`,
      [connectionId]
    );

    return res.json({
      success: true,
      messages: rows,
    });
  } catch (error) {
    console.error("Load chat messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load messages",
    });
  }
});

// Send a message only to an accepted connection.

router.post(
  "/connections/:id/messages",
  (req, res, next) => {
    chatUpload.single("attachment")(req, res, (error) => {
      if (!error) return next();

      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "File size must be 5 MB or less."
          : error.message || "Unable to upload attachment.";

      return res.status(400).json({ success: false, message });
    });
  },
  async (req, res) => {
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
    const file = req.file;

    if (!Number.isSafeInteger(connectionId) || connectionId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID",
      });
    }

    if (!messageText && !file) {
      return res.status(400).json({
        success: false,
        message: "Write a message or attach a file.",
      });
    }

    if (messageText.length > 4000) {
      return res.status(400).json({
        success: false,
        message: "Message must contain at most 4000 characters.",
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

      let attachmentUrl = null;
      let attachmentName = null;
      let attachmentType = null;
      let attachmentSize = null;

      if (file) {
        const uploaded = await uploadChatAttachment(file);

        attachmentUrl = uploaded.secure_url;
        attachmentName = path.basename(file.originalname).slice(0, 255);
        attachmentType = file.mimetype;
        attachmentSize = file.size;
      }

      const [result] = await db.execute(
        `INSERT INTO messages (
           connection_id,
           sender_id,
           message_text,
           attachment_url,
           attachment_name,
           attachment_type,
           attachment_size
         )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          connectionId,
          context.userId,
          messageText,
          attachmentUrl,
          attachmentName,
          attachmentType,
          attachmentSize,
        ]
      );

      const [savedRows] = await db.execute(
        `SELECT
           id,
           connection_id AS connectionId,
           sender_id AS senderId,
           message_text AS messageText,
           created_at AS createdAt,
           attachment_url AS attachmentUrl,
           attachment_name AS attachmentName,
           attachment_type AS attachmentType,
           attachment_size AS attachmentSize
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
        attachmentUrl,
        attachmentName,
        attachmentType,
        attachmentSize,
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
  }
);


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

// A task owner or accepted helper can connect
// as soon as the task is accepted.

const [taskExchanges] = await db.execute(
  `
  SELECT t.id
  FROM tasks t
  JOIN acceptances a
    ON a.task_id = t.id
  WHERE t.college_id = ?
    AND a.status = 'accepted'
    AND (
      (t.user_id = ? AND a.helper_id = ?)
      OR
      (t.user_id = ? AND a.helper_id = ?)
    )
  LIMIT 1
  `,
  [
    context.collegeId,
    context.userId,
    recipientId,
    recipientId,
    context.userId,
  ]
);

    // A resource exchange qualifies only after the borrower returned it.
 // Resource owner and borrower can connect
// immediately after borrowing.

const [resourceExchanges] = await db.execute(
  `
  SELECT reh.id
  FROM resource_exchange_history reh
  WHERE reh.college_id = ?
    AND (
      (reh.owner_id = ? AND reh.borrower_id = ?)
      OR
      (reh.owner_id = ? AND reh.borrower_id = ?)
    )
  LIMIT 1
  `,
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

 const userLow = Math.min(context.userId, recipientId);
const userHigh = Math.max(context.userId, recipientId);

const [result] = await db.execute(
  `INSERT INTO connections
     (requester_id, recipient_id, college_id, user_low, user_high, status)
   VALUES (?, ?, ?, ?, ?, 'pending')`,
  [
    context.userId,
    recipientId,
    context.collegeId,
    userLow,
    userHigh,
  ]
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
