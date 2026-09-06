const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");
const { paymentMiddleware } = require("@x402/express");
const { HTTPFacilitatorClient } = require("@x402/core/server");
const { ExactAvmScheme } = require("@x402/avm/exact/server");
const { x402ResourceServer } = require("@x402/core/server");
const { USDC_TESTNET_ASA_ID } = require("@x402/avm");

const ALGORAND_TESTNET_CAIP2 =
  "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const taskRoutes = require("./routes/taskRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

const PORT = process.env.PORT || 3000;
const PAY_TO = process.env.X402_PAY_TO;
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL;

if (!PAY_TO || !FACILITATOR_URL) {
  throw new Error("Missing X402_PAY_TO or X402_FACILITATOR_URL in .env");
}

const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
});

const x402Server = new x402ResourceServer(facilitatorClient);

x402Server.register(
  ALGORAND_TESTNET_CAIP2,
  new ExactAvmScheme()
);

const x402Routes = {
  "GET /api/premium": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: {
        asset: USDC_TESTNET_ASA_ID,
        amount: "100000",
        extra: {
          name: "USDC",
          decimals: 6,
        },
      },
    },
    description: "CampusShare premium API",
    mimeType: "application/json",
  },
};
// Middleware
app.use(cors());
app.use(express.json());
app.use(
  paymentMiddleware(
    x402Routes,
    x402Server
  )
);
// Home / health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CampusShare Backend is running",
  });
});

// HTTP 402 test route
app.get("/api/payment-test", (req, res) => {
  res.status(402).json({
    success: false,
    message: "Payment Required",
  });
});
// x402 protected API
app.get("/api/premium", (req, res) => {
  res.json({
    success: true,
    message: "CampusShare premium API accessed successfully",
    data: {
      service: "CampusShare Premium",
      payment: "x402",
      network: "Algorand Testnet",
      asset: "USDC",
    },
  });
});
// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/profile", profileRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`CampusShare Backend running on port ${PORT}`);

  try {
    const connection = await db.getConnection();
    console.log("MySQL connected successfully");
    connection.release();
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
  }
});
