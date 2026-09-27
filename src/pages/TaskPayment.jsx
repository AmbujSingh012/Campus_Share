import API_BASE_URL, {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../api";

import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Coins,
  Info,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import BottomNavigation from "../components/BottomNavigation";

import "./TaskPayment.css";

import { useEffect, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

function TaskPayment() {
  const location = useLocation();
  const navigate = useNavigate();

  const task = location.state?.task;

  const [paymentStatus, setPaymentStatus] =
    useState("Payment Required");

  const [transactionStatus, setTransactionStatus] =
    useState("Not Started");

  const [transactionId, setTransactionId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState(null);

  /*
   * Load logged-in user
   */
  useEffect(() => {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem("user") || "null"
      );

      setCurrentUser(savedUser);
    } catch (err) {
      console.error(
        "Unable to read logged-in user:",
        err
      );
    }
  }, []);

  /*
   * If page was opened without a task
   */
  if (!task) {
    return (
      <div className="task-payment-page app-page-frame">
        <div className="task-payment-shell">
          <div className="task-payment-topbar">
            <button
              type="button"
              className="task-payment-back"
              onClick={() => navigate("/tasks")}
              aria-label="Back to tasks"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="task-payment-topbar-copy">
              <span>CampusShare Payments</span>
              <strong>Secure task payment</strong>
            </div>
          </div>

          <div className="task-payment-card">
            <div className="task-payment-hero">
              <div className="task-payment-eyebrow">
                <Sparkles size={14} />
                Razorpay • INR
              </div>

              <h1>Task payment unavailable</h1>

              <p>
                No task was selected for payment.
                Please return to your tasks and try again.
              </p>
            </div>
          </div>
        </div>

        <BottomNavigation active="tasks" />
      </div>
    );
  }

  /*
   * Convert reward safely to INR
   */
  const rewardAmount = Number(task.reward);

  /*
   * Connect/check Razorpay Checkout
   */
  const handlePayment = async () => {
    try {
      setError("");

      if (loading) {
        return;
      }

      /*
       * User must be logged in
       */
      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Login session expired. Please log in again."
        );
      }

      /*
       * Only task owner can pay
       */
      if (
        task.user_id !== undefined &&
        currentUser?.id !== undefined &&
        Number(task.user_id) !==
          Number(currentUser.id)
      ) {
        throw new Error(
          "Only the task owner can pay the helper."
        );
      }

      /*
       * Validate reward
       */
      if (
        !Number.isFinite(rewardAmount) ||
        rewardAmount <= 0
      ) {
        throw new Error(
          "Invalid task reward amount."
        );
      }

      /*
       * Razorpay Checkout must be loaded
       */
      if (
        typeof window.Razorpay !==
        "function"
      ) {
        throw new Error(
          "Razorpay Checkout is not available. Please refresh the page and try again."
        );
      }

      setLoading(true);

      setPaymentStatus("Processing");
      setTransactionStatus("Processing");

      /*
       * -----------------------------------------
       * STEP 1
       * Create Razorpay order on backend
       * -----------------------------------------
       */
      const orderData =
        await createRazorpayOrder({
          taskId: task.id,
        });

      console.log(
        "Razorpay order response:",
        orderData
      );

      if (
        !orderData?.success ||
        !orderData?.order
      ) {
        throw new Error(
          orderData?.message ||
            "Unable to create Razorpay order."
        );
      }

      if (!orderData.razorpayKeyId) {
        throw new Error(
          "Razorpay Key ID was not returned by the server."
        );
      }

      /*
       * -----------------------------------------
       * STEP 2
       * Open Razorpay Checkout
       * -----------------------------------------
       */
      const options = {
        key: orderData.razorpayKeyId,

        amount:
          orderData.order.amount,

        currency:
          orderData.order.currency ||
          "INR",

        name: "CampusShare",

        description:
          orderData.payment?.title ||
          task.title ||
          "CampusShare Task Reward",

        order_id:
          orderData.order.id,

        prefill: {
          name:
            currentUser?.name || "",

          email:
            currentUser?.email || "",

          contact:
            currentUser?.mobile || "",
        },

        notes: {
          task_id: String(task.id),
          task_title:
            task.title || "",
          location:
            task.location || "",
        },

        theme: {
          color: "#2563eb",
        },

        /*
         * ---------------------------------------
         * STEP 3
         * Razorpay says payment successful
         * ---------------------------------------
         */
        handler: async function (
          response
        ) {
          try {
            console.log(
              "Razorpay payment response:",
              response
            );

            setPaymentStatus(
              "Processing"
            );

            setTransactionStatus(
              "Processing"
            );

            /*
             * Real Razorpay payment ID
             */
            const realTransactionId =
              response
                ?.razorpay_payment_id;

            if (!realTransactionId) {
              throw new Error(
                "Razorpay did not return a payment ID."
              );
            }

            /*
             * Show real ID immediately
             */
            setTransactionId(
              realTransactionId
            );

            /*
             * -----------------------------------
             * STEP 4
             * Verify payment on backend
             * -----------------------------------
             */
            const verification =
              await verifyRazorpayPayment({
                razorpay_order_id:
                  response.razorpay_order_id,

                razorpay_payment_id:
                  response.razorpay_payment_id,

                razorpay_signature:
                  response.razorpay_signature,
              });

            console.log(
              "Razorpay verification result:",
              verification
            );

            if (!verification?.success) {
              throw new Error(
                verification?.message ||
                  "Payment verification failed."
              );
            }

            /*
             * -----------------------------------
             * STEP 5
             * Payment is completely successful
             * -----------------------------------
             */
            const verifiedTransactionId =
              verification?.payment
                ?.transaction_id ||
              verification?.payment
                ?.razorpay_payment_id ||
              verification?.transaction_id ||
              realTransactionId;

            setTransactionId(
              verifiedTransactionId
            );

            setPaymentStatus(
              "Payment Successful"
            );

            setTransactionStatus(
              "Completed"
            );

            setError("");

            /*
             * Give backend/database a moment,
             * then return to MyTasks.
             */
            setTimeout(() => {
              navigate("/my-tasks", {
                replace: true,

                state: {
                  paymentSuccess: true,

                  taskId: task.id,

                  transactionId:
                    verifiedTransactionId,
                },
              });
            }, 1200);
          } catch (verificationError) {
            console.error(
              "Razorpay verification error:",
              verificationError
            );

            setPaymentStatus(
              "Payment Failed"
            );

            setTransactionStatus(
              "Failed"
            );

            setError(
              verificationError?.message ||
                "Payment was completed but verification failed."
            );

            setLoading(false);
          }
        },

        /*
         * User closes Razorpay without
         * completing payment
         */
        modal: {
          ondismiss: function () {
            console.log(
              "Razorpay checkout dismissed."
            );

            setPaymentStatus(
              "Payment Required"
            );

            setTransactionStatus(
              "Not Started"
            );

            setLoading(false);
          },
        },
      };

      /*
       * Create Razorpay checkout
       */
      const razorpayCheckout =
        new window.Razorpay(options);

      /*
       * Handle Razorpay failure
       */
      razorpayCheckout.on(
        "payment.failed",
        function (response) {
          console.error(
            "Razorpay payment failed:",
            response?.error
          );

          setPaymentStatus(
            "Payment Failed"
          );

          setTransactionStatus(
            "Failed"
          );

          setError(
            response?.error?.description ||
              "Payment failed. Please try again."
          );

          setLoading(false);
        }
      );

      /*
       * Open payment window
       */
      razorpayCheckout.open();
    } catch (err) {
      console.error(
        "Task payment error:",
        err
      );

      setPaymentStatus(
        "Payment Failed"
      );

      setTransactionStatus(
        "Failed"
      );

      setError(
        err?.message ||
          "Unable to start payment."
      );

      setLoading(false);
    }
  };

  return (
    <div className="task-payment-page app-page-frame">
      <div className="task-payment-shell">

        <div className="task-payment-topbar">
          <button
            type="button"
            className="task-payment-back"
            onClick={() =>
              navigate("/tasks")
            }
            aria-label="Back to tasks"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="task-payment-topbar-copy">
            <span>
              CampusShare Payments
            </span>

            <strong>
              Secure task payment
            </strong>
          </div>
        </div>

        <div className="task-payment-card">

          <div className="task-payment-hero">

            <div className="task-payment-eyebrow">
              <Sparkles size={14} />

              Razorpay • INR
            </div>

            <h1>
              Complete your task payment
            </h1>

            <p>
              Pay the task reward securely
              through Razorpay.
            </p>

          </div>

          <div className="task-payment-body">

            <div className="task-payment-task">

              <div className="task-payment-task-label">
                Task you are paying for
              </div>

              <h2>
                {task.title}
              </h2>

              <p className="task-payment-description">
                {task.description ||
                  "No description provided for this task."}
              </p>

              <div className="task-payment-reward">

                <span>
                  <Coins
                    size={15}
                    style={{
                      verticalAlign: "-3px",
                      marginRight: 5,
                    }}
                  />

                  Task reward
                </span>

                <strong>
                  ₹
                  {rewardAmount.toFixed(2)}
                </strong>

              </div>

            </div>

            <div className="task-payment-section">

              <div className="task-payment-section-title">

                <div className="task-payment-section-title-icon">
                  <WalletCards size={20} />
                </div>

                <strong>
                  Razorpay
                </strong>

              </div>

              <div className="task-payment-wallet">

                <div className="task-payment-wallet-icon">
                  <ShieldCheck size={22} />
                </div>

                <div className="task-payment-wallet-content">

                  <span>
                    Secure payment
                  </span>

                  <div className="task-payment-wallet-address">
                    UPI / Card / Net Banking
                  </div>

                </div>

                <CheckCircle2
                  size={21}
                  color="#16a34a"
                />

              </div>

            </div>

            <div className="task-payment-section">

              <div className="task-payment-section-title">

                <div className="task-payment-section-title-icon">
                  <ReceiptText size={20} />
                </div>

                <strong>
                  Payment status
                </strong>

              </div>

              <div className="task-payment-status-grid">

                <div className="task-payment-status">

                  <div className="task-payment-status-label">
                    Payment
                  </div>

                  <div
                    className={`task-payment-status-value ${
                      paymentStatus ===
                      "Payment Successful"
                        ? "success"
                        : paymentStatus ===
                          "Payment Failed"
                        ? "failed"
                        : paymentStatus ===
                          "Processing"
                        ? "processing"
                        : "required"
                    }`}
                  >

                    {paymentStatus ===
                    "Payment Successful" ? (
                      <CheckCircle2 size={18} />
                    ) : paymentStatus ===
                      "Payment Failed" ? (
                      <CircleAlert size={18} />
                    ) : paymentStatus ===
                      "Processing" ? (
                      <Clock3 size={18} />
                    ) : (
                      <Coins size={18} />
                    )}

                    {paymentStatus}

                  </div>

                </div>

                <div className="task-payment-status">

                  <div className="task-payment-status-label">
                    Transaction
                  </div>

                  <div
                    className={`task-payment-status-value ${
                      transactionStatus ===
                      "Completed"
                        ? "success"
                        : transactionStatus ===
                          "Failed"
                        ? "failed"
                        : transactionStatus ===
                          "Processing"
                        ? "processing"
                        : "required"
                    }`}
                  >

                    {transactionStatus ===
                    "Completed" ? (
                      <CheckCircle2 size={18} />
                    ) : transactionStatus ===
                      "Failed" ? (
                      <CircleAlert size={18} />
                    ) : transactionStatus ===
                      "Processing" ? (
                      <Clock3 size={18} />
                    ) : (
                      <ReceiptText size={18} />
                    )}

                    {transactionStatus}

                  </div>

                </div>

              </div>

              {transactionId && (
                <div className="task-payment-transaction">

                  <span className="task-payment-transaction-label">
                    Razorpay Transaction ID
                  </span>

                  <div className="task-payment-transaction-value">
                    {transactionId}
                  </div>

                </div>
              )}

            </div>

            {error && (
              <div className="task-payment-error">

                <CircleAlert size={19} />

                <span>
                  {error}
                </span>

              </div>
            )}

            <div className="task-payment-actions">

              <button
                type="button"
                className="task-payment-pay"
                onClick={handlePayment}
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="task-payment-spinner" />

                    Processing Payment...
                  </>
                ) : (
                  <>
                    <WalletCards
                      size={18}
                      style={{
                        verticalAlign: "-4px",
                        marginRight: 8,
                      }}
                    />

                    Pay ₹
                    {rewardAmount.toFixed(2)}
                    with Razorpay
                  </>
                )}

              </button>

              <button
                type="button"
                className="task-payment-back-button"
                onClick={() =>
                  navigate("/tasks")
                }
              >
                Back to Tasks
              </button>

            </div>

            <p className="task-payment-note">

              <Info size={16} />

              <span>
                Payment is processed securely
                through Razorpay in INR.
                After successful verification,
                the real Razorpay transaction ID
                is saved in CampusShare.
              </span>

            </p>

          </div>

        </div>

      </div>

      <BottomNavigation active="tasks" />

    </div>
  );
}

export default TaskPayment;