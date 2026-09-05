const express = require("express");
const router = express.Router();

const { users } = require("../data/store");

// REGISTER
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email and password are required",
    });
  }

  const existingUser = users.find(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "User already exists",
    });
  }

  const newUser = {
    id: users.length + 1,
    name,
    email,
    password,
    wallet_address: null,
  };

  users.push(newUser);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      wallet_address: newUser.wallet_address,
    },
  });
});

// LOGIN
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const user = users.find(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  );

  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  res.json({
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      wallet_address: user.wallet_address,
    },
  });
});

module.exports = router;