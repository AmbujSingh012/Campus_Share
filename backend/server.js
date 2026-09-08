const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const { paymentMiddleware } = require("@x402/express");

const {
  HTTPFacilitatorClient,
  x402ResourceServer,
} = require("@x402/core/server");

const { ExactAvmScheme } = require("@x402/avm/exact/server");
const { USDC_TESTNET_ASA_ID } = require("@x402/avm");

const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const taskRoutes = require("./routes/taskRoutes");
const profileRoutes = require("./routes/profileRoutes");
const helperRoutes = require("./routes/helperRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// =====================================================
// APP CONFIGURATION
// =====================================================

const app = express();
const PORT = process.env.PORT || 3000;

const PAY_TO = process.env.X402_PAY_TO;
const FACILITATOR_URL = process.env.FACILITATOR_URL;

// Algorand Testnet
const ALGORAND_TESTNET_CAIP2 =
  "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

// x402 payment amount
// 100000 base units with 6 decimals = 0.10 USDC
const X402_AMOUNT = "100000";
const X402_USDC_AMOUNT = 0.10;

// =====================================================
// CHECK ENVIRONMENT VARIABLES
// =====================================================

if (!PAY_TO || !FACILITATOR_URL) {
  throw new Error(
    "Missing X402_PAY_TO or FACILITATOR_URL in .env"
  );
}

// =====================================================
// X402 CONFIGURATION
// =====================================================

const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
});

const x402Server = new x402ResourceServer(
  facilitatorClient
);

x402Server.register(
  ALGORAND_TESTNET_CAIP2,
  new ExactAvmScheme()
);

// =====================================================
// X402 ROUTES
// =====================================================

const x402Routes = {
  "GET /api/premium": {
    accepts: {
      scheme: "exact",

      network: ALGORAND_TESTNET_CAIP2,

      payTo: PAY_TO,

      price: {
        asset: USDC_TESTNET_ASA_ID.toString(),
        amount: X402_AMOUNT,

        extra: {
          name: "USDC",
          decimals: 6,
        },
      },
    },

    description: "CampusShare premium API",

    mimeType: "application/json",
  },

  "POST /api/tasks/:id/accept": {
    accepts: {
      scheme: "exact",

      network: ALGORAND_TESTNET_CAIP2,

      payTo: PAY_TO,

      price: {
        asset: USDC_TESTNET_ASA_ID.toString(),
        amount: X402_AMOUNT,

        extra: {
          name: "USDC",
          decimals: 6,
        },
      },
    },

    description: "CampusShare paid task acceptance",

    mimeType: "application/json",
  },

  "POST /api/helper": {
    accepts: {
      scheme: "exact",

      network: ALGORAND_TESTNET_CAIP2,

      payTo: PAY_TO,

      price: {
        asset: USDC_TESTNET_ASA_ID.toString(),
        amount: X402_AMOUNT,

        extra: {
          name: "USDC",
          decimals: 6,
        },
      },
    },

    description: "CampusShare Campus Helper",

    mimeType: "application/json",
  },
};

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    exposedHeaders: [
      "PAYMENT-REQUIRED",
      "PAYMENT-RESPONSE",
    ],
  })
);

app.use(express.json());

// =====================================================
// IMAGE UPLOADS
// =====================================================

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// =====================================================
// X402 PAYMENT MIDDLEWARE
// =====================================================

app.use(
  paymentMiddleware(
    x402Routes,
    x402Server
  )
);

// =====================================================
// X402 AFTER SETTLEMENT
// =====================================================

x402Server.onAfterSettle(async (context) => {
  const { result, transportContext } = context;

  console.log(
    "X402 AFTER SETTLE PATH:",
    transportContext?.request?.path
  );

  console.log(
    "X402 SETTLEMENT RESULT:",
    result
  );

  // Only continue when payment settlement succeeded
  if (!result || !result.success) {
    console.log("X402 payment was not successful.");
    return;
  }

  // Get requested API path
  const requestPath =
    transportContext?.request?.path || "";

  // Only handle task acceptance payments
  const match = requestPath.match(
    /\/api\/tasks\/(\d+)\/accept/
  );

  if (!match) {
    return;
  }

  const taskId = Number(match[1]);

  if (!Number.isInteger(taskId)) {
    console.error(
      "Invalid task ID from x402 request:",
      taskId
    );

    return;
  }

  try {
    // Find latest pending acceptance
    const [rows] = await db.execute(
      `
      SELECT id
      FROM acceptances
      WHERE task_id = ?
        AND payment_status = 'pending'
      ORDER BY id DESC
      LIMIT 1
      `,
      [taskId]
    );

    if (rows.length === 0) {
      console.log(
        "No pending acceptance found for task:",
        taskId
      );

      return;
    }

    const acceptanceId = rows[0].id;

    // =================================================
    // SAVE SUCCESSFUL PAYMENT
    // =================================================

    await db.execute(
      `
      UPDATE acceptances
      SET
        payment_status = 'paid',
        payment_transaction_id = ?,
        payment_network = ?,
        payment_amount = ?,
        paid_at = NOW()
      WHERE id = ?
      `,
      [
        result.transaction || null,

        result.network || null,

        // x402 route price is fixed:
        // 100000 base units = 0.10 USDC
        X402_USDC_AMOUNT,

        acceptanceId,
      ]
    );

    console.log(
      `X402 PAYMENT SAVED: acceptance=${acceptanceId}, task=${taskId}, tx=${result.transaction}`
    );

    console.log(
      `X402 PAYMENT AMOUNT SAVED: ${X402_USDC_AMOUNT} USDC`
    );

  } catch (error) {
    console.error(
      "Failed to save x402 payment:",
      error
    );
  }
});

// =====================================================
// BASIC ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CampusShare Backend is running",
  });
});

// =====================================================
// PAYMENT TEST
// =====================================================

app.get("/api/payment-test", (req, res) => {
  res.status(402).json({
    success: false,
    message: "Payment Required",
  });
});

// =====================================================
// PREMIUM API
// =====================================================

app.get("/api/premium", (req, res) => {
  res.json({
    success: true,

    message:
      "CampusShare premium API accessed successfully",

    data: {
      service: "CampusShare Premium",

      payment: "x402",

      network: "Algorand Testnet",

      asset: "USDC",

      price: "$0.10",
    },
  });
});

// =====================================================
// API ROUTES
// =====================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/resources",
  resourceRoutes
);

app.use(
  "/api/tasks",
  taskRoutes
);

app.use(
  "/api/profile",
  profileRoutes
);

app.use(
  "/api/helper",
  helperRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

// =====================================================
// 404 ROUTE
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, async () => {
  console.log(
    `CampusShare Backend running on port ${PORT}`
  );

  console.log(
    `x402 payment amount: ${X402_USDC_AMOUNT} USDC`
  );

  try {
    const connection =
      await db.getConnection();

    console.log(
      "MySQL connected successfully"
    );

    connection.release();

  } catch (error) {
    console.error(
      "MySQL connection failed:",
      error.message
    );
  }
});