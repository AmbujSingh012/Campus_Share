const express = require("express");
const db = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      task_id,
      payer_id,
      receiver_id,
      amount,
      status = "pending",
      transaction_id,
    } = req.body;

    if (!task_id || !payer_id || !receiver_id || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "task_id, payer_id, receiver_id and amount are required",
      });
    }

    const allowedStatuses = ["pending", "paid", "failed", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO payments
       (task_id, payer_id, receiver_id, amount, status, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        task_id,
        payer_id,
        receiver_id,
        amount,
        status,
        transaction_id || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Payment record created successfully",
      payment_id: result.insertId,
    });
  } catch (error) {
    console.error("Create payment error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating payment record",
    });
  }
});

module.exports = router;