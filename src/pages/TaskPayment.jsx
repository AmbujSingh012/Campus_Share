import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/TaskPayment.css";

function TaskPayment() {
  const navigate = useNavigate();
  const location = useLocation();

  const task = location.state?.task;

  const [paymentStatus, setPaymentStatus] = useState("Payment Required");

  // If user opens this page directly without selecting a task
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

  const handlePayment = () => {
    setPaymentStatus("Processing");

    // Demo payment simulation
    setTimeout(() => {
      setPaymentStatus("Payment Successful");
    }, 1500);
  };

  const handleBack = () => {
    navigate("/tasks");
  };

  return (
    <div className="payment-page">

      {/* Header */}
      <header className="payment-header">
        <button className="payment-back" onClick={handleBack}>
          ←
        </button>

        <h1>Task Payment</h1>

        <div className="header-space"></div>
      </header>

      <main className="payment-content">

        {/* Task Information */}
        <div className="payment-task-card">

          <div className="task-payment-icon">
            💳
          </div>

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

          {/* Task Details */}
          <div className="task-details">

            <div className="detail-row">
              <span>Posted by</span>
              <strong>{task.postedBy}</strong>
            </div>

            <div className="detail-row">
              <span>Location</span>
              <strong>{task.location}</strong>
            </div>

            <div className="detail-row">
              <span>Deadline</span>
              <strong>{task.deadline}</strong>
            </div>

          </div>

          {/* Payment Status */}
          <div className="payment-status-section">

            <span className="status-label">
              Payment Status
            </span>

            <span
              className={`payment-status ${
                paymentStatus === "Payment Required"
                  ? "status-required"
                  : paymentStatus === "Processing"
                  ? "status-processing"
                  : "status-success"
              }`}
            >
              {paymentStatus}
            </span>

          </div>

          {/* Pay Button */}
          {paymentStatus === "Payment Required" && (
            <button
              className="pay-button"
              onClick={handlePayment}
            >
              Pay {task.budget}
            </button>
          )}

          {/* Processing */}
          {paymentStatus === "Processing" && (
            <button className="pay-button processing-button" disabled>
              Processing Payment...
            </button>
          )}

          {/* Success */}
          {paymentStatus === "Payment Successful" && (
            <div className="success-section">

              <div className="success-icon">
                ✓
              </div>

              <h3>Payment Successful</h3>

              <p>
                Your payment for this task has been completed.
              </p>

              <button
                className="continue-button"
                onClick={handleBack}
              >
                Back to Tasks
              </button>

            </div>
          )}

        </div>

      </main>
    </div>
  );
}

export default TaskPayment;