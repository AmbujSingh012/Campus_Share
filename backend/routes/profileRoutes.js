const express = require("express");
const router = express.Router();

const { users, tasks, resources, acceptances } = require("../data/store");

// GET PROFILE
router.get("/:id", (req, res) => {
  const userId = Number(req.params.id);

  const user = users.find((item) => item.id === userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const userTasks = tasks.filter(
    (task) => task.postedBy === userId
  );

  const userResources = resources.filter(
    (resource) => resource.postedBy === userId
  );

  const acceptedTasks = acceptances.filter(
    (acceptance) => acceptance.userId === userId
  );

  res.json({
    success: true,
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      wallet_address: user.wallet_address,
      postedTasks: userTasks.length,
      postedResources: userResources.length,
      acceptedTasks: acceptedTasks.length,
    },
  });
});

module.exports = router;
