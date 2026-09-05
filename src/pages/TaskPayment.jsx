
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "../css/TaskPayment.css";

function TaskPayment() {
  const navigate = useNavigate();
  const location = useLocation();

  const task = location.state?.task;

  const [paymentStatus, setPaymentStatus] =
    useState("Payment Required");

  const [transactionStatus, setTransactionStatus] =
    useState("Not Started");

  const [transactionId, setTransactionId] =
    useState("");

  if (!task) {
    return (
      <div className="payment-page">
        <div className="payment-error-card">
          <h2>Task Not Found</h2>

          <p>Please select a task first.</p>

          <button
            className="back-button"
            onClick={() => navigate("/tasks")}
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  // Save payment information so Tasks.jsx can display it
  const savePaymentInfo = (
    newPaymentStatus,
    newTransactionStatus,
    newTransactionId = ""
  ) => {
    const savedPayments =
      JSON.parse(
        localStorage.getItem("campussharePayments")
      ) || {};

    savedPayments[task.id] = {
      paymentStatus: newPaymentStatus,
      transactionStatus: newTransactionStatus,
      transactionId: newTransactionId,
    };

    localStorage.setItem(
      "campussharePayments",
      JSON.stringify(savedPayments)
    );
  };

  const handlePayment = () => {
    setPaymentStatus("Processing");
    setTransactionStatus("Processing");
    setTransactionId("");

    savePaymentInfo(
      "Processing",
      "Processing",
      ""
    );

    // Demo payment simulation
    setTimeout(() => {
      const demoTransactionId =
        `TXN-DEMO-${Date.now()}`;

      setPaymentStatus("Payment Successful");
      setTransactionStatus("Completed");
      setTransactionId(demoTransactionId);

      savePaymentInfo(
        "Payment Successful",
        "Completed",
        demoTransactionId
      );
    }, 1500);
  };

  const handleFailedPayment = () => {
    setPaymentStatus("Payment Failed");
    setTransactionStatus("Failed");
    setTransactionId("");

    savePaymentInfo(
      "Payment Failed",
      "Failed",
      ""
    );
  };

  const handleRetry = () => {
    setPaymentStatus("Payment Required");
    setTransactionStatus("Not Started");
    setTransactionId("");

    savePaymentInfo(
      "Payment Required",
      "Not Started",
      ""
    );
  };

  const handleBack = () => {
    navigate("/tasks");
  };

  const getStatusClass = () => {
    if (paymentStatus === "Payment Required") {
      return "status-required";
    }

    if (paymentStatus === "Processing") {
      return "status-processing";
    }

    if (paymentStatus === "Payment Failed") {
      return "status-failed";
    }

    return "status-success";
  };

  return (
    <div className="payment-page">

      {/* Header */}
      <header className="payment-header">

        <button
          className="payment-back"
          onClick={handleBack}
        >
          ←
        </button>

        <h1>Task Payment</h1>

        <div className="header-space"></div>

      </header>

      <main className="payment-content">

        <div className="payment-task-card">

          {/* Payment icon */}
          <div className="task-payment-icon">
            💳
          </div>

          {/* Task title */}
          <h2>{task.title}</h2>

          <p className="payment-description">
            Complete payment to accept this task.
          </p>

          {/* Reward */}
          <div className="reward-section">

            <div className="reward-label">
              Reward
            </div>

            <div className="reward-amount">
              {task.budget}
            </div>

          </div>

          {/* Task details */}
          <div className="task-details">

            <div className="detail-row">
              <span>Posted by</span>

              <strong>
                {task.postedBy || "Campus User"}
              </strong>
            </div>

            <div className="detail-row">
              <span>Location</span>

              <strong>
                {task.location || "Not specified"}
              </strong>
            </div>

            <div className="detail-row">
              <span>Deadline</span>

              <strong>
                {task.deadline || "Not specified"}
              </strong>
            </div>

          </div>

          {/* Payment status */}
          <div className="payment-status-section">

            <span className="status-label">
              Payment Status
            </span>

            <span
              className={`payment-status ${getStatusClass()}`}
            >
              {paymentStatus}
            </span>

          </div>

          {/* Transaction status */}
          <div className="payment-status-section">

            <span className="status-label">
              Transaction Status
            </span>

            <span
              className={`payment-status ${
                transactionStatus === "Completed"
                  ? "status-success"
                  : transactionStatus === "Processing"
                  ? "status-processing"
                  : transactionStatus === "Failed"
                  ? "status-failed"
                  : "status-required"
              }`}
            >
              {transactionStatus}
            </span>

          </div>

          {/* Transaction ID */}
          {transactionId && (
            <div className="payment-status-section">

              <span className="status-label">
                Transaction ID
              </span>

              <strong
                style={{
                  fontSize: "13px",
                  wordBreak: "break-all",
                }}
              >
                {transactionId}
              </strong>

            </div>
          )}

          {/* Payment required */}
          {paymentStatus === "Payment Required" && (
            <>
              <button
                className="pay-button"
                onClick={handlePayment}
              >
                Pay {task.budget}
              </button>

              {/* Testing button for Day 4 failed state */}
              <button
                className="continue-button"
                onClick={handleFailedPayment}
                style={{
                  marginTop: "10px",
                  backgroundColor: "#dc2626",
                }}
              >
                Test Failed Payment
              </button>
            </>
          )}

          {/* Processing */}
          {paymentStatus === "Processing" && (
            <button
              className="pay-button processing-button"
              disabled
            >
              Processing Payment...
            </button>
          )}

          {/* Successful payment */}
          {paymentStatus === "Payment Successful" && (
            <div className="success-section">

              <div className="success-icon">
                ✓
              </div>

              <h3>
                Payment Successful
              </h3>

              <p>
                Your payment for this task has
                been completed.
              </p>

              <p>
                <strong>
                  Transaction Status: Completed
                </strong>
              </p>

              {transactionId && (
                <p
                  style={{
                    fontSize: "13px",
                    wordBreak: "break-all",
                  }}
                >
                  Transaction ID: {transactionId}
                </p>
              )}

              <button
                className="continue-button"
                onClick={handleBack}
              >
                Back to Tasks
              </button>

            </div>
          )}

          {/* Failed payment */}
          {paymentStatus === "Payment Failed" && (
            <div className="success-section">

              <div
                className="success-icon"
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                }}
              >
                ✕
              </div>

              <h3>
                Payment Failed
              </h3>

              <p>
                Your payment could not be completed.
                Please try again.
              </p>

              <p>
                <strong>
                  Transaction Status: Failed
                </strong>
              </p>

              <button
                className="pay-button"
                onClick={handleRetry}
              >
                Retry Payment
              </button>

              <button
                className="continue-button"
                onClick={handleBack}
                style={{
                  marginTop: "10px",
                }}
              >
                Back to Tasks
              </button>

            </div>
          )}

          {/* Demo notice */}
          <p
            style={{
              marginTop: "20px",
              fontSize: "12px",
              color: "#777",
              textAlign: "center",
            }}
          >
            Demo payment UI — real x402/Algorand
            payment will be connected through the
            backend integration.
          </p>

        </div>

      </main>

    </div>
  );
}

export default TaskPayment;