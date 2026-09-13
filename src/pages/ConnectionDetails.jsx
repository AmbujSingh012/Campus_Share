
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getTaskConnection } from "../api";

import {
  connectTaskPaymentWallet,
  payHelper,
} from "../utils/taskPayment";

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

  // Load connection details
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

  // Pay helper
  const handlePayHelper = async () => {
    if (!data?.task) {
      return;
    }

    // Get currently logged-in user
    const savedUser = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    const currentUserId = savedUser?.id;

    // Task owner
    const ownerId = data.owner?.id;

    // Only task owner can pay
    if (
      Number(currentUserId) !== Number(ownerId)
    ) {
      setPaymentError(
        "Only the task owner can pay the helper."
      );
      return;
    }

    // Check helper wallet
    if (!data.helper?.wallet_address) {
      setPaymentError(
        "Helper wallet is not connected."
      );
      return;
    }

    // Check owner wallet
    if (!data.owner?.wallet_address) {
      setPaymentError(
        "Your wallet is not connected."
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

    try {
      setPaying(true);
      setPaymentError("");

      console.log("Starting helper payment...");
      console.log(
        "Owner:",
        data.owner.wallet_address
      );
      console.log(
        "Helper:",
        data.helper.wallet_address
      );
      console.log("Reward:", reward);

      // Connect task owner's Pera wallet
      await connectTaskPaymentWallet();

      // Send USDC payment to helper
      const paymentResult = await payHelper({
        ownerAddress:
          data.owner.wallet_address,
        helperAddress:
          data.helper.wallet_address,
        reward,
      });

      console.log(
        "Payment result:",
        paymentResult
      );

      // payHelper() may return either:
      // 1. A transaction ID string
      // 2. An object containing transactionId
      const transactionId =
        typeof paymentResult === "string"
          ? paymentResult
          : paymentResult?.transactionId;

      console.log(
        "Extracted transaction ID:",
        transactionId
      );

      if (!transactionId) {
        throw new Error(
          "Transaction ID was not returned."
        );
      }

      // Get JWT token
      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Login session expired. Please log in again."
        );
      }

      console.log(
        "Sending payment verification..."
      );

      console.log("Task ID:", taskId);
      console.log(
        "Transaction ID:",
        transactionId
      );
      console.log(
        "Token exists:",
        !!token
      );

      // Tell backend to verify the transaction
      const response = await fetch(
        `http://localhost:3000/api/tasks/${taskId}/pay`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            transaction_id: transactionId,
          }),
        }
      );

      const result = await response.json();

      console.log(
        "Backend payment verification:",
        result
      );

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Backend payment verification failed."
        );
      }

      console.log(
        "Payment verified successfully:",
        result
      );

      // Update UI immediately
      setData((previous) => ({
        ...previous,

        payment: {
          ...(previous.payment || {}),

          status: "paid",

          transaction_id: transactionId,

          network: "Algorand Testnet",

          amount: reward,

          paid_at:
            new Date().toISOString(),
        },
      }));

      alert(
        "Payment successful! The helper has been paid."
      );
    } catch (err) {
      console.error(
        "Helper payment error:",
        err
      );

      setPaymentError(
        err?.message ||
          "Payment failed. Please try again."
      );
    } finally {
      setPaying(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
        }}
      >
        Loading connection details...
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div
        style={{
          padding: "24px",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            marginBottom: "20px",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <div
          style={{
            padding: "16px",
            borderRadius: "10px",
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  // No data
  if (!data) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
        }}
      >
        No connection details found.
      </div>
    );
  }

  // Current user
  const savedUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const currentUserId = savedUser?.id;

  // Only task creator is owner
  const isOwner =
    Number(currentUserId) ===
    Number(data.owner?.id);

  // Accepted helper
  const isHelper =
    Number(currentUserId) ===
    Number(data.helper?.id);

  // Payment status
  const paymentStatus =
    data.payment?.status || "pending";

  const isPaid =
    paymentStatus === "paid";

  const reward = Number(
    data.task?.reward || 0
  );

  console.log(
    "Current user ID:",
    currentUserId
  );

  console.log(
    "Task owner ID:",
    data.owner?.id
  );

  console.log(
    "Accepted helper ID:",
    data.helper?.id
  );

  console.log(
    "Is task owner:",
    isOwner
  );

  console.log(
    "Is accepted helper:",
    isHelper
  );

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "600px",
        margin: "0 auto",
        paddingBottom: "100px",
      }}
    >
      {/* Back button */}

      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          marginBottom: "20px",
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        ← Back
      </button>

      {/* Page title */}

      <h1
        style={{
          marginBottom: "20px",
        }}
      >
        Connection Details
      </h1>

      {/* Task Details */}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "18px",
          marginBottom: "16px",
          background: "#fff",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "14px",
          }}
        >
          Task Details
        </h2>

        <p>
          <strong>Title:</strong>{" "}
          {data.task?.title || "N/A"}
        </p>

        <p>
          <strong>Description:</strong>{" "}
          {data.task?.description || "N/A"}
        </p>

        <p>
          <strong>Category:</strong>{" "}
          {data.task?.category || "N/A"}
        </p>

        <p>
          <strong>Reward:</strong>{" "}
          {reward.toFixed(2)} USDC
        </p>

        <p>
          <strong>Deadline:</strong>{" "}
          {data.task?.deadline
            ? new Date(
                data.task.deadline
              ).toLocaleString()
            : "N/A"}
        </p>

        <p>
          <strong>Status:</strong>{" "}
          {data.task?.status || "N/A"}
        </p>
      </div>

      {/* Meeting Details */}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "18px",
          marginBottom: "16px",
          background: "#fff",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "14px",
          }}
        >
          Meeting Details
        </h2>

        <p>
          <strong>Location:</strong>{" "}
          {data.task?.location ||
            "Not specified"}
        </p>

        <p>
          <strong>Meeting Time:</strong>{" "}
          {data.task?.meeting_time
            ? new Date(
                data.task.meeting_time
              ).toLocaleString()
            : "Not specified"}
        </p>
      </div>

      {/* Task Owner */}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "18px",
          marginBottom: "16px",
          background: "#fff",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "14px",
          }}
        >
          Task Owner
        </h2>

        <p>
          <strong>Name:</strong>{" "}
          {data.owner?.name || "N/A"}
        </p>

        <p>
          <strong>Email:</strong>{" "}
          {data.owner?.email || "N/A"}
        </p>

        <p
          style={{
            wordBreak: "break-all",
          }}
        >
          <strong>Wallet:</strong>{" "}
          {data.owner?.wallet_address ||
            "Not connected"}
        </p>
      </div>

      {/* Accepted Helper */}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "18px",
          marginBottom: "16px",
          background: "#fff",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "14px",
          }}
        >
          Accepted By
        </h2>

        <p>
          <strong>Name:</strong>{" "}
          {data.helper?.name || "N/A"}
        </p>

        <p>
          <strong>Email:</strong>{" "}
          {data.helper?.email || "N/A"}
        </p>

        <p
          style={{
            wordBreak: "break-all",
          }}
        >
          <strong>Wallet:</strong>{" "}
          {data.helper?.wallet_address ||
            "Not connected"}
        </p>
      </div>

      {/* Payment Details */}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "18px",
          marginBottom: "16px",
          background: "#fff",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "14px",
          }}
        >
          Payment Details
        </h2>

        <p>
          <strong>Status:</strong>{" "}
          {isPaid
            ? "Payment Completed"
            : "Payment Pending"}
        </p>

        <p>
          <strong>Amount:</strong>{" "}
          {reward.toFixed(2)} USDC
        </p>

        <p>
          <strong>Network:</strong>{" "}
          {data.payment?.network ||
            "Algorand Testnet"}
        </p>

        <p
          style={{
            wordBreak: "break-all",
          }}
        >
          <strong>Transaction ID:</strong>{" "}
          {data.payment?.transaction_id ||
            "Not available yet"}
        </p>

        {/* Payment Error */}

        {paymentError && (
          <div
            style={{
              marginTop: "14px",
              padding: "12px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            {paymentError}
          </div>
        )}

        {/* OWNER ONLY: Pay Helper */}

        {isOwner && !isPaid && (
          <button
            className="primary-button"
            type="button"
            onClick={handlePayHelper}
            disabled={paying}
            style={{
              marginTop: "16px",
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              cursor: paying
                ? "not-allowed"
                : "pointer",
            }}
          >
            {paying
              ? "Processing Payment..."
              : `Pay Helper ${reward.toFixed(
                  2
                )} USDC`}
          </button>
        )}

        {/* OWNER ONLY: Paid */}

        {isOwner && isPaid && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "#dcfce7",
              color: "#166534",
              fontWeight: "600",
            }}
          >
            ✓ Reward successfully paid
            to helper
          </div>
        )}

        {/* HELPER: Payment Pending */}

        {isHelper && !isPaid && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#1e40af",
              fontWeight: "500",
            }}
          >
            Payment is pending. The task
            owner will pay your reward.
          </div>
        )}

        {/* HELPER: Payment Paid */}

        {isHelper && isPaid && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "#dcfce7",
              color: "#166534",
              fontWeight: "600",
            }}
          >
            ✓ You have received the task
            reward
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectionDetails;