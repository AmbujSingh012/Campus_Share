const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CampusShare Backend is running",
  });
});

// HTTP 402 demonstration route
app.get("/api/payment-test", (req, res) => {
  res.status(402).json({
    success: false,
    message: "Payment Required",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`CampusShare Backend running on port ${PORT}`);
});