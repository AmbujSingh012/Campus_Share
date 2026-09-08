import { useEffect, useState } from "react";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

const API_BASE_URL = "http://localhost:3000";

function TransactionHistory() {
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

  return (
    <div className="page">
      <Header title="Transaction History" />

      <main className="page-content">
        <div className="welcome-section">
          <h2>Transaction History</h2>
          <p>View your task acceptance and payment history.</p>
        </div>

        {loading && <p>Loading transactions...</p>}

        {error && (
          <p
            style={{
              color: "red",
              fontWeight: "600",
            }}
          >
            {error}
          </p>
        )}

        {!loading && !error && transactions.length === 0 && (
          <p>No transactions found.</p>
        )}

        {!loading &&
          !error &&
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              style={{
                background: "white",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {transaction.task_title || "Task"}
              </h3>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                }}
              >
                <span>Task ID</span>
                <strong>{transaction.task_id}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                }}
              >
                <span>Task Status</span>
                <strong>
                  {transaction.status || "Unknown"}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                }}
              >
                <span>Payment Status</span>
                <strong>
                  {transaction.payment_status === "paid"
                    ? "Paid"
                    : transaction.payment_status || "Pending"}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                }}
              >
                <span>Reward</span>
                <strong>
                  {transaction.reward ?? "N/A"}
                </strong>
              </div>

              {transaction.payment_transaction_id && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    background: "#F8FAFC",
                    borderRadius: "8px",
                    wordBreak: "break-all",
                    fontSize: "12px",
                  }}
                >
                  <strong>Transaction ID:</strong>
                  <br />
                  {transaction.payment_transaction_id}
                </div>
              )}

              {transaction.payment_network && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "#64748B",
                  }}
                >
                  <strong>Network:</strong>{" "}
                  Algorand Testnet
                </div>
              )}

              {transaction.paid_at && (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#64748B",
                  }}
                >
                  <strong>Paid At:</strong>{" "}
                  {new Date(
                    transaction.paid_at
                  ).toLocaleString()}
                </div>
              )}
            </div>
          ))}
      </main>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default TransactionHistory;
