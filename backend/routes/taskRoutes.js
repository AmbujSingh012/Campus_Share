
const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// ALL TASK APIs REQUIRE AUTHENTICATION
// =====================================================

router.use(authenticateToken);

// =====================================================
// GET ALL TASKS
// Only tasks from the logged-in user's college
// =====================================================

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;

    const [users] = await db.execute(
      "SELECT college_id FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const collegeId = users[0].college_id;

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with a college",
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
        task_a.payment_status AS task_payment_status,
        task_a.payment_transaction_id AS task_transaction_id,
        task_a.payment_network AS task_payment_network,
        task_a.payment_amount AS task_payment_amount,
        task_a.paid_at AS task_paid_at

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
    console.error("Get tasks error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching tasks",
    });
  }
});

// =====================================================
// GET TRANSACTION HISTORY
// IMPORTANT: MUST COME BEFORE /:id
// =====================================================

router.get("/transactions/history", async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("TRANSACTION HISTORY USER:", userId);

    const [transactions] = await db.execute(
      `
      SELECT
        a.id,
        a.task_id,
        a.helper_id,
        a.status,
        a.accepted_at,

        a.payment_status,
        a.payment_transaction_id,
        a.payment_network,
        a.payment_amount,
        a.paid_at,

        t.title AS task_title,
        t.reward,

        u.name AS task_owner

      FROM acceptances a

      JOIN tasks t
        ON a.task_id = t.id

      JOIN users u
        ON t.user_id = u.id

      WHERE a.helper_id = ?

      ORDER BY a.accepted_at DESC
      `,
      [userId]
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
});

// =====================================================
// GET CONNECTION DETAILS
// Task owner + helper + meeting + payment
// Only task owner or accepted helper can access
// =====================================================

router.get("/:id/connection", async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.userId;

    if (!Number.isInteger(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const [rows] = await db.execute(
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
        owner.wallet_address AS owner_wallet_address,

        helper.id AS helper_id,
        helper.name AS helper_name,
        helper.email AS helper_email,
        helper.wallet_address AS helper_wallet_address,

        a.id AS acceptance_id,
        a.status AS acceptance_status,
        a.accepted_at,

        a.payment_status,
        a.payment_transaction_id,
        a.payment_network,
        a.payment_amount,
        a.paid_at

      FROM tasks t

      JOIN users owner
        ON owner.id = t.user_id

      JOIN acceptances a
        ON a.task_id = t.id

      JOIN users helper
        ON helper.id = a.helper_id

      WHERE t.id = ?
        AND (t.user_id = ? OR a.helper_id = ?)

      ORDER BY a.id DESC

      LIMIT 1
      `,
      [taskId, userId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Connection details not found",
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
        meeting_time: data.meeting_time,
        reward: data.reward,
        deadline: data.deadline,
        status: data.task_status,
      },

      owner: {
        id: data.owner_id,
        name: data.owner_name,
        email: data.owner_email,
        wallet_address:
          data.owner_wallet_address,
      },

      helper: {
        id: data.helper_id,
        name: data.helper_name,
        email: data.helper_email,
        wallet_address:
          data.helper_wallet_address,
      },

      acceptance: {
        id: data.acceptance_id,
        status: data.acceptance_status,
        accepted_at: data.accepted_at,
      },

      payment: {
        status: data.payment_status,
        transaction_id:
          data.payment_transaction_id,
        network: data.payment_network,
        amount: data.payment_amount,
        paid_at: data.paid_at,
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
});
// =====================================================
// GET TASK SUMMARY
// Returns task type, location, deadline and reward
// =====================================================

router.get("/:id/summary", async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.userId;

    if (!Number.isInteger(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    // Get logged-in user's college
    const [users] = await db.execute(
      `
      SELECT college_id
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const collegeId = users[0].college_id;

    if (!collegeId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with a college",
      });
    }

    // Get required task information
    const [tasks] = await db.execute(
      `
      SELECT
        id,
        category AS task_type,
        location,
        deadline,
        reward
      FROM tasks
      WHERE id = ?
        AND college_id = ?
      `,
      [taskId, collegeId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const task = tasks[0];

    res.json({
      success: true,
      task: {
        id: task.id,
        task_type: task.task_type,
        location: task.location,
        deadline: task.deadline,
        reward: task.reward,
      },
    });
  } catch (error) {
    console.error("Get task summary error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching task summary",
    });
  }
});

// =====================================================
// GET TASK BY ID
// Only allow access to tasks from user's college
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const userId = req.user.userId;

    const [users] = await db.execute(
      "SELECT college_id FROM users WHERE id = ?",
      [userId]
    );

    if (
      users.length === 0 ||
      !users[0].college_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "User is not associated with a college",
      });
    }

    const collegeId = users[0].college_id;

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

        u.name AS postedBy

      FROM tasks t

      JOIN users u
        ON t.user_id = u.id

      WHERE t.id = ?
        AND t.college_id = ?
      `,
      [id, collegeId]
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
});

// =====================================================
// CREATE TASK
// user_id and college_id come from authenticated user
// NEVER trust userId/college_id from frontend
// =====================================================

router.post("/", async (req, res) => {
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

    const numericReward = Number(reward);

    if (
      Number.isNaN(numericReward) ||
      numericReward < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Reward must be a valid non-negative number",
      });
    }

    const userId = req.user.userId;

    const [users] = await db.execute(
      `
      SELECT
        id,
        name,
        college_id

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

    if (!user.college_id) {
      return res.status(403).json({
        success: false,
        message:
          "User is not associated with a college",
      });
    }

    const collegeId = user.college_id;

    const [result] = await db.execute(
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

      VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
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

    const [newTasks] = await db.execute(
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
      `,
      [result.insertId]
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
});

// =====================================================
// ACCEPT TASK
// Helper is ALWAYS the authenticated user
// Applying is FREE
// NEVER trust userId from frontend
// =====================================================

router.post("/:id/accept", async (req, res) => {
  const connection =
    await db.getConnection();

  try {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const helperId = req.user.userId;

    await connection.beginTransaction();

    const [users] =
      await connection.execute(
        `
        SELECT
          id,
          college_id

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

    const helper = users[0];

    if (!helper.college_id) {
      await connection.rollback();

      return res.status(403).json({
        success: false,
        message:
          "User is not associated with a college",
      });
    }

    const [tasks] =
      await connection.execute(
        `
        SELECT *
        FROM tasks

        WHERE id = ?

        FOR UPDATE
        `,
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

    if (
      task.college_id !==
      helper.college_id
    ) {
      await connection.rollback();

      return res.status(403).json({
        success: false,
        message:
          "You cannot accept a task from another college",
      });
    }

    if (task.status !== "open") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Task is not available",
      });
    }

    if (task.user_id === helperId) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "You cannot accept your own task",
      });
    }

    const [existingAcceptance] =
      await connection.execute(
        `
        SELECT id

        FROM acceptances

        WHERE task_id = ?
          AND helper_id = ?
        `,
        [taskId, helperId]
      );

    if (existingAcceptance.length > 0) {
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

        VALUES (?, ?, 'accepted')
        `,
        [taskId, helperId]
      );

    await connection.execute(
      `
      UPDATE tasks

      SET status = 'accepted'

      WHERE id = ?
      `,
      [taskId]
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
});

// =====================================================
// UPDATE TASK
// Only task owner can update their task
// =====================================================

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
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

    const numericReward = Number(reward);

    if (
      Number.isNaN(numericReward) ||
      numericReward < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Reward must be a valid non-negative number",
      });
    }

    const userId = req.user.userId;

    const [result] = await db.execute(
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
      ]
    );

    if (result.affectedRows === 0) {
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
});

// =====================================================
// DELETE TASK
// Only task owner can delete their task
// =====================================================

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const userId = req.user.userId;

    const [result] = await db.execute(
      `
      DELETE FROM tasks

      WHERE id = ?
        AND user_id = ?
      `,
      [id, userId]
    );

    if (result.affectedRows === 0) {
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
});

// =====================================================
// PAY HELPER
//
// Owner pays accepted helper.
//
// IMPORTANT:
// - Applying for a task is FREE.
// - Payment happens AFTER acceptance.
// - Owner's wallet sends USDC.
// - Backend verifies the REAL blockchain transaction.
// - Database is updated only after confirmation.
// =====================================================

router.post("/:id/pay", async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.userId;
    const { transaction_id } = req.body;

    // -------------------------------------------------
    // Validate task ID
    // -------------------------------------------------

    if (!Number.isInteger(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    // -------------------------------------------------
    // Validate transaction ID
    // -------------------------------------------------

    if (
      !transaction_id ||
      typeof transaction_id !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "transaction_id is required",
      });
    }

    // -------------------------------------------------
    // Algorand configuration
    // -------------------------------------------------

    const algosdk = require("algosdk");

    const ALGOD_SERVER =
      "https://testnet-api.algonode.cloud";

    const ALGOD_PORT = "";
    const ALGOD_TOKEN = "";

    const USDC_ASSET_ID = 10458941;
    const USDC_DECIMALS = 6;

    const algodClient =
      new algosdk.Algodv2(
        ALGOD_TOKEN,
        ALGOD_SERVER,
        ALGOD_PORT
      );

    // -------------------------------------------------
    // Normalize Algorand address
    // -------------------------------------------------

    function normalizeAlgorandAddress(value) {
      if (!value) {
        return null;
      }

      // Normal 58-character Algorand address
      if (
        typeof value === "string" &&
        value.length === 58 &&
        /^[A-Z2-7]+$/.test(value)
      ) {
        return value;
      }

      // Algod may return address as base64
      try {
        if (typeof value === "string") {
          const decoded =
            Buffer.from(value, "base64");

          if (decoded.length === 32) {
            return algosdk.encodeAddress(
              decoded
            );
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

    // -------------------------------------------------
    // Wait for transaction confirmation
    // -------------------------------------------------

    async function getConfirmedTransaction(
      txId,
      maxAttempts = 30,
      delayMs = 1000
    ) {
      let lastError = null;

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
      ) {
        try {
          console.log(
            `Checking Algorand transaction... attempt ${attempt}/${maxAttempts}`
          );

          const pendingInfo =
            await algodClient
              .pendingTransactionInformation(
                txId
              )
              .do();

          // Transaction rejected
          const poolError =
            pendingInfo["pool-error"];

          if (poolError) {
            throw new Error(
              `Algorand rejected transaction: ${poolError}`
            );
          }

          // Transaction confirmed
          const confirmedRound =
            Number(
              pendingInfo[
                "confirmed-round"
              ] || 0
            );

          if (confirmedRound > 0) {
            console.log(
              "Transaction confirmed in round:",
              confirmedRound
            );

            return pendingInfo;
          }

          console.log(
            "Transaction found but not confirmed yet."
          );
                } catch (error) {
          lastError = error;

          console.log(
            "Transaction lookup attempt failed:",
            error.message
          );

          // Stop immediately if Algorand rejected
          // the transaction.
          if (
            error.message &&
            error.message.includes(
              "Algorand rejected transaction"
            )
          ) {
            throw error;
          }

          // Stop immediately if the transaction ID
          // itself is invalid.
          if (
            error.message &&
            (
              error.message.includes(
                "no valid transaction ID was specified"
              ) ||
              error.message.includes(
                "status 400"
              )
            )
          ) {
            throw new Error(
              "Invalid Algorand transaction ID"
            );
          }
        }

        if (
          attempt < maxAttempts
        ) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                delayMs
              )
          );
        }
      }

      throw new Error(
        lastError?.message ||
          "Transaction was not confirmed within 30 seconds"
      );
    }

    // -------------------------------------------------
    // Get task owner + accepted helper
    // -------------------------------------------------

    const [rows] = await db.execute(
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
        AND t.user_id = ?
        AND a.status = 'accepted'

      ORDER BY a.id DESC

      LIMIT 1
      `,
      [taskId, userId]
    );

    // -------------------------------------------------
    // Check task/helper
    // -------------------------------------------------

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Task not found, you are not the owner, or no accepted helper exists",
      });
    }

    const paymentData = rows[0];

    console.log(
      "========== BACKEND PAYMENT VERIFICATION =========="
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
    // Prevent reuse of blockchain transaction
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
    // Wait for Algorand confirmation
    // -------------------------------------------------

    let pendingInfo;

    try {
      pendingInfo =
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
    // Confirmed round
    // -------------------------------------------------

    const confirmedRound =
      Number(
        pendingInfo[
          "confirmed-round"
        ] || 0
      );

    if (confirmedRound <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Transaction is not confirmed yet",
      });
    }

    // -------------------------------------------------
    // Get transaction information
    // -------------------------------------------------

    const txn = pendingInfo.txn;

    if (!txn) {
      return res.status(400).json({
        success: false,
        message:
          "Transaction details are unavailable",
      });
    }

    console.log(
      "Algorand transaction type:",
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
      transactionType !== "axfer"
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
      assetId !== USDC_ASSET_ID
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
    // Calculate expected USDC amount
    // -------------------------------------------------

    const expectedAmount =
      Math.round(
        Number(paymentData.reward) *
          10 ** USDC_DECIMALS
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
    // Verify payment amount
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

    // -------------------------------------------------
    // Update database
    // -------------------------------------------------

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      // Update acceptance
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
          Number(paymentData.reward),
          paymentData.acceptance_id,
        ]
      );

      // Insert payment
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

        VALUES (?, ?, ?, ?, 'paid', ?)
        `,
        [
          taskId,
          paymentData.owner_id,
          paymentData.helper_id,
          Number(paymentData.reward),
          transaction_id,
        ]
      );

      await connection.commit();

      console.log(
        "DATABASE PAYMENT UPDATED SUCCESSFULLY"
      );

      // -------------------------------------------------
      // Success response
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
            Number(paymentData.reward),

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
});

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;