const express = require("express");
const algosdk = require("algosdk");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// ALGORAND TESTNET CONFIGURATION
// =====================================================

const ALGOD_SERVER = "https://testnet-api.algonode.cloud";
const ALGOD_PORT = "";
const ALGOD_TOKEN = "";

const INDEXER_SERVER = "https://testnet-idx.algonode.cloud";

const USDC_ASSET_ID = 10458941;
const USDC_DECIMALS = 6;

const algodClient = new algosdk.Algodv2(
  ALGOD_TOKEN,
  ALGOD_SERVER,
  ALGOD_PORT
);

// =====================================================
// ALL TASK APIs REQUIRE AUTHENTICATION
// =====================================================

router.use(authenticateToken);

// =====================================================
// ACTIVE COLLEGE HELPER
// =====================================================

function getActiveCollegeId(req) {
  const collegeId = Number(req.user.collegeId);

  if (!Number.isInteger(collegeId) || collegeId <= 0) {
    return null;
  }

  return collegeId;
}

// =====================================================
// ALGORAND ADDRESS NORMALIZATION
// =====================================================

function normalizeAlgorandAddress(value) {
  if (!value) {
    return null;
  }

  // Already a normal Algorand address
  if (
    typeof value === "string" &&
    value.length === 58 &&
    /^[A-Z2-7]+$/.test(value)
  ) {
    return value;
  }

  // Try base64 -> 32 bytes -> Algorand address
  try {
    if (typeof value === "string") {
      const decoded = Buffer.from(value, "base64");

      if (decoded.length === 32) {
        return algosdk.encodeAddress(decoded);
      }
    }
  } catch (error) {
    console.log(
      "Address normalization error:",
      error.message
    );
  }

  return value;
}

// =====================================================
// GET CONFIRMED ALGORAND TRANSACTION
//
// Verification order:
//
// 1. Algod pendingTransactionInformation
// 2. Indexer direct transaction lookup
// 3. Indexer transaction search
//
// IMPORTANT:
// We NEVER trust the frontend alone.
// The blockchain transaction must be found and verified.
// =====================================================

async function getConfirmedTransaction(
  txId,
  maxAttempts = 30,
  delayMs = 1000
) {
  let lastError = null;

  if (
    !txId ||
    typeof txId !== "string" ||
    txId.length < 50
  ) {
    throw new Error(
      "Invalid Algorand transaction ID"
    );
  }

  console.log(
    "================================================="
  );
  console.log(
    "VERIFYING ALGORAND TRANSACTION"
  );
  console.log(
    "Transaction ID:",
    txId
  );
  console.log(
    "================================================="
  );

  // -------------------------------------------------
  // METHOD 1: ALGOD PENDING TRANSACTION API
  // -------------------------------------------------

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      console.log(
        `Algod verification attempt ${attempt}/${maxAttempts}`
      );

      const pendingInfo =
        await algodClient
          .pendingTransactionInformation(txId)
          .do();

      console.log(
        "Algod response:",
        JSON.stringify(
          pendingInfo,
          null,
          2
        )
      );

      const confirmedRound = Number(
        pendingInfo["confirmed-round"] || 0
      );

      if (confirmedRound > 0) {
        console.log(
          "Transaction confirmed through Algod."
        );

        const assetTransfer =
          pendingInfo[
            "asset-transfer-transaction"
          ];

        if (
          assetTransfer &&
          pendingInfo.sender
        ) {
          return {
            "confirmed-round":
              confirmedRound,

            txn: {
              type: "axfer",
              snd: pendingInfo.sender,
              arcv: assetTransfer.receiver,
              xaid: Number(
                assetTransfer["asset-id"]
              ),
              aamt: Number(
                assetTransfer.amount
              ),
            },

            source: "algod",
          };
        }

        console.log(
          "Algod confirmed the transaction but did not return complete ASA details."
        );

        break;
      }

      console.log(
        "Algod found transaction but it is not confirmed yet."
      );
    } catch (error) {
      lastError = error;

      console.log(
        "Algod lookup failed:",
        error.message
      );

      break;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs)
      );
    }
  }

  // -------------------------------------------------
  // METHOD 2: INDEXER DIRECT TRANSACTION LOOKUP
  // -------------------------------------------------

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      console.log(
        `Indexer direct lookup attempt ${attempt}/${maxAttempts}`
      );

      const url =
        `${INDEXER_SERVER}/v2/transactions/` +
        encodeURIComponent(txId);

      const response =
        await fetch(url);

      console.log(
        "Indexer HTTP status:",
        response.status
      );

      if (response.status === 404) {
        console.log(
          "Transaction is not indexed yet."
        );
      } else if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `Indexer HTTP ${response.status}: ${errorText}`
        );
      } else {
        const indexerResponse =
          await response.json();

        console.log(
          "Indexer response received."
        );

        if (
          indexerResponse &&
          indexerResponse.transaction
        ) {
          const transaction =
            indexerResponse.transaction;

          const confirmedRound =
            Number(
              transaction[
                "confirmed-round"
              ] || 0
            );

          console.log(
            "Indexer confirmed round:",
            confirmedRound
          );

          if (confirmedRound > 0) {
            const assetTransfer =
              transaction[
                "asset-transfer-transaction"
              ];

            if (
              transaction["tx-type"] ===
                "axfer" &&
              assetTransfer
            ) {
              return {
                "confirmed-round":
                  confirmedRound,

                txn: {
                  type: "axfer",
                  snd:
                    transaction.sender,
                  arcv:
                    assetTransfer.receiver,
                  xaid:
                    Number(
                      assetTransfer[
                        "asset-id"
                      ]
                    ),
                  aamt:
                    Number(
                      assetTransfer.amount
                    ),
                },

                source: "indexer",
              };
            }

            return {
              "confirmed-round":
                confirmedRound,

              txn: {
                type:
                  transaction[
                    "tx-type"
                  ] || "",

                snd:
                  transaction.sender ||
                  null,

                arcv: null,
                xaid: 0,
                aamt: 0,
              },

              source: "indexer",
            };
          }
        }
      }
    } catch (error) {
      lastError = error;

      console.log(
        "Indexer direct lookup failed:",
        error.message
      );
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs)
      );
    }
  }

  // -------------------------------------------------
  // METHOD 3: INDEXER TRANSACTION SEARCH
  // -------------------------------------------------

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      console.log(
        `Indexer search attempt ${attempt}/${maxAttempts}`
      );

      const url =
        `${INDEXER_SERVER}/v2/transactions?` +
        `txid=${encodeURIComponent(txId)}`;

      const response =
        await fetch(url);

      console.log(
        "Indexer search HTTP status:",
        response.status
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `Indexer search HTTP ${response.status}: ${errorText}`
        );
      }

      const searchResponse =
        await response.json();

      const transactions =
        searchResponse.transactions || [];

      console.log(
        "Indexer search transactions found:",
        transactions.length
      );

      const transaction =
        transactions.find(
          (item) => item.id === txId
        );

      if (transaction) {
        const confirmedRound =
          Number(
            transaction[
              "confirmed-round"
            ] || 0
          );

        if (confirmedRound > 0) {
          const assetTransfer =
            transaction[
              "asset-transfer-transaction"
            ];

          if (
            transaction["tx-type"] ===
              "axfer" &&
            assetTransfer
          ) {
            return {
              "confirmed-round":
                confirmedRound,

              txn: {
                type: "axfer",
                snd:
                  transaction.sender,
                arcv:
                  assetTransfer.receiver,
                xaid:
                  Number(
                    assetTransfer[
                      "asset-id"
                    ]
                  ),
                aamt:
                  Number(
                    assetTransfer.amount
                  ),
              },

              source:
                "indexer-search",
            };
          }
        }
      }
    } catch (error) {
      lastError = error;

      console.log(
        "Indexer search failed:",
        error.message
      );
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs)
      );
    }
  }

  throw new Error(
    lastError?.message ||
      "Transaction was not found as a confirmed transaction on Algorand Testnet"
  );
}

// =====================================================
// GET ALL TASKS
// Only tasks from active college
// =====================================================

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const collegeId = getActiveCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "No active college selected",
      });
    }

    const [tasks] = await db.execute(
      `
      SELECT
        t.id,
        t.user_id,
        t.title,
        t.description,
        t.category,
        t.location,
        t.meeting_time,
        t.reward,
        t.status,
        t.deadline,
        t.college_id,
        t.created_at,
        u.name AS postedBy,

        my_a.id AS my_acceptance_id,
        my_a.status AS my_acceptance_status,
        my_a.payment_status AS my_payment_status,
        my_a.payment_transaction_id AS my_transaction_id,
        my_a.payment_network AS my_payment_network,
        my_a.payment_amount AS my_payment_amount,
        my_a.paid_at AS my_paid_at,

        task_a.id AS task_acceptance_id,
        task_a.helper_id AS task_helper_id,
        task_a.status AS task_acceptance_status,

        (
          SELECT p.status
          FROM payments p
          WHERE p.task_id = t.id
          ORDER BY p.id DESC
          LIMIT 1
        ) AS task_payment_status,

        (
          SELECT p.transaction_id
          FROM payments p
          WHERE p.task_id = t.id
          ORDER BY p.id DESC
          LIMIT 1
        ) AS task_transaction_id,

        (
          SELECT p.payment_provider
          FROM payments p
          WHERE p.task_id = t.id
          ORDER BY p.id DESC
          LIMIT 1
        ) AS task_payment_network,

        (
          SELECT p.amount
          FROM payments p
          WHERE p.task_id = t.id
          ORDER BY p.id DESC
          LIMIT 1
        ) AS task_payment_amount,

        (
          SELECT p.paid_at
          FROM payments p
          WHERE p.task_id = t.id
          ORDER BY p.id DESC
          LIMIT 1
        ) AS task_paid_at

      FROM tasks t

      JOIN users u
        ON t.user_id = u.id

      LEFT JOIN acceptances my_a
        ON my_a.task_id = t.id
        AND my_a.helper_id = ?

      LEFT JOIN acceptances task_a
        ON task_a.id = (
          SELECT a2.id
          FROM acceptances a2
          WHERE a2.task_id = t.id
          ORDER BY a2.id DESC
          LIMIT 1
        )

      WHERE t.college_id = ?
        AND LOWER(t.status) <> 'completed'

      ORDER BY t.created_at DESC
      `,
      [userId, collegeId]
    );

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error(
      "Get tasks error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching tasks",
    });
  }
});

// =====================================================
// GET TRANSACTION HISTORY
// Only transactions related to active college
// =====================================================

router.get(
  "/transactions/history",
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const collegeId = getActiveCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message: "No active college selected",
        });
      }

      console.log(
        "TRANSACTION HISTORY USER:",
        userId
      );

      const [transactions] =
        await db.execute(
          `
          SELECT *
          FROM (
            SELECT
              CONCAT('task-', p.id) AS id,
              'task' AS transaction_type,
              p.task_id,
              NULL AS resource_id,
              a.helper_id,
              p.payer_id,
              p.receiver_id,
              t.status AS status,
              a.accepted_at,
              p.status AS payment_status,
              p.transaction_id AS payment_transaction_id,
              p.payment_provider AS payment_network,
              p.amount AS payment_amount,
              t.reward,
              p.paid_at,
              t.title AS task_title,
              owner.name AS task_owner

            FROM payments p

            JOIN tasks t
              ON p.task_id = t.id

            JOIN users owner
              ON t.user_id = owner.id

            LEFT JOIN acceptances a
              ON a.task_id = t.id
              AND a.status = 'accepted'

            WHERE p.task_id IS NOT NULL
              AND t.college_id = ?
              AND (
                p.payer_id = ?
                OR p.receiver_id = ?
              )

            UNION ALL

            SELECT
              CONCAT('resource-', p.id) AS id,
              'resource' AS transaction_type,
              NULL AS task_id,
              p.resource_id,
              r.borrowed_by AS helper_id,
              p.payer_id,
              p.receiver_id,
              CASE
                WHEN LOWER(
                  COALESCE(
                    r.availability,
                    ''
                  )
                ) = 'borrowed'
                  THEN 'borrowed'
                ELSE r.availability
              END AS status,
              r.borrowed_at AS accepted_at,
              p.status AS payment_status,
              p.transaction_id AS payment_transaction_id,
              p.payment_provider AS payment_network,
              p.amount AS payment_amount,
              p.amount AS reward,
              p.paid_at,
              r.title AS task_title,
              owner.name AS task_owner

            FROM payments p

            JOIN resources r
              ON p.resource_id = r.id

            JOIN users owner
              ON r.user_id = owner.id

            WHERE p.resource_id IS NOT NULL
              AND r.college_id = ?
              AND (
                p.payer_id = ?
                OR p.receiver_id = ?
              )
          ) AS transaction_history

          ORDER BY COALESCE(
            paid_at,
            accepted_at
          ) DESC
          `,
          [
            collegeId,
            userId,
            userId,
            collegeId,
            userId,
            userId,
          ]
        );

      console.log(
        "TRANSACTIONS FOUND:",
        transactions.length
      );

      res.json({
        success: true,
        count: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error(
        "Transaction history error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while fetching transaction history",
      });
    }
  }
);

// =====================================================
// GET CONNECTION DETAILS
// Only active college
// =====================================================

router.get(
  "/:id/connection",
  async (req, res) => {
    try {
      const taskId =
        Number(req.params.id);

      const userId =
        req.user.userId;

      const collegeId =
        getActiveCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message: "No active college selected",
        });
      }

      if (!Number.isInteger(taskId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task ID",
        });
      }

      const [rows] =
        await db.execute(
          `
          SELECT
            t.id AS task_id,
            t.title,
            t.description,
            t.category,
            t.location,
            t.meeting_time,
            t.reward,
            t.deadline,
            t.status AS task_status,

            owner.id AS owner_id,
            owner.name AS owner_name,
            owner.email AS owner_email,
            owner.mobile AS owner_mobile,
            owner.wallet_address
              AS owner_wallet_address,

            helper.id AS helper_id,
            helper.name AS helper_name,
            helper.email AS helper_email,
            helper.mobile AS helper_mobile,
            helper.wallet_address
              AS helper_wallet_address,

            a.id AS acceptance_id,
            a.status AS acceptance_status,
            a.accepted_at,

            p.id AS payment_id,
            p.status AS payment_status,
            p.payment_method,
            p.payment_provider,
            p.transaction_id
              AS payment_transaction_id,
            p.razorpay_order_id,
            p.razorpay_payment_id,
            p.upi_id AS payment_upi_id,
            p.amount AS payment_amount,
            p.paid_at AS payment_paid_at,

            payer.id AS payer_id,
            payer.name AS payer_name,
            payer.email AS payer_email,
            payer.mobile AS payer_mobile,
            payer.upi_id AS payer_upi_id,

            receiver.id AS receiver_id,
            receiver.name AS receiver_name,
            receiver.email AS receiver_email,
            receiver.mobile AS receiver_mobile,
            receiver.upi_id AS receiver_upi_id,

            EXISTS (
              SELECT 1
              FROM ratings r
              WHERE r.task_id = t.id
                AND r.rater_id = ?
            ) AS current_user_already_rated

          FROM tasks t

          JOIN users owner
            ON owner.id = t.user_id

          JOIN acceptances a
            ON a.task_id = t.id

          JOIN users helper
            ON helper.id = a.helper_id

          LEFT JOIN payments p
            ON p.task_id = t.id
            AND p.id = (
              SELECT MAX(p2.id)
              FROM payments p2
              WHERE p2.task_id = t.id
                AND p2.status IN (
                  'pending',
                  'paid'
                )
            )

          LEFT JOIN users payer
            ON payer.id = p.payer_id

          LEFT JOIN users receiver
            ON receiver.id = p.receiver_id

          WHERE t.id = ?
            AND t.college_id = ?
            AND (
              t.user_id = ?
              OR a.helper_id = ?
            )

          ORDER BY a.id DESC
          LIMIT 1
          `,
          [
            userId,
            taskId,
            collegeId,
            userId,
            userId,
          ]
        );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Connection details not found",
        });
      }

      const data = rows[0];

      res.json({
        success: true,

        task: {
          id: data.task_id,
          title: data.title,
          description: data.description,
          category: data.category,
          location: data.location,
          meeting_time:
            data.meeting_time,
          reward: data.reward,
          deadline: data.deadline,
          status:
            data.task_status,
        },

        owner: {
          id: data.owner_id,
          name: data.owner_name,
          email: data.owner_email,
          mobile:
            data.owner_mobile || null,
          wallet_address:
            data.owner_wallet_address,
        },

        helper: {
          id: data.helper_id,
          name: data.helper_name,
          email: data.helper_email,
          mobile:
            data.helper_mobile || null,
          wallet_address:
            data.helper_wallet_address,
        },

        acceptance: {
          id: data.acceptance_id,
          status:
            data.acceptance_status,
          accepted_at:
            data.accepted_at,
        },

        rating: {
          current_user_already_rated:
            Number(data.current_user_already_rated || 0) === 1,
        },

        payment: {
          id:
            data.payment_id || null,

          status:
            data.payment_status ||
            "pending",

          payment_method:
            data.payment_method || null,

          payment_provider:
            data.payment_provider || null,

          transaction_id:
            data.payment_transaction_id ||
            null,

          razorpay_order_id:
            data.razorpay_order_id ||
            null,

          razorpay_payment_id:
            data.razorpay_payment_id ||
            null,

          upi_id:
            data.payment_upi_id || null,

          amount:
            data.payment_amount !== null &&
            data.payment_amount !== undefined
              ? Number(
                  data.payment_amount
                )
              : null,

          paid_at:
            data.payment_paid_at || null,

          payer: {
            id:
              data.payer_id || null,
            name:
              data.payer_name || null,
            email:
              data.payer_email || null,
            mobile:
              data.payer_mobile || null,
            upi_id:
              data.payer_upi_id || null,
          },

          receiver: {
            id:
              data.receiver_id || null,
            name:
              data.receiver_name || null,
            email:
              data.receiver_email || null,
            mobile:
              data.receiver_mobile || null,
            upi_id:
              data.receiver_upi_id || null,
          },
        },
      });
    } catch (error) {
      console.error(
        "Connection details error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while fetching connection details",
      });
    }
  }
);

// =====================================================
// MY TASKS
// Only tasks created by current user
// in active college
// =====================================================

router.get(
  "/my",
  async (req, res) => {
    try {
      const userId =
        req.user.userId;

      const collegeId =
        getActiveCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message: "No active college selected",
        });
      }

      const [tasks] =
        await db.execute(
          `
          SELECT
            t.id,
            t.user_id,
            t.title,
            t.description,
            t.category,
            t.location,
            t.meeting_time,
            t.reward,
            t.status,
            t.deadline,
            t.college_id,
            t.created_at,
            u.name AS postedBy,

            a.id AS acceptance_id,
            a.helper_id,
            a.status AS acceptance_status,
            a.payment_status,
            a.payment_transaction_id,
            a.payment_network,
            a.payment_amount,
            a.paid_at,

            helper.name AS helper_name,

CASE
  WHEN t.status = 'completed'
       AND a.helper_id IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM ratings r
         WHERE r.task_id = t.id
           AND r.rater_id = ?
       )
  THEN 1
  ELSE 0
END AS owner_already_rated

          FROM tasks t

          JOIN users u
            ON t.user_id = u.id

          LEFT JOIN acceptances a
            ON a.id = (
              SELECT a2.id
              FROM acceptances a2
              WHERE a2.task_id = t.id
              ORDER BY
                CASE
                  WHEN a2.status = 'accepted'
                    THEN 0
                  ELSE 1
                END,
                a2.id DESC
              LIMIT 1
            )

          LEFT JOIN users helper
            ON helper.id = a.helper_id

          WHERE t.user_id = ?
            AND t.college_id = ?

          ORDER BY t.created_at DESC
          `,
          [
  userId,
  userId,
  collegeId,
]
        );

      return res.json({
        success: true,
        tasks,
      });
    } catch (error) {
      console.error(
        "Get my tasks error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching your tasks",
      });
    }
  }
);

// =====================================================
// GET TASK BY ID
// Only allow access to active college
// =====================================================

router.get(
  "/:id",
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task ID",
        });
      }

      const collegeId =
        getActiveCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message:
            "No active college selected",
        });
      }

      const [tasks] =
        await db.execute(
          `
          SELECT
            t.id,
            t.user_id,
            t.title,
            t.description,
            t.category,
            t.location,
            t.meeting_time,
            t.reward,
            t.status,
            t.deadline,
            t.college_id,
            t.created_at,
            u.name AS postedBy

          FROM tasks t

          JOIN users u
            ON t.user_id = u.id

          WHERE t.id = ?
            AND t.college_id = ?
          `,
          [
            id,
            collegeId,
          ]
        );

      if (tasks.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Task not found in your college",
        });
      }

      res.json({
        success: true,
        task: tasks[0],
      });
    } catch (error) {
      console.error(
        "Get task error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while fetching task",
      });
    }
  }
);

// =====================================================
// CREATE TASK
// =====================================================

router.post(
  "/",
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        location,
        meeting_time,
        reward,
        deadline,
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

      const numericReward =
        Number(reward);

      if (
        Number.isNaN(
          numericReward
        ) ||
        numericReward < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Reward must be a valid non-negative number",
        });
      }

      const userId =
        req.user.userId;

      const collegeId =
        getActiveCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message:
            "No active college selected",
        });
      }

      const [users] =
        await db.execute(
          `
          SELECT
            id,
            name
          FROM users
          WHERE id = ?
          `,
          [userId]
        );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found",
        });
      }

      const user = users[0];

      const [result] =
        await db.execute(
          `
          INSERT INTO tasks
          (
            user_id,
            title,
            description,
            category,
            location,
            meeting_time,
            reward,
            status,
            deadline,
            college_id
          )

          VALUES
          (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
          `,
          [
            user.id,
            title.trim(),
            description || "",
            category.trim(),
            location.trim(),
            meeting_time || null,
            numericReward,
            deadline,
            collegeId,
          ]
        );

      const [newTasks] =
        await db.execute(
          `
          SELECT
            t.id,
            t.user_id,
            t.title,
            t.description,
            t.category,
            t.location,
            t.meeting_time,
            t.reward,
            t.status,
            t.deadline,
            t.college_id,
            t.created_at,
            u.name AS postedBy

          FROM tasks t

          JOIN users u
            ON t.user_id = u.id

          WHERE t.id = ?
            AND t.college_id = ?
          `,
          [
            result.insertId,
            collegeId,
          ]
        );

      res.status(201).json({
        success: true,
        message:
          "Task created successfully",
        task: newTasks[0],
      });
    } catch (error) {
      console.error(
        "Create task error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while creating task",
      });
    }
  }
);

// =====================================================
// ACCEPT TASK
// =====================================================

router.post(
  "/:id/accept",
  async (req, res) => {
    const connection =
      await db.getConnection();

    try {
      const taskId =
        Number(req.params.id);

      if (!Number.isInteger(taskId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task ID",
        });
      }

      const helperId =
        req.user.userId;

      const activeCollegeId =
        getActiveCollegeId(req);

      if (!activeCollegeId) {
        return res.status(403).json({
          success: false,
          message:
            "No active college selected",
        });
      }

      await connection.beginTransaction();

      const [users] =
        await connection.execute(
          `
          SELECT
            id
          FROM users
          WHERE id = ?
          `,
          [helperId]
        );

      if (users.length === 0) {
        await connection.rollback();

        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found",
        });
      }

      // IMPORTANT:
      // Task is fetched only from active college.
      // A task from another college is invisible here.

      const [tasks] =
        await connection.execute(
          `
          SELECT *
          FROM tasks
          WHERE id = ?
            AND college_id = ?
          FOR UPDATE
          `,
          [
            taskId,
            activeCollegeId,
          ]
        );

      if (tasks.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message:
            "Task not found",
        });
      }

      const task =
        tasks[0];

      if (
        task.status !== "open"
      ) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Task is not available",
        });
      }

      if (
        Number(task.user_id) ===
        Number(helperId)
      ) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            "You cannot accept your own task",
        });
      }

      const [
        existingAcceptance,
      ] =
        await connection.execute(
          `
          SELECT id
          FROM acceptances
          WHERE task_id = ?
            AND helper_id = ?
          `,
          [
            taskId,
            helperId,
          ]
        );

      if (
        existingAcceptance.length >
        0
      ) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message:
            "You have already accepted this task",
        });
      }

      const [result] =
        await connection.execute(
          `
          INSERT INTO acceptances
          (
            task_id,
            helper_id,
            status
          )

          VALUES
          (?, ?, 'accepted')
          `,
          [
            taskId,
            helperId,
          ]
        );

      await connection.execute(
        `
        UPDATE tasks
        SET status = 'accepted'
        WHERE id = ?
          AND college_id = ?
        `,
        [
          taskId,
          activeCollegeId,
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message:
          "Task accepted successfully",

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

      console.error(
        "Accept task error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while accepting task",
      });
    } finally {
      connection.release();
    }
  }
);

// =====================================================
// UPDATE TASK
// =====================================================

router.put(
  "/:id",
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task ID",
        });
      }

      const collegeId =
        getActiveCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message:
            "No active college selected",
        });
      }

      const {
        title,
        description,
        category,
        reward,
        deadline,
        location,
        meeting_time,
      } = req.body;

      if (
        !title ||
        !category ||
        reward === undefined ||
        !deadline ||
        !location
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Title, category, reward, deadline and location are required",
        });
      }

      const numericReward =
        Number(reward);

      if (
        Number.isNaN(
          numericReward
        ) ||
        numericReward < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Reward must be a valid non-negative number",
        });
      }

      const userId =
        req.user.userId;

      const [result] =
        await db.execute(
          `
          UPDATE tasks

          SET
            title = ?,
            description = ?,
            category = ?,
            reward = ?,
            deadline = ?,
            location = ?,
            meeting_time = ?

          WHERE id = ?
            AND user_id = ?
            AND college_id = ?
          `,
          [
            title.trim(),
            description || "",
            category.trim(),
            numericReward,
            deadline,
            location.trim(),
            meeting_time || null,
            id,
            userId,
            collegeId,
          ]
        );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Task not found or you are not the owner",
        });
      }

      res.json({
        success: true,
        message:
          "Task updated successfully",
      });
    } catch (error) {
      console.error(
        "Update task error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while updating task",
      });
    }
  }
);

// =====================================================
// COMPLETE TASK
// Accepted helper marks task as completed
// =====================================================

router.put(
  "/:id/complete",
  async (req, res) => {
    try {
      const taskId =
        Number(req.params.id);

      if (!Number.isInteger(taskId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task ID",
        });
      }

      const helperId =
        req.user.userId;

      const collegeId =
        getActiveCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message:
            "No active college selected",
        });
      }

      // Find the task and its accepted helper
      // only inside the active college.

      const [rows] =
        await db.execute(
          `
          SELECT
            t.id,
            t.user_id AS owner_id,
            t.status AS task_status,
            a.helper_id,
            a.status AS acceptance_status

          FROM tasks t

          JOIN acceptances a
            ON a.task_id = t.id

          WHERE t.id = ?
            AND t.college_id = ?
            AND a.helper_id = ?
            AND a.status = 'accepted'

          LIMIT 1
          `,
          [
            taskId,
            collegeId,
            helperId,
          ]
        );

      if (rows.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            "You are not the accepted helper for this task",
        });
      }

      const task =
        rows[0];

      const [payments] = await db.execute(
        `
        SELECT status
        FROM payments
        WHERE task_id = ?
        ORDER BY id DESC
        LIMIT 1
        `,
        [taskId]
      );

      const latestPaymentStatus =
        String(payments[0]?.status || "").toLowerCase();

      if (latestPaymentStatus !== "paid") {
        return res.status(400).json({
          success: false,
          message:
            "Task cannot be completed until the owner has paid the helper.",
        });
      }

      if (
        task.task_status !==
        "accepted"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Task cannot be completed because its current status is '${task.task_status}'`,
        });
      }

      // Mark task as completed

      const [result] =
        await db.execute(
          `
          UPDATE tasks

          SET status = 'completed'

          WHERE id = ?
            AND college_id = ?
            AND status = 'accepted'
          `,
          [
            taskId,
            collegeId,
          ]
        );

      if (
        result.affectedRows === 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Task was already completed or changed",
        });
      }

      res.json({
        success: true,
        message:
          "Task completed successfully",

        task: {
          id: taskId,
          status: "completed",
          owner_id: task.owner_id,
          helper_id: helperId,
        },
      });
    } catch (error) {
      console.error(
        "Complete task error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while completing task",
      });
    }
  }
);

// =====================================================
// DELETE TASK
// =====================================================

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task ID",
        });
      }

      const userId =
        req.user.userId;

      const collegeId =
        getActiveCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message:
            "No active college selected",
        });
      }

      const [result] =
        await db.execute(
          `
          DELETE FROM tasks

          WHERE id = ?
            AND user_id = ?
            AND college_id = ?
          `,
          [
            id,
            userId,
            collegeId,
          ]
        );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Task not found or you are not the owner",
        });
      }

      res.json({
        success: true,
        message:
          "Task deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete task error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while deleting task",
      });
    }
  }
);

// =====================================================
// PAY HELPER
//
// Owner pays accepted helper.
//
// IMPORTANT:
// Payment is verified against the blockchain before
// the database is changed.
// =====================================================

router.post(
  "/:id/pay",
  async (req, res) => {
    try {
      const taskId =
        Number(req.params.id);

      const userId =
        req.user.userId;

      const collegeId =
        getActiveCollegeId(req);

      const {
        transaction_id,
      } = req.body;

      // -------------------------------------------------
      // Validate active college
      // -------------------------------------------------

      if (!collegeId) {
        return res.status(403).json({
          success: false,
          message:
            "No active college selected",
        });
      }

      // -------------------------------------------------
      // Validate task ID
      // -------------------------------------------------

      if (
        !Number.isInteger(taskId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task ID",
        });
      }

      // -------------------------------------------------
      // Validate transaction ID
      // -------------------------------------------------

      if (
        !transaction_id ||
        typeof transaction_id !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "transaction_id is required",
        });
      }

      // -------------------------------------------------
      // Get task owner + accepted helper
      // -------------------------------------------------

      const [rows] =
        await db.execute(
          `
          SELECT
            t.id AS task_id,
            t.user_id AS owner_id,
            t.reward,

            owner.wallet_address
              AS owner_wallet_address,

            a.id AS acceptance_id,
            a.helper_id,
            a.payment_status,
            a.payment_transaction_id,

            helper.wallet_address
              AS helper_wallet_address

          FROM tasks t

          JOIN acceptances a
            ON a.task_id = t.id

          JOIN users owner
            ON owner.id = t.user_id

          JOIN users helper
            ON helper.id = a.helper_id

          WHERE t.id = ?
            AND t.college_id = ?
            AND t.user_id = ?
            AND a.status = 'accepted'

          ORDER BY a.id DESC
          LIMIT 1
          `,
          [
            taskId,
            collegeId,
            userId,
          ]
        );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Task not found, you are not the owner, or no accepted helper exists",
        });
      }

      const paymentData =
        rows[0];

      console.log(
        "================================================="
      );

      console.log(
        "BACKEND PAYMENT VERIFICATION"
      );

      console.log(
        "Task ID:",
        paymentData.task_id
      );

      console.log(
        "Owner ID:",
        paymentData.owner_id
      );

      console.log(
        "Helper ID:",
        paymentData.helper_id
      );

      console.log(
        "Reward:",
        paymentData.reward
      );

      console.log(
        "Owner wallet:",
        paymentData.owner_wallet_address
      );

      console.log(
        "Helper wallet:",
        paymentData.helper_wallet_address
      );

      console.log(
        "Transaction ID:",
        transaction_id
      );

      console.log(
        "================================================="
      );

      // -------------------------------------------------
      // Validate owner wallet
      // -------------------------------------------------

      if (
        !paymentData.owner_wallet_address
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Task owner has not connected a Pera Wallet",
        });
      }

      // -------------------------------------------------
      // Validate helper wallet
      // -------------------------------------------------

      if (
        !paymentData.helper_wallet_address
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Helper has not connected a Pera Wallet",
        });
      }

      // -------------------------------------------------
      // Prevent duplicate payment
      // -------------------------------------------------

      if (
        paymentData.payment_status ===
          "paid" &&
        paymentData.payment_transaction_id
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This task has already been paid",

          transaction_id:
            paymentData.payment_transaction_id,
        });
      }

      // -------------------------------------------------
      // Prevent transaction reuse
      // -------------------------------------------------

      const [existingPayment] =
        await db.execute(
          `
          SELECT
            id,
            task_id
          FROM payments
          WHERE transaction_id = ?
          LIMIT 1
          `,
          [transaction_id]
        );

      if (
        existingPayment.length > 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This Algorand transaction has already been used",
          transaction_id,
        });
      }

      // -------------------------------------------------
      // Verify blockchain transaction
      // -------------------------------------------------

      let blockchainTransaction;

      try {
        blockchainTransaction =
          await getConfirmedTransaction(
            transaction_id
          );
      } catch (error) {
        console.error(
          "Algorand confirmation error:",
          error
        );

        return res.status(400).json({
          success: false,
          message:
            "Transaction could not be confirmed on Algorand Testnet",
          details:
            error.message,
        });
      }

      // -------------------------------------------------
      // Verify confirmed round
      // -------------------------------------------------

      const confirmedRound =
        Number(
          blockchainTransaction[
            "confirmed-round"
          ] || 0
        );

      if (
        confirmedRound <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction is not confirmed yet",
        });
      }

      // -------------------------------------------------
      // Get transaction details
      // -------------------------------------------------

      const txn =
        blockchainTransaction.txn;

      if (!txn) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction details are unavailable",
        });
      }

      console.log(
        "Transaction source:",
        blockchainTransaction.source
      );

      console.log(
        "Transaction type:",
        txn.type
      );

      console.log(
        "Raw sender:",
        txn.snd
      );

      console.log(
        "Raw receiver:",
        txn.arcv
      );

      console.log(
        "Asset ID:",
        txn.xaid
      );

      console.log(
        "Asset amount:",
        txn.aamt
      );

      // -------------------------------------------------
      // Read transaction fields
      // -------------------------------------------------

      const transactionType =
        txn.type;

      const sender =
        normalizeAlgorandAddress(
          txn.snd
        );

      const receiver =
        normalizeAlgorandAddress(
          txn.arcv
        );

      const assetId =
        Number(txn.xaid);

      const assetAmount =
        Number(txn.aamt);

      console.log(
        "Normalized sender:",
        sender
      );

      console.log(
        "Normalized receiver:",
        receiver
      );

      console.log(
        "Expected sender:",
        paymentData.owner_wallet_address
      );

      console.log(
        "Expected receiver:",
        paymentData.helper_wallet_address
      );

      // -------------------------------------------------
      // Must be ASA transfer
      // -------------------------------------------------

      if (
        transactionType !==
        "axfer"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction is not an Algorand asset transfer",
        });
      }

      // -------------------------------------------------
      // Verify sender
      // -------------------------------------------------

      if (
        sender !==
        paymentData.owner_wallet_address
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction sender does not match task owner",

          expected:
            paymentData.owner_wallet_address,

          received:
            sender,
        });
      }

      // -------------------------------------------------
      // Verify receiver
      // -------------------------------------------------

      if (
        receiver !==
        paymentData.helper_wallet_address
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction receiver does not match accepted helper",

          expected:
            paymentData.helper_wallet_address,

          received:
            receiver,
        });
      }

      // -------------------------------------------------
      // Verify USDC asset
      // -------------------------------------------------

      if (
        assetId !==
        USDC_ASSET_ID
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Wrong asset. Expected USDC Testnet",

          expected_asset_id:
            USDC_ASSET_ID,

          received_asset_id:
            assetId,
        });
      }

      // -------------------------------------------------
      // Calculate expected amount
      // -------------------------------------------------

      const expectedAmount =
        Math.round(
          Number(
            paymentData.reward
          ) *
            10 **
              USDC_DECIMALS
        );

      console.log(
        "Expected USDC atomic amount:",
        expectedAmount
      );

      console.log(
        "Received USDC atomic amount:",
        assetAmount
      );

      // -------------------------------------------------
      // Verify amount
      // -------------------------------------------------

      if (
        assetAmount !==
        expectedAmount
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction amount does not match task reward",

          expected_amount:
            expectedAmount,

          received_amount:
            assetAmount,
        });
      }

      // =================================================
      // BLOCKCHAIN PAYMENT FULLY VERIFIED
      // =================================================

      console.log(
        "================================================="
      );

      console.log(
        "BLOCKCHAIN PAYMENT VERIFIED"
      );

      console.log(
        "Transaction:",
        transaction_id
      );

      console.log(
        "Sender:",
        sender
      );

      console.log(
        "Receiver:",
        receiver
      );

      console.log(
        "Asset:",
        assetId
      );

      console.log(
        "Amount:",
        assetAmount
      );

      console.log(
        "Confirmed round:",
        confirmedRound
      );

      console.log(
        "================================================="
      );

      // -------------------------------------------------
      // Update database
      // -------------------------------------------------

      const connection =
        await db.getConnection();

      try {
        await connection.beginTransaction();

        // -------------------------------------------------
        // Update acceptance
        // -------------------------------------------------

        const [
          acceptanceUpdate,
        ] =
          await connection.execute(
            `
            UPDATE acceptances

            SET
              payment_status = 'paid',
              payment_transaction_id = ?,
              payment_network = 'Algorand Testnet',
              payment_amount = ?,
              paid_at = NOW()

            WHERE id = ?
            `,
            [
              transaction_id,
              Number(
                paymentData.reward
              ),
              paymentData.acceptance_id,
            ]
          );

        console.log(
          "Acceptance rows updated:",
          acceptanceUpdate.affectedRows
        );

        // -------------------------------------------------
        // Insert payment
        // -------------------------------------------------

        await connection.execute(
          `
          INSERT INTO payments
          (
            task_id,
            payer_id,
            receiver_id,
            amount,
            status,
            transaction_id
          )

          VALUES
          (?, ?, ?, ?, 'paid', ?)
          `,
          [
            taskId,
            paymentData.owner_id,
            paymentData.helper_id,
            Number(
              paymentData.reward
            ),
            transaction_id,
          ]
        );

        await connection.commit();

        console.log(
          "DATABASE PAYMENT UPDATED SUCCESSFULLY"
        );

        // -------------------------------------------------
        // Success
        // -------------------------------------------------

        return res.json({
          success: true,

          message:
            "Helper paid successfully",

          payment: {
            task_id:
              taskId,

            payer_id:
              paymentData.owner_id,

            receiver_id:
              paymentData.helper_id,

            amount:
              Number(
                paymentData.reward
              ),

            asset:
              "USDC",

            asset_id:
              USDC_ASSET_ID,

            network:
              "Algorand Testnet",

            transaction_id:
              transaction_id,

            confirmed_round:
              confirmedRound,

            status:
              "paid",
          },
        });
      } catch (dbError) {
        await connection.rollback();

        console.error(
          "Payment database update error:",
          dbError
        );

        return res.status(500).json({
          success: false,
          message:
            "Blockchain payment was confirmed, but database update failed",
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(
        "Pay helper error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while processing helper payment",
      });
    }
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;