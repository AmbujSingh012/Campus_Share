const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const cloudinary = require("../cloudinary");

const router = express.Router();

// =====================================================
// IMAGE UPLOAD CONFIGURATION - CLOUDINARY
// =====================================================

const storage = multer.memoryStorage();

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
      cb(
        new Error("Only JPG and PNG images are allowed")
      );
    }
  },
});

// =====================================================
// UPLOAD IMAGE TO CLOUDINARY
// =====================================================

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "campusshare/resources",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

// =====================================================
// ALL RESOURCE APIs REQUIRE AUTHENTICATION
// =====================================================

router.use(authenticateToken);

// =====================================================
// ACTIVE COLLEGE HELPER
// =====================================================

function getActiveCollegeId(req) {
  const collegeId = Number(req.user?.collegeId);

  if (
    !Number.isInteger(collegeId) ||
    collegeId <= 0
  ) {
    return null;
  }

  return collegeId;
}

// =====================================================
// GET ALL RESOURCES
// Only resources from ACTIVE COLLEGE
// =====================================================

router.get("/", async (req, res) => {
  try {
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

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
        AND LOWER(
          COALESCE(r.availability, '')
        ) IN ('available', 'borrowed')

      ORDER BY r.created_at DESC
      `,
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
// Only resources created by current user
// AND belonging to ACTIVE COLLEGE
// =====================================================

router.get("/my", async (req, res) => {
  try {
    const userId = req.user.userId;
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

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
        AND r.college_id = ?

      ORDER BY r.created_at DESC
      `,
      [userId, collegeId]
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
      message:
        "Server error while fetching your resources",
    });
  }
});

// =====================================================
// GET BORROWED RESOURCES
// Only borrowed resources from ACTIVE COLLEGE
// =====================================================

router.get("/borrowed", async (req, res) => {
  try {
    const borrowerId = req.user.userId;
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

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
        AND r.college_id = ?
        AND LOWER(
          COALESCE(r.availability, '')
        ) = 'borrowed'

      ORDER BY r.borrowed_at DESC
      `,
      [borrowerId, collegeId]
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
// Owner or previous borrower
// ONLY FROM ACTIVE COLLEGE
// =====================================================

router.get("/returned", async (req, res) => {
  try {
    const userId = req.user.userId;
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

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

      WHERE LOWER(
          COALESCE(r.availability, '')
        ) = 'returned'

        AND r.college_id = ?

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
      [
        userId,
        collegeId,
        userId,
        userId,
      ]
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
// ONLY ACTIVE COLLEGE
// =====================================================

router.get("/available", async (req, res) => {
  try {
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

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

        borrower.name AS borrowedBy,
        borrower.email AS borrowerEmail,
        borrower.mobile AS borrowerMobile

      FROM resources r

      JOIN users owner
        ON r.user_id = owner.id

      LEFT JOIN users borrower
        ON r.borrowed_by = borrower.id

      WHERE r.college_id = ?
        AND LOWER(
          COALESCE(r.availability, '')
        ) = 'available'

      ORDER BY r.created_at DESC
      `,
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
// ONLY ACTIVE COLLEGE
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

    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

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

        borrower.name AS borrowedBy,
        borrower.email AS borrowerEmail,
        borrower.mobile AS borrowerMobile

      FROM resources r

      JOIN users owner
        ON r.user_id = owner.id

      LEFT JOIN users borrower
        ON r.borrowed_by = borrower.id

      WHERE r.id = ?
        AND r.college_id = ?
      `,
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
      message:
        "Server error while fetching resource",
    });
  }
});

// =====================================================
// CREATE RESOURCE
// Resource belongs to ACTIVE COLLEGE
// =====================================================

router.post(
  "/",
  upload.single("image"),
  async (req, res) => {
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
      const collegeId = getActiveCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message: "No active college selected",
        });
      }

      const [users] = await db.execute(
        `
        SELECT
          id,
          name,
          email,
          mobile
        FROM users
        WHERE id = ?
        `,
        [userId]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Authenticated user not found",
        });
      }

      const user = users[0];

 let imageUrl = null;

if (req.file) {
  const uploadedImage = await uploadToCloudinary(
    req.file.buffer
  );

  imageUrl = uploadedImage.secure_url;
}

console.log("RESOURCE IMAGE:", imageUrl);

      const [result] = await db.execute(
        `
        INSERT INTO resources
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user.id,
          title.trim(),
          description || "",
          category.trim(),
          location ? location.trim() : null,
          availability || "Available",
          Number(borrowingFee || 0),
          collegeId,
          imageUrl,
        ]
      );

      const [newResource] = await db.execute(
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

          borrower.name AS borrowedBy,
          borrower.email AS borrowerEmail,
          borrower.mobile AS borrowerMobile

        FROM resources r

        JOIN users owner
          ON r.user_id = owner.id

        LEFT JOIN users borrower
          ON r.borrowed_by = borrower.id

        WHERE r.id = ?
          AND r.college_id = ?
        `,
        [result.insertId, collegeId]
      );

      res.status(201).json({
        success: true,
        message: "Resource created successfully",
        resource: newResource[0],
      });
    } catch (error) {
      console.error(
        "Create resource error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while creating resource",
      });
    }
  }
);

// =====================================================
// BORROW RESOURCE
// ONLY ACTIVE COLLEGE
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
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

    // IMPORTANT:
    // The resource MUST belong to the active college.
    // We check college_id directly in SQL.
    const [resources] = await db.execute(
      `
      SELECT
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

      WHERE r.id = ?
        AND r.college_id = ?
      `,
      [resourceId, collegeId]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Resource not found in your college",
      });
    }

    const resource = resources[0];

    const [borrowerUsers] = await db.execute(
      `
      SELECT
        id,
        name,
        email
      FROM users
      WHERE id = ?
      `,
      [borrowerId]
    );

    if (borrowerUsers.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Borrower account not found",
      });
    }

    // Owner cannot borrow their own resource
    if (
      Number(resource.user_id) ===
      Number(borrowerId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot borrow your own resource",
      });
    }

    const [result] = await db.execute(
      `
      UPDATE resources
      SET
        availability = 'Borrowed',
        borrowed_by = ?,
        borrowed_at = NOW()

      WHERE id = ?
        AND college_id = ?
        AND LOWER(
          COALESCE(availability, '')
        ) = 'available'
        AND borrowed_by IS NULL
      `,
      [
        borrowerId,
        resourceId,
        collegeId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message:
          "This resource has already been borrowed or is unavailable",
      });
    }

    const [borrowedResource] =
      await db.execute(
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

          borrower.name AS borrowedBy,
          borrower.email AS borrowerEmail,
          borrower.mobile AS borrowerMobile

        FROM resources r

        JOIN users owner
          ON r.user_id = owner.id

        LEFT JOIN users borrower
          ON r.borrowed_by = borrower.id

        WHERE r.id = ?
          AND r.college_id = ?
        `,
        [resourceId, collegeId]
      );

    res.json({
      success: true,
      message: "Resource borrowed successfully",
      resource: borrowedResource[0],
    });
  } catch (error) {
    console.error(
      "Borrow resource error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while borrowing resource",
    });
  }
});

// =====================================================
// RETURN RESOURCE
// ONLY ACTIVE COLLEGE
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
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

    // IMPORTANT:
    // Resource must belong to ACTIVE COLLEGE.
    const [resources] = await db.execute(
      `
      SELECT
        id,
        user_id AS owner_id,
        borrowed_by,
        availability,
        college_id

      FROM resources

      WHERE id = ?
        AND college_id = ?

      LIMIT 1
      `,
      [resourceId, collegeId]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Resource not found in your college",
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

    // Borrowed -> Returned
    const [result] = await db.execute(
      `
      UPDATE resources

      SET
        availability = 'Returned',
        borrowed_by = NULL,
        borrowed_at = NULL

      WHERE id = ?
        AND college_id = ?
        AND borrowed_by = ?
        AND LOWER(
          COALESCE(availability, '')
        ) = 'borrowed'
      `,
      [
        resourceId,
        collegeId,
        borrowerId,
      ]
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
      message:
        "Resource returned successfully",

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
// ONLY OWNER + ACTIVE COLLEGE
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
        message:
          "Title and category are required",
      });
    }

    const userId = req.user.userId;
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

    const [result] = await db.execute(
      `
      UPDATE resources

      SET
        title = ?,
        description = ?,
        category = ?,
        availability = ?

      WHERE id = ?
        AND user_id = ?
        AND college_id = ?
      `,
      [
        title.trim(),
        description || "",
        category.trim(),
        availability || null,
        id,
        userId,
        collegeId,
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
      message:
        "Resource updated successfully",
    });
  } catch (error) {
    console.error(
      "Update resource error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while updating resource",
    });
  }
});

// =====================================================
// DELETE RESOURCE
// ONLY OWNER + ACTIVE COLLEGE
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
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

    const [result] = await db.execute(
      `
      DELETE FROM resources

      WHERE id = ?
        AND user_id = ?
        AND college_id = ?
      `,
      [
        id,
        userId,
        collegeId,
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
      message:
        "Resource deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete resource error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while deleting resource",
    });
  }
});

module.exports = router;