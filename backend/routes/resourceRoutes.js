
const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// IMAGE UPLOAD CONFIGURATION
// =====================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/resources");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG and PNG images are allowed"));
    }
  },
});

// =====================================================
// ALL RESOURCE APIs REQUIRE AUTHENTICATION
// =====================================================

router.use(authenticateToken);

// =====================================================
// GET ALL RESOURCES
// Only Available and Borrowed resources are shown
// Returned resources are NOT shown on marketplace
// =====================================================

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
        r.location,
        r.availability,
        r.borrowing_fee,
        r.college_id,
        r.image_url,
        r.created_at,
        r.borrowed_by,
        r.borrowed_at,

        owner.name AS postedBy,
        owner.email AS ownerEmail,
        owner.mobile AS ownerMobile,

        COALESCE((
          SELECT ROUND(AVG(rt.rating), 1)
          FROM ratings rt
          WHERE rt.rated_user_id = r.user_id
        ), 0) AS averageRating,

        borrower.name AS borrowedBy,
        borrower.email AS borrowerEmail,
        borrower.mobile AS borrowerMobile

       FROM resources r

       JOIN users owner
         ON r.user_id = owner.id

       LEFT JOIN users borrower
         ON r.borrowed_by = borrower.id

       WHERE r.college_id = ?
         AND LOWER(COALESCE(r.availability, '')) IN ('available', 'borrowed')

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

// =====================================================
// GET MY RESOURCES
// Includes Returned resources
// Owner can see resources after they are returned
// =====================================================

router.get("/my", async (req, res) => {
  try {
    const userId = req.user.userId;

    const [resources] = await db.execute(
      `SELECT
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.category,
        r.location,
        r.availability,
        r.borrowing_fee,
        r.college_id,
        r.image_url,
        r.created_at,
        r.borrowed_by,
        r.borrowed_at,

        owner.name AS postedBy,
        owner.email AS ownerEmail,
        owner.mobile AS ownerMobile,

        COALESCE((
          SELECT ROUND(AVG(rt.rating), 1)
          FROM ratings rt
          WHERE rt.rated_user_id = r.user_id
        ), 0) AS averageRating,

        borrower.name AS borrowedBy,
        borrower.email AS borrowerEmail,
        borrower.mobile AS borrowerMobile

       FROM resources r

       JOIN users owner
         ON r.user_id = owner.id

       LEFT JOIN users borrower
         ON r.borrowed_by = borrower.id

       WHERE r.user_id = ?

       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error("Get my resources error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching your resources",
    });
  }
});

// =====================================================
// GET BORROWED RESOURCES
// Resources currently borrowed by logged-in user
// =====================================================

router.get("/borrowed", async (req, res) => {
  try {
    const borrowerId = req.user.userId;

    const [resources] = await db.execute(
      `
      SELECT
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.category,
        r.location,
        r.availability,
        r.borrowing_fee,
        r.college_id,
        r.image_url,
        r.created_at,
        r.borrowed_by,
        r.borrowed_at,

        owner.name AS postedBy,
        owner.email AS ownerEmail,
        owner.mobile AS ownerMobile,

        COALESCE((
          SELECT ROUND(AVG(rt.rating), 1)
          FROM ratings rt
          WHERE rt.rated_user_id = r.user_id
        ), 0) AS averageRating

      FROM resources r

      JOIN users owner
        ON r.user_id = owner.id

      WHERE r.borrowed_by = ?
        AND LOWER(COALESCE(r.availability, '')) = 'borrowed'

      ORDER BY r.borrowed_at DESC
      `,
      [borrowerId]
    );

    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error(
      "Get borrowed resources error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching borrowed resources",
    });
  }
});

// =====================================================
// GET RETURNED RESOURCES
//
// Returned resources are visible to:
// 1. Owner
// 2. Previous borrower
//
// This is where both users can rate each other.
// =====================================================

router.get("/returned", async (req, res) => {
  try {
    const userId = req.user.userId;

    const [resources] = await db.execute(
      `
      SELECT
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.category,
        r.location,
        r.availability,
        r.borrowing_fee,
        r.college_id,
        r.image_url,
        r.created_at,
        r.borrowed_by,
        r.borrowed_at,

        owner.name AS ownerName,
        owner.email AS ownerEmail,
        owner.mobile AS ownerMobile,

        p.payer_id AS borrowerId,

        borrower.name AS borrowerName,
        borrower.email AS borrowerEmail,
        borrower.mobile AS borrowerMobile,

        p.receiver_id AS ownerId,

        p.amount AS paymentAmount,
        p.transaction_id AS paymentTransactionId,
        p.paid_at,

        COALESCE((
          SELECT ROUND(AVG(rt.rating), 1)
          FROM ratings rt
          WHERE rt.rated_user_id = r.user_id
        ), 0) AS averageRating,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM ratings rt
            WHERE rt.resource_id = r.id
              AND rt.rater_id = ?
          )
          THEN 1
          ELSE 0
        END AS alreadyRated

      FROM resources r

      JOIN payments p
        ON p.resource_id = r.id
       AND p.status = 'paid'

      JOIN users owner
        ON owner.id = r.user_id

      JOIN users borrower
        ON borrower.id = p.payer_id

      WHERE
        LOWER(COALESCE(r.availability, '')) = 'returned'

        AND (
          r.user_id = ?
          OR p.payer_id = ?
        )

        AND p.id = (
          SELECT MAX(p2.id)
          FROM payments p2
          WHERE p2.resource_id = r.id
            AND p2.status = 'paid'
        )

      ORDER BY p.paid_at DESC
      `,
      [userId, userId, userId]
    );

    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error(
      "Get returned resources error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching returned resources",
    });
  }
});

// =====================================================
// GET AVAILABLE RESOURCES
// Only genuinely Available resources are shown
// Returned resources are NOT included
// =====================================================

router.get("/available", async (req, res) => {
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
        r.location,
        r.availability,
        r.borrowing_fee,
        r.college_id,
        r.image_url,
        r.created_at,
        r.borrowed_by,
        r.borrowed_at,

        owner.name AS postedBy,
        owner.email AS ownerEmail,
        owner.mobile AS ownerMobile,

        borrower.name AS borrowedBy,
        borrower.email AS borrowerEmail,
        borrower.mobile AS borrowerMobile

       FROM resources r

       JOIN users owner
         ON r.user_id = owner.id

       LEFT JOIN users borrower
         ON r.borrowed_by = borrower.id

       WHERE r.college_id = ?
         AND LOWER(COALESCE(r.availability, '')) = 'available'

       ORDER BY r.created_at DESC`,
      [collegeId]
    );

    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error(
      "Available resources error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching available resources",
    });
  }
});

// =====================================================
// GET RESOURCE BY ID
// =====================================================

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
        r.location,
        r.availability,
        r.borrowing_fee,
        r.college_id,
        r.image_url,
        r.created_at,
        r.borrowed_by,
        r.borrowed_at,

        owner.name AS postedBy,
        owner.email AS ownerEmail,
        owner.mobile AS ownerMobile,

        borrower.name AS borrowedBy,
        borrower.email AS borrowerEmail,
        borrower.mobile AS borrowerMobile

       FROM resources r

       JOIN users owner
         ON r.user_id = owner.id

       LEFT JOIN users borrower
         ON r.borrowed_by = borrower.id

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

// =====================================================
// CREATE RESOURCE
// WITH IMAGE UPLOAD
//
// Every new post creates a NEW resource listing.
// This is how an owner can post the same physical item
// again after it has been returned.
// =====================================================

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      availability,
      location,
      condition,
      borrowingFee,
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: "Title and category are required",
      });
    }

    const userId = req.user.userId;

    const [users] = await db.execute(
      "SELECT id, name, email, college_id FROM users WHERE id = ?",
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

    // Save image path
    const imageUrl = req.file
      ? `/uploads/resources/${req.file.filename}`
      : null;

    console.log("RESOURCE IMAGE:", imageUrl);

    const [result] = await db.execute(
      `INSERT INTO resources
       (
         user_id,
         title,
         description,
         category,
         location,
         availability,
         borrowing_fee,
         college_id,
         image_url
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        title.trim(),
        description || "",
        category.trim(),
        location ? location.trim() : null,

        // Every newly posted resource starts as Available
        availability || "Available",

        Number(borrowingFee || 0),
        collegeId,
        imageUrl,
      ]
    );

    const [newResource] = await db.execute(
      `SELECT
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.category,
        r.location,
        r.availability,
        r.borrowing_fee,
        r.college_id,
        r.image_url,
        r.created_at,
        r.borrowed_by,
        r.borrowed_at,

        owner.name AS postedBy,
        owner.email AS ownerEmail,
        owner.mobile AS ownerMobile,

        borrower.name AS borrowedBy,
        borrower.email AS borrowerEmail,
        borrower.mobile AS borrowerMobile

       FROM resources r

       JOIN users owner
         ON r.user_id = owner.id

       LEFT JOIN users borrower
         ON r.borrowed_by = borrower.id

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

// =====================================================
// BORROW RESOURCE
// Logged-in student borrows another student's resource
// =====================================================

router.post("/:id/borrow", async (req, res) => {
  try {
    const resourceId = Number(req.params.id);

    if (!Number.isInteger(resourceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID",
      });
    }

    const borrowerId = req.user.userId;

    // Get resource and owner
    const [resources] = await db.execute(
      `SELECT
        r.id,
        r.user_id,
        r.title,
        r.location,
        r.availability,
        r.borrowed_by,
        r.college_id,

        owner.name AS postedBy,
        owner.email AS ownerEmail,
        owner.mobile AS ownerMobile

       FROM resources r

       JOIN users owner
         ON r.user_id = owner.id

       WHERE r.id = ?`,
      [resourceId]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    const resource = resources[0];

    // Make sure borrower belongs to same college
    const [borrowerUsers] = await db.execute(
      "SELECT id, name, email, college_id FROM users WHERE id = ?",
      [borrowerId]
    );

    if (borrowerUsers.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Borrower account not found",
      });
    }

    const borrower = borrowerUsers[0];

    if (
      !borrower.college_id ||
      Number(borrower.college_id) !==
        Number(resource.college_id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only borrow resources from your college",
      });
    }

    // Owner cannot borrow their own resource
    if (Number(resource.user_id) === Number(borrowerId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot borrow your own resource",
      });
    }

    // Only Available resources can be borrowed.
    // Returned resources cannot be borrowed until the owner
    // creates a new post.
    const [result] = await db.execute(
      `UPDATE resources
       SET
         availability = 'Borrowed',
         borrowed_by = ?,
         borrowed_at = NOW()
       WHERE id = ?
         AND LOWER(COALESCE(availability, '')) = 'available'
         AND borrowed_by IS NULL`,
      [borrowerId, resourceId]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message:
          "This resource has already been borrowed or is unavailable",
      });
    }

    // Get complete resource information
    const [borrowedResource] = await db.execute(
      `SELECT
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.category,
        r.location,
        r.availability,
        r.borrowing_fee,
        r.college_id,
        r.image_url,
        r.created_at,
        r.borrowed_by,
        r.borrowed_at,

        owner.name AS postedBy,
        owner.email AS ownerEmail,
        owner.mobile AS ownerMobile,

        borrower.name AS borrowedBy,
        borrower.email AS borrowerEmail,
        borrower.mobile AS borrowerMobile

       FROM resources r

       JOIN users owner
         ON r.user_id = owner.id

       LEFT JOIN users borrower
         ON r.borrowed_by = borrower.id

       WHERE r.id = ?`,
      [resourceId]
    );

    res.json({
      success: true,
      message: "Resource borrowed successfully",
      resource: borrowedResource[0],
    });
  } catch (error) {
    console.error("Borrow resource error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while borrowing resource",
    });
  }
});

// =====================================================
// RETURN RESOURCE
//
// Borrower returns the resource.
//
// IMPORTANT:
// Borrowed -> Returned
//
// NOT:
// Borrowed -> Available
//
// The owner must create a NEW POST if they want to make
// the same item available for borrowing again.
// =====================================================

router.put("/:id/return", async (req, res) => {
  try {
    const resourceId = Number(req.params.id);

    if (!Number.isInteger(resourceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID",
      });
    }

    const borrowerId = req.user.userId;

    // Make sure this user is the current borrower
    const [resources] = await db.execute(
      `
      SELECT
        id,
        user_id AS owner_id,
        borrowed_by,
        availability
      FROM resources
      WHERE id = ?
      LIMIT 1
      `,
      [resourceId]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    const resource = resources[0];

    if (
      Number(resource.borrowed_by) !==
      Number(borrowerId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the current borrower can return this resource",
      });
    }

    if (
      String(resource.availability).toLowerCase() !==
      "borrowed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This resource is not currently borrowed",
      });
    }

    // =================================================
    // RETURN THE RESOURCE
    //
    // IMPORTANT:
    // availability = Returned
    //
    // This prevents the old listing from automatically
    // appearing on the marketplace again.
    // =================================================

    const [result] = await db.execute(
      `
      UPDATE resources
      SET
        availability = 'Returned',
        borrowed_by = NULL,
        borrowed_at = NULL
      WHERE id = ?
        AND borrowed_by = ?
        AND LOWER(COALESCE(availability, '')) = 'borrowed'
      `,
      [resourceId, borrowerId]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message:
          "Resource was already returned or its status changed",
      });
    }

    res.json({
      success: true,
      message: "Resource returned successfully",
      resource: {
        id: resourceId,
        status: "Returned",
        availability: "Returned",
        owner_id: resource.owner_id,
        borrower_id: borrowerId,
      },
    });
  } catch (error) {
    console.error(
      "Return resource error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while returning resource",
    });
  }
});

// =====================================================
// UPDATE RESOURCE
// User can update only their own resource
// =====================================================

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
       SET
         title = ?,
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
        message:
          "Resource not found or you are not the owner",
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
      message:
        "Server error while updating resource",
    });
  }
});

// =====================================================
// DELETE RESOURCE
// User can delete only their own resource
// =====================================================

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
        message:
          "Resource not found or you are not the owner",
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
      message:
        "Server error while deleting resource",
    });
  }
});

module.exports = router;