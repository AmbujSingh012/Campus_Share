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
// Only resources from logged-in user's college
// Includes OWNER + BORROWER details
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
// Includes OWNER + BORROWER details
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
// GET AVAILABLE RESOURCES
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
    console.error("Available resources error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching available resources",
    });
  }
});

// =====================================================
// GET RESOURCE BY ID
// Includes OWNER + BORROWER details
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
         college_id,
         image_url
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        title.trim(),
        description || "",
        category.trim(),
        location ? location.trim() : null,
        availability || "Available",
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
      Number(borrower.college_id) !== Number(resource.college_id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only borrow resources from your college",
      });
    }

    // Owner cannot borrow their own resource
    if (Number(resource.user_id) === Number(borrowerId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot borrow your own resource",
      });
    }

    // Atomic update:
    // Only the first student can successfully borrow it.
    const [result] = await db.execute(
      `UPDATE resources
       SET availability = 'Borrowed',
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