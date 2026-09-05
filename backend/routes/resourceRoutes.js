const express = require("express");
const router = express.Router();

const { resources } = require("../data/store");

// GET ALL RESOURCES
router.get("/", (req, res) => {
  res.json({
    success: true,
    count: resources.length,
    resources,
  });
});

// GET RESOURCE BY ID
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  const resource = resources.find((item) => item.id === id);

  if (!resource) {
    return res.status(404).json({
      success: false,
      message: "Resource not found",
    });
  }

  res.json({
    success: true,
    resource,
  });
});

// CREATE RESOURCE
router.post("/", (req, res) => {
  const {
    title,
    description,
    category,
    postedBy,
    location,
  } = req.body;

  if (!title || !category || !postedBy || !location) {
    return res.status(400).json({
      success: false,
      message: "Title, category, postedBy and location are required",
    });
  }

  const newResource = {
    id: resources.length + 1,
    title,
    description: description || "",
    category,
    postedBy,
    location,
  };

  resources.push(newResource);

  res.status(201).json({
    success: true,
    message: "Resource created successfully",
    resource: newResource,
  });
});

module.exports = router;