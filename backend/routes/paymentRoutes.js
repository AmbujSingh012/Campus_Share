const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/*
=====================================================
ACTIVE COLLEGE
=====================================================
The active college comes from the JWT.

IMPORTANT:
Do NOT use users.college_id for the active campus.
The same account can log into different colleges.
=====================================================
*/

function getActiveCollegeId(req) {
  const collegeId = Number(req.user?.collegeId);

  if (!Number.isInteger(collegeId) || collegeId <= 0) {
    return null;
  }

  return collegeId;
}

/*
=====================================================
CREATE RAZORPAY ORDER
POST /api/payments/create-order
=====================================================
*/

router.post(
  "/create-order",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const activeCollegeId =
        getActiveCollegeId(req);

      if (!activeCollegeId) {
        return res.status(400).json({
          success: false,
          message: "Active college is required",
        });
      }

      const {
        task_id,
        resource_id,
      } = req.body;

      if (!task_id && !resource_id) {
        return res.status(400).json({
          success: false,
          message:
            "task_id or resource_id is required",
        });
      }

      if (task_id && resource_id) {
        return res.status(400).json({
          success: false,
          message:
            "Provide only task_id or resource_id",
        });
      }

      let receiverId;
      let amount;
      let title;
      let location;
      let paymentType;

      /*
      =================================================
      TASK PAYMENT
      =================================================
      */

      if (task_id) {
        const [tasks] =
          await db.execute(
            `SELECT
              id,
              user_id,
              title,
              location,
              reward,
              college_id
             FROM tasks
             WHERE id = ?
               AND college_id = ?
             LIMIT 1`,
            [
              task_id,
              activeCollegeId,
            ]
          );

        if (tasks.length === 0) {
          return res.status(404).json({
            success: false,
            message:
              "Task not found in the active college",
          });
        }

        const task = tasks[0];

        /*
        Only task owner can pay
        */

        if (
          Number(task.user_id) !==
          Number(userId)
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Only the task owner can pay the helper",
          });
        }

        /*
        Find latest acceptance
        */

        const [acceptances] =
          await db.execute(
            `SELECT
              id,
              helper_id,
              status,
              payment_status,
              payment_transaction_id
             FROM acceptances
             WHERE task_id = ?
             ORDER BY id DESC
             LIMIT 1`,
            [task_id]
          );

        if (acceptances.length === 0) {
          return res.status(409).json({
            success: false,
            message:
              "No helper has accepted this task yet",
          });
        }

        const acceptance =
          acceptances[0];

        /*
        Make sure helper is accepted
        */

        if (
          String(
            acceptance.status || ""
          ).toLowerCase() !==
          "accepted"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "The task does not have an active helper",
          });
        }

        /*
        Do not create another order after
        task has already been paid.
        */

        if (
          String(
            acceptance.payment_status || ""
          ).toLowerCase() === "paid"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "This task has already been paid",
          });
        }

        receiverId =
          acceptance.helper_id;

        if (
          Number(receiverId) ===
          Number(userId)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "You cannot pay yourself",
          });
        }

        amount = Number(task.reward);

        title = task.title;

        location =
          task.location;

        paymentType = "task";
      }

      /*
      =================================================
      RESOURCE PAYMENT
      =================================================
      */

      else {
        const [resources] =
          await db.execute(
            `SELECT
              id,
              user_id,
              title,
              location,
              borrowing_fee,
              availability,
              college_id
             FROM resources
             WHERE id = ?
               AND college_id = ?
             LIMIT 1`,
            [
              resource_id,
              activeCollegeId,
            ]
          );

        if (resources.length === 0) {
          return res.status(404).json({
            success: false,
            message:
              "Resource not found in the active college",
          });
        }

        const resource =
          resources[0];

        if (
          Number(resource.user_id) ===
          Number(userId)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "You cannot pay yourself",
          });
        }

        if (
          String(
            resource.availability || ""
          ).toLowerCase() !==
          "available"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Resource is not available",
          });
        }

        /*
        Prevent duplicate pending
        resource payments.
        */

        const [existingPayments] =
          await db.execute(
            `SELECT
              id,
              status
             FROM payments
             WHERE resource_id = ?
               AND payer_id = ?
               AND status = 'pending'
             ORDER BY id DESC
             LIMIT 1`,
            [
              resource_id,
              userId,
            ]
          );

        if (
          existingPayments.length > 0
        ) {
          return res.status(409).json({
            success: false,
            message:
              "A payment is already in progress for this resource.",
          });
        }

        receiverId =
          resource.user_id;

        amount =
          Number(
            resource.borrowing_fee
          );

        title =
          resource.title;

        location =
          resource.location;

        paymentType =
          "resource";
      }

      /*
      =================================================
      VALIDATE AMOUNT
      =================================================
      */

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount must be greater than zero",
        });
      }

      /*
      =================================================
      CREATE RAZORPAY ORDER
      =================================================
      */

      const order =
        await razorpay.orders.create({
          amount:
            Math.round(
              amount * 100
            ),

          currency: "INR",

          receipt:
            `cs_${paymentType}_${task_id || resource_id}_${Date.now()}`,

          notes: {
            user_id:
              String(userId),

            receiver_id:
              String(receiverId),

            college_id:
              String(
                activeCollegeId
              ),

            task_id:
              task_id
                ? String(task_id)
                : "",

            resource_id:
              resource_id
                ? String(resource_id)
                : "",

            title:
              String(title || ""),

            location:
              String(
                location || ""
              ),
          },
        });

      /*
      =================================================
      SAVE PENDING PAYMENT
      =================================================
      */

      const [paymentResult] =
        await db.execute(
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

      return res.status(201).json({
        success: true,

        order: {
          id: order.id,

          amount:
            order.amount,

          currency:
            order.currency,
        },

        payment: {
          id:
            paymentResult.insertId,

          task_id:
            task_id || null,

          resource_id:
            resource_id || null,

          amount,

          title,

          location,

          receiver_id:
            receiverId,
        },

        razorpayKeyId:
          process.env
            .RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error(
        "Create Razorpay order error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create Razorpay order",
      });
    }
  }
);

/*
=====================================================
VERIFY RAZORPAY PAYMENT
POST /api/payments/verify-razorpay
=====================================================

IMPORTANT TASK FIX:

After Razorpay payment is verified:

1. payments.status = paid
2. payments.transaction_id = real Razorpay payment ID
3. payments.razorpay_payment_id = real ID
4. acceptances.payment_status = paid
5. acceptances.payment_transaction_id = real ID
6. acceptances.payment_network = Razorpay
7. acceptances.payment_amount = INR amount
8. acceptances.paid_at = NOW()

This prevents MyTasks from staying on
"Payment Pending".
=====================================================
*/

router.post(
  "/verify-razorpay",
  authenticateToken,
  async (req, res) => {
    try {
      const userId =
        req.user.userId;

      const activeCollegeId =
        getActiveCollegeId(req);

      if (!activeCollegeId) {
        return res.status(400).json({
          success: false,
          message:
            "Active college is required",
        });
      }

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;

      /*
      ===============================================
      VALIDATE RAZORPAY RESPONSE
      ===============================================
      */

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Razorpay payment verification details are required",
        });
      }

      /*
      ===============================================
      FIND PAYMENT
      ===============================================
      */

      const [payments] =
        await db.execute(
          `SELECT
            p.id,
            p.task_id,
            p.resource_id,
            p.payer_id,
            p.receiver_id,
            p.amount,
            p.status,
            p.payment_provider,
            p.razorpay_order_id,
            p.razorpay_payment_id,

            t.college_id AS task_college_id,

            r.college_id AS resource_college_id

           FROM payments p

           LEFT JOIN tasks t
             ON p.task_id = t.id

           LEFT JOIN resources r
             ON p.resource_id = r.id

           WHERE p.razorpay_order_id = ?

           LIMIT 1`,
          [
            razorpay_order_id,
          ]
        );

      if (
        payments.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Payment order not found",
        });
      }

      const payment =
        payments[0];

      /*
      ===============================================
      SECURITY:
      ONLY ORIGINAL PAYER
      ===============================================
      */

      if (
        Number(
          payment.payer_id
        ) !==
        Number(userId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to verify this payment",
        });
      }

      /*
      ===============================================
      VERIFY ACTIVE COLLEGE
      ===============================================
      */

      const paymentCollegeId =
        payment.task_id !== null
          ? Number(
              payment.task_college_id
            )
          : Number(
              payment.resource_college_id
            );

      if (
        paymentCollegeId !==
        activeCollegeId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This payment does not belong to your active college",
        });
      }

      /*
      ===============================================
      ALREADY PAID
      ===============================================

      IMPORTANT:
      Even if payments says "paid", make sure
      acceptances is also updated.

      This fixes old payments that were already
      marked paid but MyTasks still showed
      Payment Pending.
      ===============================================
      */

      if (
        String(
          payment.status || ""
        ).toLowerCase() ===
        "paid"
      ) {
        if (
          payment.task_id !== null
        ) {
          await db.execute(
            `UPDATE acceptances
             SET
               payment_status = 'paid',
               payment_transaction_id = ?,
               payment_network = 'Razorpay',
               payment_amount = ?,
               paid_at = COALESCE(
                 paid_at,
                 NOW()
               )
             WHERE task_id = ?
               AND helper_id = ?
               AND status = 'accepted'
             ORDER BY id DESC
             LIMIT 1`,
            [
              payment.razorpay_payment_id ||
                razorpay_payment_id,

              Number(
                payment.amount
              ),

              payment.task_id,

              payment.receiver_id,
            ]
          );
        }

        return res.json({
          success: true,

          message:
            "Payment already verified",

          payment_id:
            payment.id,

          payment: {
            id:
              payment.id,

            task_id:
              payment.task_id,

            resource_id:
              payment.resource_id,

            payer_id:
              payment.payer_id,

            receiver_id:
              payment.receiver_id,

            amount:
              Number(
                payment.amount
              ),

            status:
              "paid",

            payment_provider:
              "razorpay",

            razorpay_order_id:
              payment.razorpay_order_id,

            razorpay_payment_id:
              payment.razorpay_payment_id ||
              razorpay_payment_id,

            transaction_id:
              payment.razorpay_payment_id ||
              razorpay_payment_id,
          },

          transaction_id:
            payment.razorpay_payment_id ||
            razorpay_payment_id,
        });
      }

      /*
      ===============================================
      VERIFY RAZORPAY SIGNATURE
      ===============================================
      */

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env
              .RAZORPAY_KEY_SECRET
          )
          .update(
            `${razorpay_order_id}|${razorpay_payment_id}`
          )
          .digest("hex");

      if (
        expectedSignature !==
        razorpay_signature
      ) {
        await db.execute(
          `UPDATE payments
           SET
             status = 'failed',
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
          message:
            "Invalid Razorpay payment signature",
        });
      }

      /*
      ===============================================
      FETCH PAYMENT FROM RAZORPAY
      ===============================================
      */

      const razorpayPayment =
        await razorpay.payments.fetch(
          razorpay_payment_id
        );

      /*
      ===============================================
      VERIFY ORDER ID
      ===============================================
      */

      if (
        String(
          razorpayPayment.order_id
        ) !==
        String(
          razorpay_order_id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment does not belong to this order",
        });
      }

      /*
      ===============================================
      VERIFY AMOUNT
      ===============================================
      */

      const expectedAmountPaise =
        Math.round(
          Number(
            payment.amount
          ) * 100
        );

      if (
        Number(
          razorpayPayment.amount
        ) !==
        expectedAmountPaise
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount mismatch",
        });
      }

      /*
      ===============================================
      PAYMENT MUST BE CAPTURED
      ===============================================
      */

      if (
        razorpayPayment.status !==
        "captured"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Payment is not captured. Current status: ${razorpayPayment.status}`,
        });
      }

      const paymentMethod =
        razorpayPayment.method ||
        null;

      const upiId =
        razorpayPayment.vpa ||
        razorpayPayment.upi?.vpa ||
        null;

      /*
      ===============================================
      UPDATE MAIN PAYMENT RECORD
      ===============================================
      */

      await db.execute(
        `UPDATE payments
         SET
           status = 'paid',
           payment_method = ?,
           payment_provider = 'razorpay',
           razorpay_order_id = ?,
           razorpay_payment_id = ?,
           razorpay_signature = ?,
           transaction_id = ?,
           upi_id = ?,
           paid_at = NOW()
         WHERE id = ?`,
        [
          paymentMethod,

          razorpay_order_id,

          razorpay_payment_id,

          razorpay_signature,

          /*
          IMPORTANT:
          The REAL Razorpay payment ID is
          saved as transaction_id.
          */
          razorpay_payment_id,

          upiId,

          payment.id,
        ]
      );

      /*
      ===============================================
      TASK PAYMENT
      ===============================================

      THIS IS THE IMPORTANT FIX.

      MyTasks reads payment information from
      acceptances.

      Therefore update acceptances after the
      Razorpay payment succeeds.
      ===============================================
      */

      if (
        payment.task_id !== null
      ) {
        const [
          acceptanceUpdate,
        ] = await db.execute(
          `UPDATE acceptances
           SET
             payment_status = 'paid',
             payment_transaction_id = ?,
             payment_network = 'Razorpay',
             payment_amount = ?,
             paid_at = NOW()
           WHERE task_id = ?
             AND helper_id = ?
             AND status = 'accepted'
           ORDER BY id DESC
           LIMIT 1`,
          [
            /*
            REAL RAZORPAY PAYMENT ID
            */
            razorpay_payment_id,

            /*
            INR amount
            */
            Number(
              payment.amount
            ),

            payment.task_id,

            payment.receiver_id,
          ]
        );

        console.log(
          "Task acceptance payment update:",
          {
            taskId:
              payment.task_id,

            helperId:
              payment.receiver_id,

            transactionId:
              razorpay_payment_id,

            amount:
              Number(
                payment.amount
              ),

            affectedRows:
              acceptanceUpdate.affectedRows,
          }
        );

        /*
        If no accepted helper row was found,
        don't silently report success.
        */

        if (
          acceptanceUpdate.affectedRows ===
          0
        ) {
          console.error(
            "WARNING: Razorpay payment succeeded but no accepted acceptance was updated.",
            {
              taskId:
                payment.task_id,

              helperId:
                payment.receiver_id,

              paymentId:
                razorpay_payment_id,
            }
          );

          return res.status(409).json({
            success: false,

            message:
              "Payment was successful, but the accepted helper record could not be updated. Please contact support.",

            payment_id:
              payment.id,

            transaction_id:
              razorpay_payment_id,
          });
        }
      }

      /*
      ===============================================
      RESOURCE PAYMENT
      ===============================================
      */

      if (
        payment.resource_id !==
        null
      ) {
        const [
          borrowResult,
        ] = await db.execute(
          `UPDATE resources
           SET
             availability = 'Borrowed',
             borrowed_by = ?,
             borrowed_at = NOW()

           WHERE id = ?
             AND college_id = ?

             AND LOWER(
               COALESCE(
                 availability,
                 ''
               )
             ) = 'available'

             AND borrowed_by IS NULL`,
          [
            userId,

            payment.resource_id,

            activeCollegeId,
          ]
        );

        if (
          borrowResult.affectedRows ===
          0
        ) {
          return res.status(409).json({
            success: false,

            message:
              "Payment was successful, but this resource is no longer available. Please contact support for the payment/refund.",

            payment_id:
              payment.id,

            transaction_id:
              razorpay_payment_id,
          });
        }
      }

      /*
      ===============================================
      FINAL SUCCESS RESPONSE
      ===============================================
      */

      return res.json({
        success: true,

        message:
          "Payment verified successfully",

        payment_id:
          payment.id,

        payment: {
          id:
            payment.id,

          task_id:
            payment.task_id,

          resource_id:
            payment.resource_id,

          payer_id:
            payment.payer_id,

          receiver_id:
            payment.receiver_id,

          amount:
            Number(
              payment.amount
            ),

          status:
            "paid",

          payment_method:
            paymentMethod,

          payment_provider:
            "razorpay",

          razorpay_order_id:
            razorpay_order_id,

          /*
          REAL RAZORPAY PAYMENT ID
          */
          razorpay_payment_id:
            razorpay_payment_id,

          /*
          Same real ID stored as transaction ID
          */
          transaction_id:
            razorpay_payment_id,

          upi_id:
            upiId,

          paid_at:
            new Date(),
        },

        /*
        Also return it at root level
        so frontend can easily use it.
        */
        transaction_id:
          razorpay_payment_id,
      });
    } catch (error) {
      console.error(
        "Verify Razorpay payment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify Razorpay payment",
      });
    }
  }
);

/*
=====================================================
MANUAL PAYMENT RECORD
POST /api/payments
=====================================================
*/

router.post(
  "/",
  authenticateToken,
  async (req, res) => {
    try {
      const userId =
        req.user.userId;

      const activeCollegeId =
        getActiveCollegeId(req);

      if (!activeCollegeId) {
        return res.status(400).json({
          success: false,
          message:
            "Active college is required",
        });
      }

      const {
        task_id,
        payer_id,
        receiver_id,
        amount,
        status = "pending",
        transaction_id,
      } = req.body;

      if (
        !task_id ||
        !payer_id ||
        !receiver_id ||
        amount === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "task_id, payer_id, receiver_id and amount are required",
        });
      }

      /*
      Only allow authenticated user to create
      a payment as themselves.
      */

      if (
        Number(payer_id) !==
        Number(userId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only create a payment for yourself",
        });
      }

      /*
      Verify task belongs to active college.
      */

      const [tasks] =
        await db.execute(
          `SELECT
            id,
            user_id,
            college_id
           FROM tasks
           WHERE id = ?
             AND college_id = ?
           LIMIT 1`,
          [
            task_id,
            activeCollegeId,
          ]
        );

      if (
        tasks.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Task not found in the active college",
        });
      }

      const allowedStatuses =
        [
          "pending",
          "paid",
          "failed",
          "completed",
        ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment status",
        });
      }

      const [result] =
        await db.execute(
          `INSERT INTO payments
           (
             task_id,
             payer_id,
             receiver_id,
             amount,
             status,
             transaction_id
           )
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            task_id,

            payer_id,

            receiver_id,

            amount,

            status,

            transaction_id ||
              null,
          ]
        );

      return res.status(201).json({
        success: true,

        message:
          "Payment record created successfully",

        payment_id:
          result.insertId,
      });
    } catch (error) {
      console.error(
        "Create payment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while creating payment record",
      });
    }
  }
);

/*
=====================================================
GET MY PAYMENT RECEIPTS
GET /api/payments/my-receipts
=====================================================
*/

router.get(
  "/my-receipts",
  authenticateToken,
  async (req, res) => {
    try {
      const userId =
        req.user.userId;

      const activeCollegeId =
        getActiveCollegeId(req);

      if (!activeCollegeId) {
        return res.status(400).json({
          success: false,
          message:
            "Active college is required",
        });
      }

      const [payments] =
        await db.execute(
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
            t.college_id AS task_college_id,

            r.title AS resource_title,
            r.location AS resource_location,
            r.college_id AS resource_college_id

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

             AND (
               t.college_id = ?
               OR r.college_id = ?
             )

           ORDER BY p.paid_at DESC`,
          [
            userId,
            userId,
            activeCollegeId,
            activeCollegeId,
          ]
        );

      const receipts =
        payments.map(
          (payment) => {
            const isTaskPayment =
              payment.task_id !==
              null;

            return {
              payment_id:
                payment.id,

              task_id:
                payment.task_id,

              resource_id:
                payment.resource_id,

              type:
                isTaskPayment
                  ? "task"
                  : "resource",

              item_title:
                isTaskPayment
                  ? payment.task_title
                  : payment.resource_title,

              location:
                isTaskPayment
                  ? payment.task_location
                  : payment.resource_location,

              amount:
                Number(
                  payment.amount || 0
                ),

              status:
                payment.status,

              payment_method:
                payment.payment_method ||
                null,

              payment_provider:
                payment.payment_provider ||
                null,

              transaction_id:
                payment.transaction_id ||
                payment.razorpay_payment_id ||
                null,

              razorpay_order_id:
                payment.razorpay_order_id ||
                null,

              razorpay_payment_id:
                payment.razorpay_payment_id ||
                null,

              payment_upi_id:
                payment.upi_id ||
                null,

              payer: {
                id:
                  payment.payer_id,

                name:
                  payment.payer_name,

                email:
                  payment.payer_email,

                mobile:
                  payment.payer_mobile ||
                  null,

                upi_id:
                  payment.payer_upi_id ||
                  null,
              },

              receiver: {
                id:
                  payment.receiver_id,

                name:
                  payment.receiver_name,

                email:
                  payment.receiver_email,

                mobile:
                  payment.receiver_mobile ||
                  null,

                upi_id:
                  payment.receiver_upi_id ||
                  null,
              },

              created_at:
                payment.created_at,

              paid_at:
                payment.paid_at,
            };
          }
        );

      return res.json({
        success: true,
        receipts,
      });
    } catch (error) {
      console.error(
        "My payment receipts error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch payment receipts",
      });
    }
  }
);

/*
=====================================================
GET SINGLE PAYMENT RECEIPT
GET /api/payments/receipt/:paymentId
=====================================================
*/

router.get(
  "/receipt/:paymentId",
  authenticateToken,
  async (req, res) => {
    try {
      const paymentId =
        Number(
          req.params.paymentId
        );

      const userId =
        req.user.userId;

      const activeCollegeId =
        getActiveCollegeId(req);

      if (!activeCollegeId) {
        return res.status(400).json({
          success: false,
          message:
            "Active college is required",
        });
      }

      if (
        !Number.isInteger(
          paymentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment ID",
        });
      }

      const [payments] =
        await db.execute(
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
            t.college_id AS task_college_id,

            r.title AS resource_title,
            r.location AS resource_location,
            r.college_id AS resource_college_id

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

             AND (
               t.college_id = ?
               OR r.college_id = ?
             )

           LIMIT 1`,
          [
            paymentId,
            userId,
            userId,
            activeCollegeId,
            activeCollegeId,
          ]
        );

      if (
        payments.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Payment receipt not found",
        });
      }

      const payment =
        payments[0];

      const isTaskPayment =
        payment.task_id !== null;

      const itemTitle =
        isTaskPayment
          ? payment.task_title
          : payment.resource_title;

      const location =
        isTaskPayment
          ? payment.task_location
          : payment.resource_location;

      return res.json({
        success: true,

        receipt: {
          payment_id:
            payment.id,

          type:
            isTaskPayment
              ? "task"
              : "resource",

          item_title:
            itemTitle ||
            "Campus Payment",

          location:
            location ||
            "Campus",

          amount:
            Number(
              payment.amount || 0
            ),

          status:
            payment.status,

          payment_method:
            payment.payment_method ||
            null,

          payment_provider:
            payment.payment_provider ||
            null,

          transaction_id:
            payment.transaction_id ||
            payment.razorpay_payment_id ||
            null,

          razorpay_order_id:
            payment.razorpay_order_id ||
            null,

          razorpay_payment_id:
            payment.razorpay_payment_id ||
            null,

          payment_upi_id:
            payment.upi_id ||
            null,

          payer: {
            id:
              payment.payer_id,

            name:
              payment.payer_name,

            email:
              payment.payer_email,

            mobile:
              payment.payer_mobile ||
              null,

            upi_id:
              payment.payer_upi_id ||
              null,
          },

          receiver: {
            id:
              payment.receiver_id,

            name:
              payment.receiver_name,

            email:
              payment.receiver_email,

            mobile:
              payment.receiver_mobile ||
              null,

            upi_id:
              payment.receiver_upi_id ||
              null,
          },

          created_at:
            payment.created_at,

          paid_at:
            payment.paid_at,
        },
      });
    } catch (error) {
      console.error(
        "Payment receipt error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch payment receipt",
      });
    }
  }
);

/*
=====================================================
CANCEL RAZORPAY PAYMENT
PUT /api/payments/cancel/:paymentId
=====================================================
*/

router.put(
  "/cancel/:paymentId",
  authenticateToken,
  async (req, res) => {
    try {
      const paymentId =
        Number(
          req.params.paymentId
        );

      const userId =
        req.user.userId;

      const activeCollegeId =
        getActiveCollegeId(req);

      if (!activeCollegeId) {
        return res.status(400).json({
          success: false,
          message:
            "Active college is required",
        });
      }

      if (
        !Number.isInteger(
          paymentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment ID",
        });
      }

      /*
      ===============================================
      Make sure payment belongs to active college.
      ===============================================
      */

      const [payments] =
        await db.execute(
          `SELECT
            p.id,
            p.payer_id,
            p.status,

            t.college_id AS task_college_id,

            r.college_id AS resource_college_id

           FROM payments p

           LEFT JOIN tasks t
             ON p.task_id = t.id

           LEFT JOIN resources r
             ON p.resource_id = r.id

           WHERE p.id = ?

           LIMIT 1`,
          [paymentId]
        );

      if (
        payments.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found",
        });
      }

      const payment =
        payments[0];

      const paymentCollegeId =
        payment.task_college_id !==
        null
          ? Number(
              payment.task_college_id
            )
          : Number(
              payment.resource_college_id
            );

      if (
        paymentCollegeId !==
        activeCollegeId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This payment does not belong to your active college",
        });
      }

      if (
        Number(
          payment.payer_id
        ) !==
        Number(userId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to cancel this payment",
        });
      }

      if (
        payment.status !==
        "pending"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Payment cannot be cancelled because its status is '${payment.status}'`,
        });
      }

      const [result] =
        await db.execute(
          `UPDATE payments
           SET status = 'cancelled'
           WHERE id = ?
             AND payer_id = ?
             AND status = 'pending'`,
          [
            paymentId,
            userId,
          ]
        );

      if (
        result.affectedRows ===
        0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Payment was already changed",
        });
      }

      return res.json({
        success: true,

        message:
          "Payment cancelled successfully",

        payment_id:
          paymentId,
      });
    } catch (error) {
      console.error(
        "Cancel payment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while cancelling payment",
      });
    }
  }
);

module.exports = router;