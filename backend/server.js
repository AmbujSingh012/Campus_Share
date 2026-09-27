const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const taskRoutes = require("./routes/taskRoutes");
const profileRoutes = require("./routes/profileRoutes");
const helperRoutes = require("./routes/helperRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const collegeRoutes = require("./routes/collegeRoutes");
const ratingRoutes = require("./routes/ratingRoutes");

// =====================================================
// OPTIONAL X402 IMPORTS
// =====================================================

let paymentMiddleware = null;
let HTTPFacilitatorClient = null;
let x402ResourceServer = null;
let ExactAvmScheme = null;
let USDC_TESTNET_ASA_ID = null;

try {
  ({ paymentMiddleware } = require("@x402/express"));
  ({ HTTPFacilitatorClient, x402ResourceServer } =
    require("@x402/core/server"));
  ({ ExactAvmScheme } =
    require("@x402/avm/exact/server"));
  ({ USDC_TESTNET_ASA_ID } =
    require("@x402/avm"));

  console.log("x402 packages loaded successfully");
} catch (error) {
  console.log(
    "x402 packages could not be loaded. Continuing without x402."
  );
}

// =====================================================
// APP CONFIGURATION
// =====================================================

const app = express();
const PORT = process.env.PORT || 3000;

const PAY_TO = process.env.X402_PAY_TO;
const FACILITATOR_URL = process.env.FACILITATOR_URL;

// x402 is optional.
// Razorpay does not require X402_PAY_TO or FACILITATOR_URL.
const X402_ENABLED =
  Boolean(PAY_TO && FACILITATOR_URL && paymentMiddleware);

console.log(
  `x402 status: ${X402_ENABLED ? "ENABLED" : "DISABLED"}`
);

// =====================================================
// ALGORAND TESTNET CONFIGURATION
// =====================================================

const ALGORAND_TESTNET_CAIP2 =
  "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

// 100000 base units with 6 decimals = 0.10 USDC
const X402_AMOUNT = "100000";
const X402_USDC_AMOUNT = 0.10;

// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: true,
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
// OPTIONAL X402 CONFIGURATION
// =====================================================

let x402Server = null;

if (X402_ENABLED) {
  try {
    const facilitatorClient =
      new HTTPFacilitatorClient({
        url: FACILITATOR_URL,
      });

    x402Server = new x402ResourceServer(
      facilitatorClient
    );

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
    };

    app.use(
      paymentMiddleware(
        x402Routes,
        x402Server
      )
    );

    // =================================================
    // X402 AFTER SETTLEMENT
    // =================================================

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

      if (!result || !result.success) {
        console.log(
          "X402 payment was not successful."
        );
        return;
      }

      const requestPath =
        transportContext?.request?.path || "";

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

        // =============================================
        // SAVE SUCCESSFUL X402 PAYMENT
        // =============================================

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

    console.log(
      "x402 middleware configured successfully"
    );
  } catch (error) {
    x402Server = null;

    console.error(
      "x402 configuration failed. Continuing without x402:",
      error.message
    );
  }
}

// =====================================================
// BASIC ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CampusShare Backend is running",
    x402: X402_ENABLED,
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
  if (!X402_ENABLED) {
    return res.status(503).json({
      success: false,
      message: "x402 payment service is not enabled",
    });
  }

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

app.use(
  "/api/colleges",
  collegeRoutes
);

app.use(
  "/api/ratings",
  ratingRoutes
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
