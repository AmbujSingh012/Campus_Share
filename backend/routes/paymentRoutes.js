const express = require("express");
const Razorpay = require("razorpay");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


router.post("/create-order", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { task_id, resource_id } = req.body;

    if (!task_id && !resource_id) {
      return res.status(400).json({
        success: false,
        message: "task_id or resource_id is required",
      });
    }

    if (task_id && resource_id) {
      return res.status(400).json({
        success: false,
        message: "Provide only task_id or resource_id",
      });
    }

    let receiverId;
    let amount;
    let title;
    let location;
    let paymentType;

    const [payerRows] = await db.execute(
      "SELECT college_id FROM users WHERE id = ?",
      [userId]
    );

    if (payerRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const payerCollegeId = payerRows[0].college_id;

    if (task_id) {
      const [tasks] = await db.execute(
        `SELECT id, user_id, title, location, reward, college_id
         FROM tasks
         WHERE id = ?`,
        [task_id]
      );

      if (tasks.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      const task = tasks[0];

      if (Number(task.user_id) !== Number(userId)) {
        return res.status(403).json({
          success: false,
          message: "Only the task owner can pay the helper",
        });
      }

      if (Number(payerCollegeId) !== Number(task.college_id)) {
        return res.status(403).json({
          success: false,
          message: "You can only pay within your college",
        });
      }

      const [acceptances] = await db.execute(
        `SELECT helper_id, status
         FROM acceptances
         WHERE task_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [task_id]
      );

      if (acceptances.length === 0) {
        return res.status(409).json({
          success: false,
          message: "No helper has accepted this task yet",
        });
      }

      const acceptance = acceptances[0];

      if (
        String(acceptance.status || "").toLowerCase() !==
        "accepted"
      ) {
        return res.status(409).json({
          success: false,
          message: "The task does not have an active helper",
        });
      }

      receiverId = acceptance.helper_id;

      if (Number(receiverId) === Number(userId)) {
        return res.status(400).json({
          success: false,
          message: "You cannot pay yourself",
        });
      }

      amount = Number(task.reward);
      title = task.title;
      location = task.location;
      paymentType = "task";
    } else {
      const [resources] = await db.execute(
        `SELECT id, user_id, title, location, borrowing_fee,
                availability, college_id
         FROM resources
         WHERE id = ?`,
        [resource_id]
      );

      if (resources.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        });
      }

      const resource = resources[0];

      if (Number(resource.user_id) === Number(userId)) {
        return res.status(400).json({
          success: false,
          message: "You cannot pay yourself",
        });
      }

      if (Number(payerCollegeId) !== Number(resource.college_id)) {
        return res.status(403).json({
          success: false,
          message: "You can only pay within your college",
        });
      }

      if (
        String(resource.availability || "").toLowerCase() !== "available"
      ) {
        return res.status(409).json({
          success: false,
          message: "Resource is not available",
        });
      }

      const [existingPayments] = await db.execute(
  `SELECT id, status
   FROM payments
   WHERE resource_id = ?
     AND status = 'pending'
   ORDER BY id DESC
   LIMIT 1`,
  [resource_id]
);

if (existingPayments.length > 0) {
  return res.status(409).json({
    success: false,
    message: "A payment is already in progress for this resource.",
  });
}

      receiverId = resource.user_id;
      amount = Number(resource.borrowing_fee);
      title = resource.title;
      location = resource.location;
      paymentType = "resource";
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `cs_${paymentType}_${task_id || resource_id}_${Date.now()}`,
      notes: {
        user_id: String(userId),
        receiver_id: String(receiverId),
        task_id: task_id ? String(task_id) : "",
        resource_id: resource_id ? String(resource_id) : "",
        title: String(title || ""),
        location: String(location || ""),
      },
    });

    const [paymentResult] = await db.execute(
      `INSERT INTO payments
       (
         task_id,
         resource_id,
         payer_id,
         receiver_id,
         amount,
         status,
         payment_provider,
         razorpay_order_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task_id || null,
        resource_id || null,
        userId,
        receiverId,
        amount,
        "pending",
        "razorpay",
        order.id,
      ]
    );

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      payment: {
        id: paymentResult.insertId,
        task_id: task_id || null,
        resource_id: resource_id || null,
        amount,
        title,
        location,
        receiver_id: receiverId,
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create Razorpay order",
    });
  }
});


router.post("/verify-razorpay", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment verification details are required",
      });
    }

    const [payments] = await db.execute(
      `SELECT
         id,
         task_id,
         resource_id,
         payer_id,
         receiver_id,
         amount,
         status
       FROM payments
       WHERE razorpay_order_id = ?
       LIMIT 1`,
      [razorpay_order_id]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found",
      });
    }

    const payment = payments[0];

    if (Number(payment.payer_id) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to verify this payment",
      });
    }

    if (payment.status === "paid") {
      return res.json({
        success: true,
        message: "Payment already verified",
        payment_id: payment.id,
      });
    }

    const crypto = require("crypto");

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await db.execute(
        `UPDATE payments
         SET status = 'failed',
             razorpay_payment_id = ?,
             razorpay_signature = ?
         WHERE id = ?`,
        [
          razorpay_payment_id,
          razorpay_signature,
          payment.id,
        ]
      );

      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature",
      });
    }

    const razorpayPayment =
      await razorpay.payments.fetch(razorpay_payment_id);

    if (String(razorpayPayment.order_id) !== String(razorpay_order_id)) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this order",
      });
    }

    const expectedAmountPaise = Math.round(
      Number(payment.amount) * 100
    );

    if (Number(razorpayPayment.amount) !== expectedAmountPaise) {
      return res.status(400).json({
        success: false,
        message: "Payment amount mismatch",
      });
    }

    if (razorpayPayment.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: `Payment is not captured. Current status: ${razorpayPayment.status}`,
      });
    }

    const paymentMethod = razorpayPayment.method || null;
    const upiId =
      razorpayPayment.vpa ||
      razorpayPayment.upi?.vpa ||
      null;

    // Complete the payment record first.
    await db.execute(
      `UPDATE payments
       SET status = 'paid',
           payment_method = ?,
           razorpay_payment_id = ?,
           razorpay_signature = ?,
           upi_id = ?,
           transaction_id = ?,
           paid_at = NOW()
       WHERE id = ?`,
      [
        paymentMethod,
        razorpay_payment_id,
        razorpay_signature,
        upiId,
        razorpay_payment_id,
        payment.id,
      ]
    );

    // Resource borrowing is completed ONLY after successful payment.
    if (payment.resource_id !== null) {
      const [borrowResult] = await db.execute(
        `UPDATE resources
         SET availability = 'Borrowed',
             borrowed_by = ?,
             borrowed_at = NOW()
         WHERE id = ?
           AND LOWER(COALESCE(availability, '')) = 'available'
           AND borrowed_by IS NULL`,
        [userId, payment.resource_id]
      );

      if (borrowResult.affectedRows === 0) {
        return res.status(409).json({
          success: false,
          message:
            "Payment was successful, but this resource is no longer available. Please contact support for the payment/refund.",
          payment_id: payment.id,
          transaction_id: razorpay_payment_id,
        });
      }
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        id: payment.id,
        task_id: payment.task_id,
        resource_id: payment.resource_id,
        payer_id: payment.payer_id,
        receiver_id: payment.receiver_id,
        amount: payment.amount,
        status: "paid",
        payment_method: paymentMethod,
        payment_provider: "razorpay",
        razorpay_order_id,
        razorpay_payment_id,
        transaction_id: razorpay_payment_id,
        upi_id: upiId,
      },
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to verify Razorpay payment",
    });
  }
});

router.post("/", authenticateToken, async (req, res) => {
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

/*
=========================================
PAYMENT RECEIPT
GET /api/payments/receipt/:paymentId
=========================================
*/

router.get("/my-receipts", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [payments] = await db.execute(
      `SELECT
        p.id,
        p.task_id,
        p.resource_id,
        p.payer_id,
        p.receiver_id,
        p.amount,
        p.status,
        p.payment_method,
        p.payment_provider,
        p.razorpay_order_id,
        p.razorpay_payment_id,
        p.transaction_id,
        p.upi_id,
        p.created_at,
        p.paid_at,

        payer.name AS payer_name,
        payer.email AS payer_email,
        payer.mobile AS payer_mobile,
        payer.upi_id AS payer_upi_id,

        receiver.name AS receiver_name,
        receiver.email AS receiver_email,
        receiver.mobile AS receiver_mobile,
        receiver.upi_id AS receiver_upi_id,

        t.title AS task_title,
        t.location AS task_location,

        r.title AS resource_title,
        r.location AS resource_location

       FROM payments p

       JOIN users payer
         ON p.payer_id = payer.id

       JOIN users receiver
         ON p.receiver_id = receiver.id

       LEFT JOIN tasks t
         ON p.task_id = t.id

       LEFT JOIN resources r
         ON p.resource_id = r.id

       WHERE p.status = 'paid'
         AND (
           p.payer_id = ?
           OR p.receiver_id = ?
         )

       ORDER BY p.paid_at DESC`,
      [userId, userId]
    );

    const receipts = payments.map((payment) => {
      const isTaskPayment = payment.task_id !== null;

      return {
        payment_id: payment.id,
        task_id: payment.task_id,
        resource_id: payment.resource_id,
        type: isTaskPayment ? "task" : "resource",
        item_title: isTaskPayment
          ? payment.task_title
          : payment.resource_title,
        location: isTaskPayment
          ? payment.task_location
          : payment.resource_location,
        amount: Number(payment.amount || 0),
        status: payment.status,
        payment_method: payment.payment_method || null,
        payment_provider: payment.payment_provider || null,
        transaction_id:
          payment.transaction_id ||
          payment.razorpay_payment_id ||
          null,
        razorpay_order_id:
          payment.razorpay_order_id || null,
        razorpay_payment_id:
          payment.razorpay_payment_id || null,
        payment_upi_id: payment.upi_id || null,

        payer: {
          id: payment.payer_id,
          name: payment.payer_name,
          email: payment.payer_email,
          mobile: payment.payer_mobile || null,
          upi_id: payment.payer_upi_id || null,
        },

        receiver: {
          id: payment.receiver_id,
          name: payment.receiver_name,
          email: payment.receiver_email,
          mobile: payment.receiver_mobile || null,
          upi_id: payment.receiver_upi_id || null,
        },

        created_at: payment.created_at,
        paid_at: payment.paid_at,
      };
    });

    return res.json({
      success: true,
      receipts,
    });
  } catch (error) {
    console.error("My payment receipts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payment receipts",
    });
  }
});

router.get("/receipt/:paymentId", authenticateToken, async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);
    const userId = req.user.userId;

    if (!Number.isInteger(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const [payments] = await db.execute(
      `SELECT
        p.id,
        p.task_id,
        p.resource_id,
        p.payer_id,
        p.receiver_id,
        p.amount,
        p.status,
        p.payment_method,
        p.payment_provider,
        p.razorpay_order_id,
        p.razorpay_payment_id,
        p.transaction_id,
        p.upi_id,
        p.created_at,
        p.paid_at,

        payer.name AS payer_name,
        payer.email AS payer_email,
        payer.mobile AS payer_mobile,
        payer.upi_id AS payer_upi_id,

        receiver.name AS receiver_name,
        receiver.email AS receiver_email,
        receiver.mobile AS receiver_mobile,
        receiver.upi_id AS receiver_upi_id,

        t.title AS task_title,
        t.location AS task_location,

        r.title AS resource_title,
        r.location AS resource_location

       FROM payments p

       JOIN users payer
         ON p.payer_id = payer.id

       JOIN users receiver
         ON p.receiver_id = receiver.id

       LEFT JOIN tasks t
         ON p.task_id = t.id

       LEFT JOIN resources r
         ON p.resource_id = r.id

       WHERE p.id = ?
         AND (
           p.payer_id = ?
           OR p.receiver_id = ?
         )
       LIMIT 1`,
      [paymentId, userId, userId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment receipt not found",
      });
    }

    const payment = payments[0];

    const isTaskPayment = payment.task_id !== null;

    const itemTitle = isTaskPayment
      ? payment.task_title
      : payment.resource_title;

    const location = isTaskPayment
      ? payment.task_location
      : payment.resource_location;

    return res.json({
      success: true,
      receipt: {
        payment_id: payment.id,

        type: isTaskPayment
          ? "task"
          : "resource",

        item_title: itemTitle || "Campus Payment",
        location: location || "Campus",

        amount: Number(payment.amount || 0),
        status: payment.status,

        payment_method:
          payment.payment_method || null,

        payment_provider:
          payment.payment_provider || null,

        transaction_id:
          payment.transaction_id ||
          payment.razorpay_payment_id ||
          null,

        razorpay_order_id:
          payment.razorpay_order_id || null,

        razorpay_payment_id:
          payment.razorpay_payment_id || null,

        payment_upi_id:
          payment.upi_id || null,

        payer: {
          id: payment.payer_id,
          name: payment.payer_name,
          email: payment.payer_email,
          mobile: payment.payer_mobile || null,
          upi_id: payment.payer_upi_id || null,
        },

        receiver: {
          id: payment.receiver_id,
          name: payment.receiver_name,
          email: payment.receiver_email,
          mobile: payment.receiver_mobile || null,
          upi_id: payment.receiver_upi_id || null,
        },

        created_at: payment.created_at,
        paid_at: payment.paid_at,
      },
    });
  } catch (error) {
    console.error("Payment receipt error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payment receipt",
    });
  }
});
router.put("/cancel/:paymentId", authenticateToken, async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);
    const userId = req.user.userId;

    if (!Number.isInteger(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const [payments] = await db.execute(
      `SELECT id, payer_id, status
       FROM payments
       WHERE id = ?
       LIMIT 1`,
      [paymentId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = payments[0];

    if (Number(payment.payer_id) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to cancel this payment",
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be cancelled because its status is '${payment.status}'`,
      });
    }

    const [result] = await db.execute(
      `UPDATE payments
       SET status = 'cancelled'
       WHERE id = ?
         AND payer_id = ?
         AND status = 'pending'`,
      [paymentId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message: "Payment was already changed",
      });
    }

    return res.json({
      success: true,
      message: "Payment cancelled successfully",
      payment_id: paymentId,
    });
  } catch (error) {
    console.error("Cancel payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while cancelling payment",
    });
  }
});

module.exports = router;