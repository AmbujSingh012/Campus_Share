import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  connectPeraWallet,
  reconnectPeraWallet,
  getPeraAddress,
  createX402PaidFetch,
} from "../utils/peraX402";

function TaskPayment() {
  const location = useLocation();
  const navigate = useNavigate();

  const task = location.state?.task;

  const [walletAddress, setWalletAddress] = useState("");
  const [paymentStatus, setPaymentStatus] =
    useState("Payment Required");

  const [transactionStatus, setTransactionStatus] =
    useState("Not Started");

  const [transactionId, setTransactionId] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    reconnectPeraWallet().then((address) => {
      if (address) {
        setWalletAddress(address);
      }
    });
  }, []);

  if (!task) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>Task not found</h2>

        <button onClick={() => navigate("/tasks")}>
          Back to Tasks
        </button>
      </div>
    );
  }

  const connectWallet = async () => {
    try {
      setError("");

      const address =
        await connectPeraWallet();

      setWalletAddress(address);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Failed to connect Pera Wallet"
      );
    }
  };

  const handlePayment = async () => {
    try {
      setError("");

      if (!walletAddress) {
        await connectWallet();
        return;
      }

      setLoading(true);

      setPaymentStatus("Processing");
      setTransactionStatus("Processing");

      /*
       * IMPORTANT:
       * x402 automatically performs:
       *
       * 1. Request protected API
       * 2. Backend returns HTTP 402
       * 3. x402 creates payment transaction
       * 4. Pera Wallet asks user to sign
       * 5. x402 retries request with payment
       * 6. Backend verifies + settles payment
       */

      const paidFetch =
        await createX402PaidFetch();

      const token =
        localStorage.getItem("token");

      const response =
        await paidFetch(
          `http://localhost:3000/api/tasks/${task.id}/accept`,
          {
            method: "POST",
            headers: {
              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({}),
          }
        );

      const data =
        await response.json();

      console.log(
        "x402 payment response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Payment failed (${response.status})`
        );
      }

      setPaymentStatus(
        "Payment Successful"
      );

      setTransactionStatus(
        "Completed"
      );

      /*
       * x402 settlement response normally
       * contains transaction information.
       */
      const paymentResponse =
        response.headers.get(
          "PAYMENT-RESPONSE"
        );

      if (paymentResponse) {
        try {
          const decoded =
            JSON.parse(
              atob(paymentResponse)
            );

          console.log(
            "PAYMENT-RESPONSE:",
            decoded
          );

          setTransactionId(
            decoded?.transaction ||
              decoded?.txHash ||
              decoded?.transactionId ||
              ""
          );
        } catch (decodeError) {
          console.log(
            "Could not decode PAYMENT-RESPONSE",
            decodeError
          );
        }
      }

      /*
       * Return to Tasks after successful
       * payment so the user can see the
       * accepted task.
       */
      setTimeout(() => {
        navigate("/tasks");
      }, 2000);
    } catch (err) {
      console.error(
        "x402 payment error:",
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
          "Payment failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "16px",
          boxShadow:
            "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1>Task Payment</h1>

        <h2>{task.title}</h2>

        <p>
          <strong>Description:</strong>{" "}
          {task.description}
        </p>

        <p>
          <strong>Reward:</strong>{" "}
          {task.reward}
        </p>

        <hr />

        <h3>Pera Wallet</h3>

        {walletAddress ? (
          <p
            style={{
              wordBreak: "break-all",
            }}
          >
            Connected:
            <br />
            <strong>
              {walletAddress}
            </strong>
          </p>
        ) : (
          <button
            onClick={connectWallet}
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              background: "#2563eb",
              color: "white",
            }}
          >
            Connect Pera Wallet
          </button>
        )}

        <hr />

        <h3>Payment Status</h3>

        <p>
          <strong>
            {paymentStatus}
          </strong>
        </p>

        <h3>Transaction Status</h3>

        <p>
          {transactionStatus}
        </p>

        {transactionId && (
          <div>
            <h3>Transaction ID</h3>

            <p
              style={{
                wordBreak: "break-all",
                background: "#f5f5f5",
                padding: "10px",
                borderRadius: "8px",
              }}
            >
              {transactionId}
            </p>
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px",
              borderRadius: "8px",
              marginTop: "15px",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "15px",
            border: "none",
            borderRadius: "10px",
            background: loading
              ? "#9ca3af"
              : "#16a34a",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          {loading
            ? "Processing Payment..."
            : "Pay with Pera Wallet"}
        </button>

        <button
          onClick={() =>
            navigate("/tasks")
          }
          style={{
            width: "100%",
            marginTop: "10px",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "10px",
            background: "white",
            cursor: "pointer",
          }}
        >
          Back to Tasks
        </button>

        <p
          style={{
            marginTop: "20px",
            fontSize: "13px",
            color: "#666",
          }}
        >
          Payment uses x402 on Algorand
          Testnet with USDC. Pera Wallet
          will ask you to approve the
          transaction.
        </p>
      </div>
    </div>
  );
}

export default TaskPayment;