const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/colleges
// Supports:
//   ?search=kanpur
//   ?page=1
//   ?limit=20
//
// Examples:
//   /api/colleges
//   /api/colleges?search=IIT
//   /api/colleges?search=Kanpur&page=2&limit=20

router.get("/", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (!Number.isInteger(page) || page < 1) {
      page = 1;
    }

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 20;
    }

    // Prevent extremely large requests
    if (limit > 100) {
      limit = 100;
    }

    const offset = (page - 1) * limit;

    let whereClause = "";
    let queryParams = [];
    let countParams = [];

    if (search) {
      whereClause = `
        WHERE name LIKE ?
           OR city LIKE ?
           OR state LIKE ?
           OR aishe_code LIKE ?
           OR university_name LIKE ?
      `;

      const searchValue = `%${search}%`;

      queryParams = [
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
      ];

      countParams = [...queryParams];
    }

    const [countRows] = await db.execute(
      `
      SELECT COUNT(*) AS total
      FROM colleges
      ${whereClause}
      `,
      countParams
    );

    const total = countRows[0].total;

    const [colleges] = await db.execute(
      `
      SELECT
        id,
        aishe_code,
        name,
        email_domain,
        city,
        state,
        website,
        year_of_establishment,
        location,
        college_type,
        management,
        university_aishe_code,
        university_name,
        university_type,
        institution_type
      FROM colleges
      ${whereClause}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
      `,
      queryParams
    );

    return res.json({
      success: true,
      colleges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("College fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load colleges",
    });
  }
});

module.exports = router;
