const express = require("express");
const router = express.Router();

const { tasks, acceptances } = require("../data/store");

// GET ALL TASKS
router.get("/", (req, res) => {
  res.json({
    success: true,
    count: tasks.length,
    tasks,
  });
});

// GET TASK BY ID
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
    });
  }

  res.json({
    success: true,
    task,
  });
});

// CREATE TASK
router.post("/", (req, res) => {
  const {
    title,
    description,
    category,
    reward,
    deadline,
    location,
    postedBy,
  } = req.body;

  if (
    !title ||
    !category ||
    !reward ||
    !deadline ||
    !location ||
    !postedBy
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Title, category, reward, deadline, location and postedBy are required",
    });
  }

  const newTask = {
    id: tasks.length + 1,
    title,
    description: description || "",
    category,
    reward,
    deadline,
    location,
    postedBy,
    status: "open",
  };

  tasks.push(newTask);

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    task: newTask,
  });
});

// ACCEPT TASK
router.post("/:id/accept", (req, res) => {
  const taskId = Number(req.params.id);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required",
    });
  }

  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
    });
  }

  if (task.status !== "open") {
    return res.status(400).json({
      success: false,
      message: "Task is not available",
    });
  }

  const acceptance = {
    id: acceptances.length + 1,
    taskId,
    userId,
    status: "accepted",
  };

  acceptances.push(acceptance);

  task.status = "accepted";

  res.json({
    success: true,
    message: "Task accepted successfully",
    acceptance,
    task,
  });
});

module.exports = router;