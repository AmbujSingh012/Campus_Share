import { useEffect, useState } from "react";
import {
  X,
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
  LoaderCircle,
} from "lucide-react";

function PaymentModal({
  isOpen,
  onClose,
  taskTitle = "Print OS Notes",
  amount = "0.10",
}) {
  const [paymentState, setPaymentState] = useState("required");

  useEffect(() => {
    if (isOpen) {
      setPaymentState("required");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Temporary frontend simulation.
  // Real x402 + Algorand payment will be connected later.
  const handleAccept = () => {
    setPaymentState("processing");

    setTimeout(() => {
      setPaymentState("success");
    }, 2000);
  };

  const handleRetry = () => {
    setPaymentState("required");
  };

  return (
    <div className="payment-overlay">
      <div className="payment-modal">

        {/* Close button */}
        <button className="payment-close" onClick={onClose}>
          <X size={20} />
        </button>

        {/* =========================
            ACCEPT TASK
        ========================= */}
        {paymentState === "required" && (
          <div className="payment-content">

            <div className="payment-icon payment-icon-blue">
              <Wallet size={30} />
            </div>

            <h2>Accept Task</h2>

            <p className="payment-subtitle">
              Accept this task and earn the reward after completing it.
            </p>

            <div className="payment-task-box">
              <span className="payment-label">Task</span>
              <strong>{taskTitle}</strong>
            </div>

            <div className="payment-amount-box">
              <span>You will earn</span>
              <strong>{amount} USDC</strong>
            </div>

            <button
              className="primary-button payment-button"
              onClick={handleAccept}
            >
              Accept Task
            </button>

            <button
              className="payment-cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>

          </div>
        )}

        {/* =========================
            PROCESSING
        ========================= */}
        {paymentState === "processing" && (
          <div className="payment-content">

            <div className="payment-icon payment-icon-blue">
              <LoaderCircle
                size={30}
                className="payment-spinner"
              />
            </div>

            <h2>Accepting Task</h2>

            <p className="payment-subtitle">
              Confirming the task and preparing your reward.
            </p>

            <div className="payment-processing-box">
              <Clock size={20} />
              <span>Processing...</span>
            </div>

            <div className="payment-amount-box">
              <span>Reward</span>
              <strong>{amount} USDC</strong>
            </div>

            <p className="payment-small-text">
              Please wait while the task is being accepted.
            </p>

          </div>
        )}

        {/* =========================
            SUCCESS
        ========================= */}
        {paymentState === "success" && (
          <div className="payment-content">

            <div className="payment-icon payment-icon-green">
              <CheckCircle size={34} />
            </div>

            <h2>Task Accepted!</h2>

            <p className="payment-subtitle">
              You have successfully accepted this task.
            </p>

            <div className="payment-success-box">

              <div>
                <span>Task</span>
                <strong>{taskTitle}</strong>
              </div>

              <div>
                <span>Reward</span>
                <strong>{amount} USDC</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>Accepted</strong>
              </div>

            </div>

            <button
              className="primary-button payment-button"
              onClick={onClose}
            >
              Continue
            </button>

          </div>
        )}

        {/* =========================
            FAILED
        ========================= */}
        {paymentState === "failed" && (
          <div className="payment-content">

            <div className="payment-icon payment-icon-red">
              <AlertCircle size={34} />
            </div>

            <h2>Unable to Accept</h2>

            <p className="payment-subtitle">
              We could not accept this task right now.
            </p>

            <div className="payment-error-box">
              <AlertCircle size={19} />

              <span>
                Please try again.
              </span>
            </div>

            <button
              className="primary-button payment-button"
              onClick={handleRetry}
            >
              Try Again
            </button>

            <button
              className="payment-cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

export default PaymentModal;