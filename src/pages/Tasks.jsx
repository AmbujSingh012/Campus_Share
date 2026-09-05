
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getTasks } from "../api/api";

function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment information for each task
  const [paymentInfo, setPaymentInfo] = useState({});

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        setError("");

        const data = await getTasks();

        if (data.success) {
          setTasks(data.tasks);
        } else {
          setError("Failed to load tasks");
        }
      } catch (err) {
        console.error("Tasks API error:", err);
        setError("Unable to connect to backend");
      } finally {
        setLoading(false);
      }
    }

    loadTasks();

    // Load demo payment information saved in browser
    const savedPaymentInfo =
      JSON.parse(localStorage.getItem("campussharePayments")) || {};

    setPaymentInfo(savedPaymentInfo);
  }, []);

  const handleApply = (task) => {
    navigate("/task-payment", {
      state: {
        task: {
          ...task,

          // TaskPayment.jsx expects "budget"
          budget: task.reward,
        },
      },
    });
  };

  const getPaymentStatus = (task) => {
    return paymentInfo[task.id]?.paymentStatus || "Payment Required";
  };

  const getTransactionStatus = (task) => {
    return paymentInfo[task.id]?.transactionStatus || "Not Started";
  };

  const getTransactionId = (task) => {
    return paymentInfo[task.id]?.transactionId || "";
  };

  const getPaymentStatusStyle = (status) => {
    if (status === "Payment Successful") {
      return styles.successStatus;
    }

    if (status === "Processing") {
      return styles.processingStatus;
    }

    if (status === "Payment Failed") {
      return styles.failedStatus;
    }

    return styles.requiredStatus;
  };

  const getTransactionStatusStyle = (status) => {
    if (status === "Completed") {
      return styles.successStatus;
    }

    if (status === "Processing") {
      return styles.processingStatus;
    }

    if (status === "Failed") {
      return styles.failedStatus;
    }

    return styles.requiredStatus;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Tasks</h1>
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1>Tasks</h1>

        <p style={styles.error}>
          {error}
        </p>

        <p>
          Make sure the CampusShare backend is running on
          port 3000.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>

      <h1>Campus Tasks</h1>

      <p style={styles.subtitle}>
        Tasks, rewards and payment status from the CampusShare
        backend.
      </p>

      {tasks.length === 0 ? (
        <p>No tasks available.</p>
      ) : (
        <div style={styles.grid}>

          {tasks.map((task) => {

            const paymentStatus = getPaymentStatus(task);
            const transactionStatus =
              getTransactionStatus(task);
            const transactionId =
              getTransactionId(task);

            return (
              <div
                key={task.id}
                style={styles.card}
              >

                {/* Task title */}
                <h2>
                  {task.title}
                </h2>

                {/* Description */}
                <p style={styles.description}>
                  {task.description ||
                    "No description provided"}
                </p>

                {/* Task information */}
                <p>
                  <strong>Category:</strong>{" "}
                  {task.category ||
                    "Not specified"}
                </p>

                <p>
                  <strong>Location:</strong>{" "}
                  {task.location ||
                    "Not specified"}
                </p>

                <p>
                  <strong>Deadline:</strong>{" "}
                  {task.deadline ||
                    "Not specified"}
                </p>

                {/* Reward */}
                <div style={styles.rewardBox}>

                  <span style={styles.rewardLabel}>
                    Reward
                  </span>

                  <strong style={styles.rewardAmount}>
                    {task.reward ||
                      "Not specified"}
                  </strong>

                </div>

                {/* Task status */}
                <div style={styles.infoRow}>

                  <span>
                    Task Status
                  </span>

                  <span style={styles.taskStatus}>
                    {task.status ||
                      "Not specified"}
                  </span>

                </div>

                {/* Payment status */}
                <div style={styles.infoRow}>

                  <span>
                    Payment Status
                  </span>

                  <span
                    style={getPaymentStatusStyle(
                      paymentStatus
                    )}
                  >
                    {paymentStatus}
                  </span>

                </div>

                {/* Transaction status */}
                <div style={styles.infoRow}>

                  <span>
                    Transaction Status
                  </span>

                  <span
                    style={getTransactionStatusStyle(
                      transactionStatus
                    )}
                  >
                    {transactionStatus}
                  </span>

                </div>

                {/* Transaction ID */}
                {transactionId && (
                  <div style={styles.transactionBox}>

                    <span>
                      Transaction ID
                    </span>

                    <strong>
                      {transactionId}
                    </strong>

                  </div>
                )}

                {/* Apply button */}
                {task.status === "open" && (
                  <button
                    style={styles.applyButton}
                    onClick={() =>
                      handleApply(task)
                    }
                  >
                    {paymentStatus ===
                    "Payment Successful"
                      ? "Payment Completed"
                      : "Apply for Task"}
                  </button>
                )}

                {/* Non-open task */}
                {task.status !== "open" && (
                  <button
                    style={styles.disabledButton}
                    disabled
                  >
                    Task {task.status}
                  </button>
                )}

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  subtitle: {
    color: "#666",
    marginBottom: "25px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow:
      "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e5e7eb",
  },

  description: {
    color: "#555",
    lineHeight: "1.5",
  },

  rewardBox: {
    marginTop: "18px",
    marginBottom: "15px",
    padding: "15px",
    borderRadius: "10px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rewardLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#374151",
  },

  rewardAmount: {
    fontSize: "20px",
    color: "#2563eb",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "10px 0",
    borderBottom:
      "1px solid #f0f0f0",
    fontSize: "14px",
  },

  taskStatus: {
    fontWeight: "600",
    textTransform: "capitalize",
  },

  requiredStatus: {
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },

  processingStatus: {
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },

  successStatus: {
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#dcfce7",
    color: "#166534",
  },

  failedStatus: {
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },

  transactionBox: {
    marginTop: "12px",
    padding: "10px",
    borderRadius: "8px",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    fontSize: "12px",
    wordBreak: "break-all",
  },

  applyButton: {
    width: "100%",
    marginTop: "18px",
    padding: "12px 16px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },

  disabledButton: {
    width: "100%",
    marginTop: "18px",
    padding: "12px 16px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#9ca3af",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "not-allowed",
  },

  error: {
    color: "red",
    fontWeight: "600",
  },
};

export default Tasks;