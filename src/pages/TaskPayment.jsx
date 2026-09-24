import API_BASE_URL from "../api";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, Coins, Info, Loader2, Network, ReceiptText, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import BottomNavigation from "../components/BottomNavigation";
import "./TaskPayment.css";
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
              x402 • Algorand Testnet
            </div>

            <h1>Complete your task payment</h1>

            <p>
              Pay the task reward securely through Pera Wallet.
              The x402 flow handles payment verification automatically.
            </p>
          </div>

          <div className="task-payment-body">

            <div className="task-payment-task">
              <div className="task-payment-task-label">
                Task you are accepting
              </div>

              <h2>{task.title}</h2>

              <p className="task-payment-description">
                {task.description || "No description provided for this task."}
              </p>

              <div className="task-payment-reward">
                <span>
                  <Coins size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />
                  Task reward
                </span>
                <strong>{task.reward} USDC</strong>
              </div>
            </div>

            <div className="task-payment-section">
              <div className="task-payment-section-title">
                <div className="task-payment-section-title-icon">
                  <WalletCards size={20} />
                </div>
                <strong>Pera Wallet</strong>
              </div>

              {walletAddress ? (
                <div className="task-payment-wallet">
                  <div className="task-payment-wallet-icon">
                    <ShieldCheck size={22} />
                  </div>

                  <div className="task-payment-wallet-content">
                    <span>Wallet connected</span>
                    <div className="task-payment-wallet-address">
                      {walletAddress}
                    </div>
                  </div>

                  <CheckCircle2 size={21} color="#16a34a" />
                </div>
              ) : (
                <button
                  type="button"
                  className="task-payment-connect"
                  onClick={connectWallet}
                >
                  <WalletCards size={18} style={{ verticalAlign: "-4px", marginRight: 8 }} />
                  Connect Pera Wallet
                </button>
              )}
            </div>

            <div className="task-payment-section">
              <div className="task-payment-section-title">
                <div className="task-payment-section-title-icon">
                  <ReceiptText size={20} />
                </div>
                <strong>Payment status</strong>
              </div>

              <div className="task-payment-status-grid">

                <div className="task-payment-status">
                  <div className="task-payment-status-label">
                    Payment
                  </div>

                  <div
                    className={`task-payment-status-value ${
                      paymentStatus === "Payment Successful"
                        ? "success"
                        : paymentStatus === "Payment Failed"
                        ? "failed"
                        : paymentStatus === "Processing"
                        ? "processing"
                        : "required"
                    }`}
                  >
                    {paymentStatus === "Payment Successful" ? (
                      <CheckCircle2 size={18} />
                    ) : paymentStatus === "Payment Failed" ? (
                      <CircleAlert size={18} />
                    ) : paymentStatus === "Processing" ? (
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
                      transactionStatus === "Completed"
                        ? "success"
                        : transactionStatus === "Failed"
                        ? "failed"
                        : transactionStatus === "Processing"
                        ? "processing"
                        : "required"
                    }`}
                  >
                    {transactionStatus === "Completed" ? (
                      <CheckCircle2 size={18} />
                    ) : transactionStatus === "Failed" ? (
                      <CircleAlert size={18} />
                    ) : transactionStatus === "Processing" ? (
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
                    Transaction ID
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
                <span>{error}</span>
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
                    <WalletCards size={18} style={{ verticalAlign: "-4px", marginRight: 8 }} />
                    Pay {task.reward} USDC with Pera
                  </>
                )}
              </button>

              <button
                type="button"
                className="task-payment-back-button"
                onClick={() => navigate("/tasks")}
              >
                Back to Tasks
              </button>
            </div>

            <p className="task-payment-note">
              <Info size={16} />
              <span>
                Payment uses x402 on Algorand Testnet with USDC.
                Pera Wallet will ask you to approve the transaction.
              </span>
            </p>

          </div>
        </div>
      </div>

      <BottomNavigation active="tasks" />
    </div>
  );
}

}

export default TaskPayment;
