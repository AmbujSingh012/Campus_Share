import API_BASE_URL from "../api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Coins,
  CreditCard,
  History,
  Loader2,
  Network,
  ReceiptText,
} from "lucide-react";
import BottomNavigation from "../components/BottomNavigation";
import "./TransactionHistory.css";

function TransactionHistory() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTransactions() {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE_URL}/api/tasks/transactions/history`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to load transactions"
          );
        }

        setTransactions(data.transactions || []);
      } catch (err) {
        console.error("Transaction history error:", err);

        setError(
          err.message || "Unable to load transaction history"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  const paidCount = transactions.filter(
    (transaction) => transaction.payment_status === "paid"
  ).length;

  const pendingCount = transactions.filter(
    (transaction) =>
      transaction.payment_status !== "paid"
  ).length;

  const getPaymentStatusClass = (status) => {
    if (status === "paid") return "paid";

    if (
      status === "pending" ||
      status === "processing"
    ) {
      return "pending";
    }

    if (status === "failed") return "failed";

    return "default";
  };

  const getPaymentStatusLabel = (status) => {
    if (status === "paid") return "Paid";

    if (status === "processing") return "Processing";

    if (status === "failed") return "Failed";

    return status || "Pending";
  };

  return (
    <div className="transaction-history-page app-page-frame">
      <div className="transaction-history-shell">
        <header className="transaction-history-topbar">
          <button
            type="button"
            className="transaction-history-back"
            onClick={() => navigate("/profile")}
            aria-label="Back to profile"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="transaction-history-topbar-copy">
            <span>CampusShare</span>
            <strong>Transaction History</strong>
          </div>
        </header>

        <main className="transaction-history-content">
          <section className="transaction-history-hero">
            <div>
              <div className="transaction-history-eyebrow">
                <History size={12} />
                PAYMENT ACTIVITY
              </div>

              <h1>Your transactions.</h1>

              <p>
                Track your campus tasks, rewards and payment
                activity in one place.
              </p>
            </div>

            <div className="transaction-history-hero-icon">
              <ReceiptText size={31} />
            </div>
          </section>

          {!loading && !error && (
            <section className="transaction-history-summary">
              <div className="transaction-history-summary-card">
                <div className="transaction-history-summary-label">
                  Total
                </div>

                <div className="transaction-history-summary-value">
                  {transactions.length}
                </div>
              </div>

              <div className="transaction-history-summary-card">
                <div className="transaction-history-summary-label">
                  Paid
                </div>

                <div className="transaction-history-summary-value">
                  {paidCount}
                </div>
              </div>

              <div className="transaction-history-summary-card">
                <div className="transaction-history-summary-label">
                  Pending
                </div>

                <div className="transaction-history-summary-value">
                  {pendingCount}
                </div>
              </div>
            </section>
          )}

          {loading && (
            <section className="transaction-history-state">
              <div className="transaction-history-state-icon">
                <Loader2
                  size={28}
                  className="transaction-history-spinner"
                />
              </div>

              <h2>Loading transactions</h2>

              <p>
                We're fetching your latest task and payment
                activity.
              </p>
            </section>
          )}

          {!loading && error && (
            <section className="transaction-history-state">
              <div className="transaction-history-state-icon error">
                <CircleAlert size={28} />
              </div>

              <h2>Couldn't load transactions</h2>

              <p>{error}</p>
            </section>
          )}

          {!loading &&
            !error &&
            transactions.length === 0 && (
              <section className="transaction-history-state">
                <div className="transaction-history-state-icon">
                  <CreditCard size={27} />
                </div>

                <h2>No transactions yet</h2>

                <p>
                  Your task acceptance and payment activity
                  will appear here once you start using
                  CampusShare.
                </p>
              </section>
            )}

          {!loading &&
            !error &&
            transactions.length > 0 && (
              <section className="transaction-history-list">
                {transactions.map((transaction) => {
                  const paymentStatus =
                    transaction.payment_status || "pending";

                  return (
                    <article
                      key={transaction.id}
                      className="transaction-history-card"
                    >
                      <div className="transaction-history-card-header">
                        <div className="transaction-history-task-info">
                          <div className="transaction-history-task-label">
                            Campus Task
                          </div>

                          <h2 className="transaction-history-task-title">
                            {transaction.task_title ||
                              "Task"}
                          </h2>
                        </div>

                        <div className="transaction-history-reward">
                          <Coins size={13} />
                          {transaction.reward ?? "N/A"} USDC
                        </div>
                      </div>

                      <div className="transaction-history-details">
                        <div className="transaction-history-detail">
                          <span>Task ID</span>
                          <strong>
                            #{transaction.task_id}
                          </strong>
                        </div>

                        <div className="transaction-history-detail">
                          <span>Task Status</span>
                          <strong>
                            {transaction.status || "Unknown"}
                          </strong>
                        </div>

                        <div className="transaction-history-detail">
                          <span>Payment Status</span>

                          <strong>
                            <span
                              className={`transaction-history-status ${getPaymentStatusClass(
                                paymentStatus
                              )}`}
                            >
                              {paymentStatus === "paid" ? (
                                <CheckCircle2 size={12} />
                              ) : (
                                <Clock3 size={12} />
                              )}

                              {getPaymentStatusLabel(
                                paymentStatus
                              )}
                            </span>
                          </strong>
                        </div>
                      </div>

                      {transaction.payment_transaction_id && (
                        <div className="transaction-history-tx">
                          <div className="transaction-history-tx-label">
                            <ReceiptText size={12} />
                            Transaction ID
                          </div>

                          <div className="transaction-history-tx-value">
                            {
                              transaction.payment_transaction_id
                            }
                          </div>
                        </div>
                      )}

                      <div className="transaction-history-meta">
                        {transaction.payment_network && (
                          <div className="transaction-history-meta-item">
                            <Network size={12} />
                            Algorand Testnet
                          </div>
                        )}

                        {transaction.paid_at && (
                          <div className="transaction-history-meta-item">
                            <Clock3 size={12} />
                            {new Date(
                              transaction.paid_at
                            ).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
        </main>
      </div>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default TransactionHistory;
