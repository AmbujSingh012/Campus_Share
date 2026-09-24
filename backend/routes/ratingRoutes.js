
const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

// =====================================================
// CREATE RATING
// Works for both tasks and resources
// =====================================================

router.post("/", async (req, res) => {
  try {
    const raterId = Number(req.user.userId);

    const {
      task_id,
      resource_id,
      rating,
      comment,
    } = req.body;

    const taskId =
      task_id !== undefined &&
      task_id !== null &&
      task_id !== ""
        ? Number(task_id)
        : null;

    const resourceId =
      resource_id !== undefined &&
      resource_id !== null &&
      resource_id !== ""
        ? Number(resource_id)
        : null;

    const numericRating = Number(rating);

    // =================================================
    // MUST RATE EITHER A TASK OR A RESOURCE
    // =================================================

    if (
      (taskId === null && resourceId === null) ||
      (taskId !== null && resourceId !== null)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide either task_id or resource_id",
      });
    }

    // =================================================
    // VALIDATE ID
    // =================================================

    if (
      (taskId !== null &&
        !Number.isInteger(taskId)) ||
      (resourceId !== null &&
        !Number.isInteger(resourceId))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid task or resource ID",
      });
    }

    // =================================================
    // VALIDATE RATING
    // =================================================

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rating must be a whole number from 1 to 5",
      });
    }

    const cleanComment =
      typeof comment === "string"
        ? comment.trim()
        : "";

    // =================================================
    // TASK RATING
    // =================================================

    if (taskId !== null) {
      const [tasks] = await db.execute(
        `
        SELECT
          t.id,
          t.user_id AS owner_id,
          t.status,
          a.helper_id,
          a.status AS acceptance_status

        FROM tasks t

        LEFT JOIN acceptances a
          ON a.task_id = t.id
         AND a.status = 'accepted'

        WHERE t.id = ?

        LIMIT 1
        `,
        [taskId]
      );

      if (tasks.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      const task = tasks[0];

      // =================================================
      // TASK MUST BE COMPLETED
      // =================================================

      if (
        String(task.status).toLowerCase() !==
        "completed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Task can be rated only after it is completed",
        });
      }

      const ownerId = Number(task.owner_id);
      const helperId = Number(task.helper_id);

      // =================================================
      // MUST HAVE ACCEPTED HELPER
      // =================================================

      if (
        !helperId ||
        String(task.acceptance_status).toLowerCase() !==
          "accepted"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This task does not have a valid accepted helper",
        });
      }

      // =================================================
      // ONLY OWNER OR HELPER CAN RATE
      // =================================================

      if (
        raterId !== ownerId &&
        raterId !== helperId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not part of this task",
        });
      }

      // =================================================
      // DETERMINE WHO IS BEING RATED
      // Owner -> Helper
      // Helper -> Owner
      // =================================================

      const ratedUserId =
        raterId === ownerId
          ? helperId
          : ownerId;

      // =================================================
      // PREVENT SELF RATING
      // =================================================

      if (raterId === ratedUserId) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot rate yourself",
        });
      }

      // =================================================
      // CHECK DUPLICATE TASK RATING
      // =================================================

      const [existing] = await db.execute(
        `
        SELECT id
        FROM ratings
        WHERE task_id = ?
          AND rater_id = ?
        LIMIT 1
        `,
        [taskId, raterId]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            "You have already rated this task",
        });
      }

      // =================================================
      // INSERT TASK RATING
      // =================================================

      await db.execute(
        `
        INSERT INTO ratings
          (
            task_id,
            resource_id,
            rater_id,
            rated_user_id,
            rating,
            comment
          )
        VALUES (?, NULL, ?, ?, ?, ?)
        `,
        [
          taskId,
          raterId,
          ratedUserId,
          numericRating,
          cleanComment || null,
        ]
      );

      return res.status(201).json({
        success: true,
        message:
          "Task rating submitted successfully",

        rating: {
          task_id: taskId,
          resource_id: null,
          rater_id: raterId,
          rated_user_id: ratedUserId,
          rating: numericRating,
          comment: cleanComment,
        },
      });
    }

    // =================================================
    // RESOURCE RATING
    // =================================================

    const [resources] = await db.execute(
      `
      SELECT
        r.id,
        r.user_id AS owner_id,
        r.availability,

        p.payer_id AS borrower_id,
        p.receiver_id AS payment_owner_id,
        p.id AS payment_id,
        p.paid_at

      FROM resources r

      LEFT JOIN payments p
        ON p.resource_id = r.id
       AND p.status = 'paid'

      WHERE r.id = ?

      ORDER BY
        p.paid_at DESC,
        p.id DESC

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

    const ownerId = Number(resource.owner_id);
    const borrowerId = Number(resource.borrower_id);

    // =================================================
    // RESOURCE MUST HAVE BEEN PAID/BORROWED
    // =================================================

    if (!borrowerId) {
      return res.status(400).json({
        success: false,
        message:
          "This resource has not been borrowed",
      });
    }

    // =================================================
    // RESOURCE MUST BE RETURNED
    //
    // IMPORTANT:
    // After the new return flow:
    //
    // Borrowed -> Returned
    //
    // Therefore we check for "returned", NOT "available".
    // =================================================

    if (
      String(resource.availability).toLowerCase() !==
      "returned"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Resource can be rated only after it is returned",
      });
    }

    // =================================================
    // ONLY OWNER OR BORROWER CAN RATE
    // =================================================

    if (
      raterId !== ownerId &&
      raterId !== borrowerId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not part of this resource transaction",
      });
    }

    // =================================================
    // DETERMINE WHO IS BEING RATED
    //
    // Owner -> Borrower
    // Borrower -> Owner
    // =================================================

    const ratedUserId =
      raterId === ownerId
        ? borrowerId
        : ownerId;

    // =================================================
    // PREVENT SELF RATING
    // =================================================

    if (raterId === ratedUserId) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot rate yourself",
      });
    }

    // =================================================
    // CHECK DUPLICATE RESOURCE RATING
    // =================================================

    const [existing] = await db.execute(
      `
      SELECT id
      FROM ratings
      WHERE resource_id = ?
        AND rater_id = ?
      LIMIT 1
      `,
      [resourceId, raterId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "You have already rated this resource transaction",
      });
    }

    // =================================================
    // INSERT RESOURCE RATING
    // =================================================

    await db.execute(
      `
      INSERT INTO ratings
        (
          task_id,
          resource_id,
          rater_id,
          rated_user_id,
          rating,
          comment
        )
      VALUES (NULL, ?, ?, ?, ?, ?)
      `,
      [
        resourceId,
        raterId,
        ratedUserId,
        numericRating,
        cleanComment || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "Resource rating submitted successfully",

      rating: {
        task_id: null,
        resource_id: resourceId,
        rater_id: raterId,
        rated_user_id: ratedUserId,
        rating: numericRating,
        comment: cleanComment,
      },
    });
  } catch (error) {
    console.error(
      "Create rating error:",
      error
    );

    // =================================================
    // MYSQL UNIQUE KEY PROTECTION
    // =================================================

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "You have already submitted a rating for this transaction",
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Server error while submitting rating",
    });
  }
});

// =====================================================
// GET RATINGS RECEIVED BY A USER
// =====================================================

router.get("/user/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const [ratings] = await db.execute(
      `
      SELECT
        r.id,
        r.task_id,
        r.resource_id,
        r.rater_id,
        r.rated_user_id,
        r.rating,
        r.comment,
        r.created_at,

        u.name AS rater_name

      FROM ratings r

      JOIN users u
        ON r.rater_id = u.id

      WHERE r.rated_user_id = ?

      ORDER BY r.created_at DESC
      `,
      [userId]
    );

    res.json({
      success: true,
      count: ratings.length,
      ratings,
    });
  } catch (error) {
    console.error(
      "Get user ratings error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching ratings",
    });
  }
});

module.exports = router;