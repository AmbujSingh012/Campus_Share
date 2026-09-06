
const express = require("express");
const db = require("../db");

const router = express.Router();

// GET ALL TASKS
router.get("/", async (req, res) => {
  try {
    const [tasks] = await db.execute(`
      SELECT
        t.id,
        t.user_id,
        t.title,
        t.description,
        t.category,
        t.location,
        t.reward,
        t.status,
        t.deadline,
        t.created_at,
        u.name AS postedBy
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);

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
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
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
        t.created_at,
        u.name AS postedBy
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
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
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      reward,
      deadline,
      location,
      postedBy,
      userId,
    } = req.body;

    const ownerId = userId || postedBy;

    if (
      !title ||
      !category ||
      reward === undefined ||
      reward === null ||
      !deadline ||
      !location ||
      !ownerId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, category, reward, deadline, location and userId are required",
      });
    }

    const numericUserId = Number(ownerId);
    const numericReward = Number(reward);

    if (!Number.isInteger(numericUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    if (Number.isNaN(numericReward) || numericReward < 0) {
      return res.status(400).json({
        success: false,
        message: "Reward must be a valid positive number",
      });
    }

    const [users] = await db.execute(
      "SELECT id, name FROM users WHERE id = ?",
      [numericUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO tasks
       (user_id, title, description, category, location, reward, status, deadline)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
      [
        numericUserId,
        title.trim(),
        description || "",
        category.trim(),
        location.trim(),
        numericReward,
        deadline,
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
router.post("/:id/accept", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const taskId = Number(req.params.id);
    const { userId } = req.body;

    if (!Number.isInteger(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const helperId = Number(userId);

    if (!Number.isInteger(helperId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    await connection.beginTransaction();

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

    if (task.status !== "open") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Task is not available",
      });
    }

    const [users] = await connection.execute(
      "SELECT id FROM users WHERE id = ?",
      [helperId]
    );

    if (users.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Helper user not found",
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

module.exports = router;