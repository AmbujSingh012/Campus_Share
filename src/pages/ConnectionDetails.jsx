import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Coins,
  Loader2,
  MapPin,
  Network,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";

import API_BASE_URL, {
  getTaskConnection,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentReceipt,
} from "../api";

import BottomNavigation from "../components/BottomNavigation";
import "./ConnectionDetails.css";

function ConnectionDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const taskId =
    location.state?.taskId ||
    location.state?.task?.id;

  useEffect(() => {
    const loadConnection = async () => {
      if (!taskId) {
        setError("Task ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await getTaskConnection(taskId);

        console.log("Connection details:", result);

        setData(result);
      } catch (err) {
        console.error("Connection details error:", err);

        setError(
          err?.message ||
            "Unable to load connection details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadConnection();
  }, [taskId]);

  const handlePayHelper = async () => {
    if (!data?.task) {
      return;
    }

    const savedUser = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    const currentUserId = savedUser?.id;
    const ownerId = data.owner?.id;

    if (Number(currentUserId) !== Number(ownerId)) {
      setPaymentError(
        "Only the task owner can pay the helper."
      );
      return;
    }

    const reward = Number(data.task.reward);

    if (!reward || reward <= 0) {
      setPaymentError(
        "Invalid task reward amount."
      );
      return;
    }

    if (!window.Razorpay) {
      setPaymentError(
        "Razorpay checkout is not loaded. Please refresh the page and try again."
      );
      return;
    }

    try {
      setPaying(true);
      setPaymentError("");

      console.log("Creating Razorpay task payment order...");
      console.log("Task ID:", taskId);
      console.log("Reward:", reward);

      const orderData = await createRazorpayOrder({
        taskId,
      });

      if (!orderData?.success || !orderData?.order?.id) {
        throw new Error(
          orderData?.message ||
            "Unable to create Razorpay order."
        );
      }

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency || "INR",
        name: "CampusShare",
        description:
          data.task.title || "Task helper payment",
        order_id: orderData.order.id,

        prefill: {
          name: data.owner?.name || savedUser?.name || "",
          email: data.owner?.email || savedUser?.email || "",
          contact: data.owner?.mobile || savedUser?.mobile || "",
        },

        notes: {
          task_id: String(taskId),
          helper_id: String(data.helper?.id || ""),
        },

        theme: {
          color: "#2563EB",
        },

        handler: async function (response) {
          try {
            console.log(
              "Razorpay payment response:",
              response
            );

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
              "Razorpay verification:",
              verification
            );

            const paymentId =
              verification?.payment?.id ||
              verification?.payment_id ||
              orderData?.payment?.id;

            if (!paymentId) {
              throw new Error(
                "Payment succeeded, but receipt information was not returned."
              );
            }

            const receiptData =
              await getPaymentReceipt(paymentId);

            console.log(
              "Task payment receipt:",
              receiptData
            );

            if (
              !receiptData?.success ||
              !receiptData?.receipt
            ) {
              throw new Error(
                receiptData?.message ||
                  "Payment succeeded, but the receipt could not be loaded."
              );
            }

            const receipt =
              receiptData.receipt;

            setData((previous) => ({
              ...previous,
              payment: {
                ...(previous.payment || {}),
                status: "paid",
                transaction_id:
                  receipt.transaction_id ||
                  response.razorpay_payment_id,
                network:
                  receipt.payment_provider ||
                  "Razorpay",
                amount: Number(
                  receipt.amount || reward
                ),
                paid_at:
                  receipt.paid_at ||
                  new Date().toISOString(),
                payment_method:
                  receipt.payment_method ||
                  null,
                payment_provider:
                  receipt.payment_provider ||
                  "razorpay",
                razorpay_order_id:
                  receipt.razorpay_order_id ||
                  response.razorpay_order_id,
                razorpay_payment_id:
                  receipt.razorpay_payment_id ||
                  response.razorpay_payment_id,
                upi_id:
                  receipt.payment_upi_id ||
                  receipt.payer?.upi_id ||
                  null,
              },
            }));

            alert(
              "Payment successful! The helper has been paid."
            );
          } catch (err) {
            console.error(
              "Task Razorpay verification error:",
              err
            );

            setPaymentError(
              err?.message ||
                "Payment verification failed. Please check your payment status."
            );
          } finally {
            setPaying(false);
          }
        },

        modal: {
          ondismiss: function () {
            setPaying(false);
            setPaymentError(
              "Payment was cancelled."
            );
          },
        },
      };

      const razorpay = new window.Razorpay(
        options
      );

      razorpay.on(
        "payment.failed",
        function (response) {
          console.error(
            "Razorpay payment failed:",
            response
          );

          setPaymentError(
            response?.error?.description ||
              "Payment failed. Please try again."
          );

          setPaying(false);
        }
      );

      razorpay.open();
    } catch (err) {
      console.error(
        "Task Razorpay payment error:",
        err
      );

      setPaymentError(
        err?.message ||
          "Unable to start payment. Please try again."
      );

      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="connection-details-page app-page-frame">
        <div className="connection-details-state">
          <div className="connection-details-state-icon">
            <Loader2
              size={28}
              className="connection-details-spinner"
            />
          </div>

          <h2>Loading connection</h2>

          <p>
            We're getting the task, helper and
            payment details ready.
          </p>
        </div>

        <BottomNavigation active="tasks" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="connection-details-page">
        <div className="connection-details-shell">
          <header className="connection-details-topbar">
            <button
              type="button"
              className="connection-details-back"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="connection-details-topbar-copy">
              <span>CampusShare</span>
              <strong>Connection Details</strong>
            </div>
          </header>

          <div className="connection-details-state">
            <div className="connection-details-state-icon error">
              <CircleAlert size={28} />
            </div>

            <h2>Couldn't load connection</h2>

            <p>{error}</p>

            <button
              type="button"
              className="connection-details-action"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} />
              Go Back
            </button>
          </div>
        </div>

        <BottomNavigation active="tasks" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="connection-details-page">
        <div className="connection-details-state">
          <div className="connection-details-state-icon">
            <CircleAlert size={28} />
          </div>

          <h2>No connection found</h2>

          <p>
            We couldn't find connection details for
            this task.
          </p>
        </div>

        <BottomNavigation active="tasks" />
      </div>
    );
  }

  const savedUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const currentUserId = savedUser?.id;

  const isOwner =
    Number(currentUserId) ===
    Number(data.owner?.id);

  const isHelper =
    Number(currentUserId) ===
    Number(data.helper?.id);

  const paymentStatus =
    data.payment?.status || "pending";

  const isPaid =
    paymentStatus === "paid";

  const reward = Number(
    data.task?.reward || 0
  );

  const ownerName =
    data.owner?.name || "Task Owner";

  const helperName =
    data.helper?.name || "Accepted Helper";

  const ownerInitial =
    ownerName.charAt(0).toUpperCase();

  const helperInitial =
    helperName.charAt(0).toUpperCase();

  const taskStatus =
    data.task?.status || "N/A";

  return (
    <div className="connection-details-page">
      <div className="connection-details-shell">
        <header className="connection-details-topbar">
          <button
            type="button"
            className="connection-details-back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="connection-details-topbar-copy">
            <span>CampusShare</span>
            <strong>Connection Details</strong>
          </div>
        </header>

        <main className="connection-details-content">
          <section className="connection-details-hero">
            <div className="connection-details-hero-copy">
              <div className="connection-details-eyebrow">
                <Sparkles size={12} />
                TASK CONNECTION
              </div>

              <h1>You're connected.</h1>

              <p>
                Everything you need to coordinate the
                task, meet your helper and complete the
                reward payment is here.
              </p>
            </div>

            <div className="connection-details-hero-icon">
              <ShieldCheck size={32} />
            </div>
          </section>

          <div className="connection-details-grid">

            {/* TASK DETAILS */}
            <section className="connection-details-card">
              <div className="connection-details-card-heading">
                <div className="connection-details-card-icon">
                  <ReceiptText size={19} />
                </div>

                <div>
                  <h2>Task Details</h2>
                  <p>The task you're working on</p>
                </div>
              </div>

              <h3 className="connection-details-task-title">
                {data.task?.title || "Untitled Task"}
              </h3>

              <p className="connection-details-description">
                {data.task?.description ||
                  "No description provided."}
              </p>

              <div className="connection-details-info-grid">
                <div className="connection-details-info">
                  <span>Category</span>
                  <strong>
                    {data.task?.category || "N/A"}
                  </strong>
                </div>

                <div className="connection-details-info">
  <span>Reward</span>
  <strong className="connection-details-reward">
    ₹{reward.toFixed(2)}
  </strong>
</div>

                <div className="connection-details-info">
                  <span>Deadline</span>
                  <strong>
                    {data.task?.deadline
                      ? new Date(
                          data.task.deadline
                        ).toLocaleString()
                      : "N/A"}
                  </strong>
                </div>

                <div className="connection-details-info">
                  <span>Status</span>
                  <strong>
                    <span className="connection-details-status">
                      {taskStatus}
                    </span>
                  </strong>
                </div>
              </div>
            </section>

            {/* MEETING DETAILS */}
            <section className="connection-details-card">
              <div className="connection-details-card-heading">
                <div className="connection-details-card-icon purple">
                  <MapPin size={19} />
                </div>

                <div>
                  <h2>Meeting Details</h2>
                  <p>Where and when to connect</p>
                </div>
              </div>

              <div className="connection-details-meeting-list">
                <div className="connection-details-meeting-item">
                  <div className="connection-details-meeting-icon">
                    <MapPin size={17} />
                  </div>

                  <div>
                    <span>Location</span>
                    <strong>
                      {data.task?.location ||
                        "Not specified"}
                    </strong>
                  </div>
                </div>

                <div className="connection-details-meeting-item">
                  <div className="connection-details-meeting-icon">
                    <CalendarClock size={17} />
                  </div>

                  <div>
                    <span>Meeting Time</span>
                    <strong>
                      {data.task?.meeting_time
                        ? new Date(
                            data.task.meeting_time
                          ).toLocaleString()
                        : "Not specified"}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            {/* TASK OWNER */}
            <section className="connection-details-card">
              <div className="connection-details-card-heading">
                <div className="connection-details-card-icon">
                  <UserRound size={19} />
                </div>

                <div>
                  <h2>Task Owner</h2>
                  <p>Person who created this task</p>
                </div>
              </div>

              <div className="connection-details-person">
                <div className="connection-details-avatar">
                  {ownerInitial}
                </div>

                <div className="connection-details-person-info">
                  <h3>{ownerName}</h3>

                  <p>
                    {data.owner?.email ||
                      "Email not available"}
                  </p>

                  {/* MOBILE NUMBER */}
                  <div className="connection-details-mobile">
                    <Phone size={13} />
                    <span>
                      {data.owner?.mobile ||
                        "Mobile not available"}
                    </span>
                  </div>

                  <div className="connection-details-wallet">
                    <WalletCards size={11} />{" "}
                    {data.owner?.wallet_address ||
                      "Wallet not connected"}
                  </div>
                </div>
              </div>
            </section>

            {/* ACCEPTED HELPER */}
            <section className="connection-details-card">
              <div className="connection-details-card-heading">
                <div className="connection-details-card-icon purple">
                  <UserRound size={19} />
                </div>

                <div>
                  <h2>Accepted By</h2>
                  <p>Helper assigned to this task</p>
                </div>
              </div>

              <div className="connection-details-person">
                <div className="connection-details-avatar helper">
                  {helperInitial}
                </div>

                <div className="connection-details-person-info">
                  <h3>{helperName}</h3>

                  <p>
                    {data.helper?.email ||
                      "Email not available"}
                  </p>

                  {/* MOBILE NUMBER */}
                  <div className="connection-details-mobile">
                    <Phone size={13} />
                    <span>
                      {data.helper?.mobile ||
                        "Mobile not available"}
                    </span>
                  </div>

                  <div className="connection-details-wallet">
                    <WalletCards size={11} />{" "}
                    {data.helper?.wallet_address ||
                      "Wallet not connected"}
                  </div>
                </div>
              </div>
            </section>

            {/* PAYMENT DETAILS */}
            <section className="connection-details-card full connection-details-payment">
              <div className="connection-details-payment-content">
                <div className="connection-details-payment-header">
                  <div className="connection-details-card-heading">
                    <div className="connection-details-card-icon green">
                      <Coins size={19} />
                    </div>

                    <div>
                      <h2>Payment Details</h2>
                      <p>
                        Razorpay reward settlement
                      </p>
                    </div>
                  </div>

                  <div
                    className={`connection-details-payment-badge ${
                      isPaid ? "paid" : ""
                    }`}
                  >
                    {isPaid ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Clock3 size={13} />
                    )}

                    {isPaid
                      ? "Payment Completed"
                      : "Payment Pending"}
                  </div>
                </div>

                <div className="connection-details-payment-amount">
                  ₹
                  {Number(
                    data.payment?.amount ?? reward
                  ).toFixed(2)}
                </div>

                <div className="connection-details-payment-network">
                  <Network size={12} />{" "}
                  {data.payment?.payment_provider
                    ? "Razorpay"
                    : "Payment Gateway"}
                </div>

                <div className="connection-details-payment-details">
                  <div className="connection-details-payment-detail">
                    <span>Status</span>
                    <strong>
                      {isPaid ? "Paid" : "Pending"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Payment Method</span>
                    <strong>
                      {data.payment?.payment_method ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Task</span>
                    <strong>
                      {data.task?.title ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Location</span>
                    <strong>
                      {data.task?.location ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Payer Mobile</span>
                    <strong>
                      {data.payment?.payer?.mobile ||
                        data.owner?.mobile ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Helper Mobile</span>
                    <strong>
                      {data.payment?.receiver?.mobile ||
                        data.helper?.mobile ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Payer UPI</span>
                    <strong>
                      {data.payment?.payer?.upi_id ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Helper UPI</span>
                    <strong>
                      {data.payment?.receiver?.upi_id ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Razorpay Payment ID</span>
                    <strong>
                      {data.payment?.razorpay_payment_id ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Order ID</span>
                    <strong>
                      {data.payment?.razorpay_order_id ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="connection-details-payment-detail">
                    <span>Paid At</span>
                    <strong>
                      {data.payment?.paid_at
                        ? new Date(
                            data.payment.paid_at
                          ).toLocaleString()
                        : "Not available"}
                    </strong>
                  </div>
                </div>

                {data.payment?.transaction_id && (
                  <div className="connection-details-tx">
                    <div className="connection-details-tx-label">
                      <ReceiptText size={12} />
                      Transaction ID
                    </div>

                    <div className="connection-details-tx-value">
                      {data.payment.transaction_id}
                    </div>
                  </div>
                )}

                {paymentError && (
                  <div className="connection-details-error">
                    <CircleAlert size={16} />
                    <span>{paymentError}</span>
                  </div>
                )}

                {isOwner && !isPaid && (
                  <button
                    className="connection-details-action"
                    type="button"
                    onClick={handlePayHelper}
                    disabled={paying}
                  >
                    {paying ? (
                      <>
                        <Loader2
                          size={17}
                          className="connection-details-spinner"
                        />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Coins size={17} />
                        Pay Helper ₹
                        {reward.toFixed(2)}
                      </>
                    )}
                  </button>
                )}

                {isOwner && isPaid && (
                  <div className="connection-details-success">
                    <CheckCircle2 size={18} />
                    <span>
                      Reward successfully paid to helper.
                    </span>
                  </div>
                )}

                {isHelper && !isPaid && (
                  <div className="connection-details-pending">
                    <Clock3 size={18} />
                    <span>
                      Payment is pending. The task owner
                      will pay your reward.
                    </span>
                  </div>
                )}

                {isHelper && isPaid && (
                  <div className="connection-details-success">
                    <CheckCircle2 size={18} />
                    <span>
                      You have received the task reward.
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      <BottomNavigation active="tasks" />
    </div>
  );
}

export default ConnectionDetails;