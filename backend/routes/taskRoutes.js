const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// All task APIs require authentication
router.use(authenticateToken);

// GET ALL TASKS
// Only tasks from the logged-in user's college
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

    const [tasks] = await db.execute(
      `SELECT
        t.id,
        t.user_id,
        t.title,
        t.description,
        t.category,
        t.location,
        t.reward,
        t.status,
        t.deadline,
        t.college_id,
        t.created_at,
        u.name AS postedBy
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       WHERE t.college_id = ?
       ORDER BY t.created_at DESC`,
      [collegeId]
    );

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching tasks",
    });
  }
});

// GET TASK BY ID
// Only allow access to tasks from user's college
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
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

    const [tasks] = await db.execute(
      `SELECT
        t.id,
        t.user_id,
        t.title,
        t.description,
        t.category,
        t.location,
        t.reward,
        t.status,
        t.deadline,
        t.college_id,
        t.created_at,
        u.name AS postedBy
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?
         AND t.college_id = ?`,
      [id, collegeId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found in your college",
      });
    }

    res.json({
      success: true,
      task: tasks[0],
    });
  } catch (error) {
    console.error("Get task error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching task",
    });
  }
});

// CREATE TASK
// user_id and college_id come from authenticated user
// NEVER trust userId/college_id from frontend
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      reward,
      deadline,
      location,
    } = req.body;

    if (
      !title ||
      !category ||
      reward === undefined ||
      reward === null ||
      !deadline ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, category, reward, deadline and location are required",
      });
    }

    const numericReward = Number(reward);

    if (Number.isNaN(numericReward) || numericReward < 0) {
      return res.status(400).json({
        success: false,
        message: "Reward must be a valid non-negative number",
      });
    }

    const userId = req.user.userId;

    const [users] = await db.execute(
      "SELECT id, name, college_id FROM users WHERE id = ?",
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

    const [result] = await db.execute(
      `INSERT INTO tasks
       (user_id, title, description, category, location, reward, status, deadline, college_id)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [
        user.id,
        title.trim(),
        description || "",
        category.trim(),
        location.trim(),
        numericReward,
        deadline,
        collegeId,
      ]
    );

    const [newTasks] = await db.execute(
      `SELECT
        t.id,
        t.user_id,
        t.title,
        t.description,
        t.category,
        t.location,
        t.reward,
        t.status,
        t.deadline,
        t.college_id,
        t.created_at,
        u.name AS postedBy
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: newTasks[0],
    });
  } catch (error) {
    console.error("Create task error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating task",
    });
  }
});

// ACCEPT TASK
// Helper is ALWAYS the authenticated user.
// Never trust userId from frontend.
router.post("/:id/accept", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const helperId = req.user.userId;

    await connection.beginTransaction();

    // Get authenticated user's college
    const [users] = await connection.execute(
      "SELECT id, college_id FROM users WHERE id = ?",
      [helperId]
    );

    if (users.length === 0) {
      await connection.rollback();

      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const helper = users[0];

    if (!helper.college_id) {
      await connection.rollback();

      return res.status(403).json({
        success: false,
        message: "User is not associated with a college",
      });
    }

    // Lock task row
    const [tasks] = await connection.execute(
      "SELECT * FROM tasks WHERE id = ? FOR UPDATE",
      [taskId]
    );

    if (tasks.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const task = tasks[0];

    // IMPORTANT:
    // Task and helper must belong to same college
    if (task.college_id !== helper.college_id) {
      await connection.rollback();

      return res.status(403).json({
        success: false,
        message: "You cannot accept a task from another college",
      });
    }

    if (task.status !== "open") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Task is not available",
      });
    }

    if (task.user_id === helperId) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "You cannot accept your own task",
      });
    }

    const [existingAcceptance] = await connection.execute(
      `SELECT id
       FROM acceptances
       WHERE task_id = ? AND helper_id = ?`,
      [taskId, helperId]
    );

    if (existingAcceptance.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "You have already accepted this task",
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO acceptances
       (task_id, helper_id, status)
       VALUES (?, ?, 'accepted')`,
      [taskId, helperId]
    );

    await connection.execute(
      "UPDATE tasks SET status = 'accepted' WHERE id = ?",
      [taskId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Task accepted successfully",
      acceptance: {
        id: result.insertId,
        task_id: taskId,
        helper_id: helperId,
        status: "accepted",
      },
      task: {
        ...task,
        status: "accepted",
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Accept task error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while accepting task",
    });
  } finally {
    connection.release();
  }
});

// UPDATE TASK
// Only task owner can update their task
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const {
      title,
      description,
      category,
      reward,
      deadline,
      location,
    } = req.body;

    if (!title || !category || reward === undefined || !deadline || !location) {
      return res.status(400).json({
        success: false,
        message:
          "Title, category, reward, deadline and location are required",
      });
    }

    const numericReward = Number(reward);

    if (Number.isNaN(numericReward) || numericReward < 0) {
      return res.status(400).json({
        success: false,
        message: "Reward must be a valid non-negative number",
      });
    }

    const userId = req.user.userId;

    const [result] = await db.execute(
      `UPDATE tasks
       SET title = ?,
           description = ?,
           category = ?,
           reward = ?,
           deadline = ?,
           location = ?
       WHERE id = ?
         AND user_id = ?`,
      [
        title.trim(),
        description || "",
        category.trim(),
        numericReward,
        deadline,
        location.trim(),
        id,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found or you are not the owner",
      });
    }

    res.json({
      success: true,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Update task error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating task",
    });
  }
});

// DELETE TASK
// Only task owner can delete their task
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const userId = req.user.userId;

    const [result] = await db.execute(
      `DELETE FROM tasks
       WHERE id = ?
         AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found or you are not the owner",
      });
    }

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while deleting task",
    });
  }
});

module.exports = router;
