import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import Header from "../components/Header";

import BottomNavigation from "../components/BottomNavigation";

import TaskCard from "../components/TaskCard";

import { getTasks, acceptTask } from "../api";

function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get currently logged-in user
  const savedUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const currentUserId = savedUser?.id;

  console.log("Current logged-in user:", savedUser);
  console.log("Current user ID:", currentUserId);

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        setError("");

        const data = await getTasks();

        console.log("Tasks API response:", data);

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
  }, []);

  const handleApply = async (task) => {
    try {
      setError("");

      const data = await acceptTask(task.id);

      if (data.success) {
        setTasks((previousTasks) =>
          previousTasks.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status: "accepted",
                  my_acceptance_status: "accepted",
                }
              : item
          )
        );

        alert("Task applied successfully!");
      } else {
        setError(
          data.message || "Failed to apply for task"
        );
      }
    } catch (err) {
      console.error("Apply task error:", err);

      setError(
        err.message || "Failed to apply for task"
      );
    }
  };

  const getPaymentStatus = (task) => {
    if (task.my_payment_status === "paid") {
      return "Reward Paid";
    }

    if (task.task_payment_status === "paid") {
      return "Reward Paid";
    }

    if (
      task.my_payment_status === "pending" ||
      task.task_payment_status === "pending"
    ) {
      return "Payment Pending";
    }

    return "Payment Pending";
  };

  const getTransactionStatus = (task) => {
    if (
      task.my_payment_status === "paid" ||
      task.task_payment_status === "paid"
    ) {
      return "Completed";
    }

    if (
      task.my_payment_status === "pending" ||
      task.task_payment_status === "pending"
    ) {
      return "Pending";
    }

    return "Not Started";
  };

  const getTransactionId = (task) => {
    if (task.my_transaction_id) {
      return task.my_transaction_id;
    }

    return task.task_transaction_id || "";
  };

  if (loading) {
    return (
      <div className="page">
        <Header title="CampusShare" />

        <main className="page-content">
          <h2>Campus Tasks</h2>

          <p>Loading tasks...</p>
        </main>

        <BottomNavigation active="tasks" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Header title="CampusShare" />

        <main className="page-content">
          <h2>Campus Tasks</h2>

          <p
            style={{
              color: "red",
              fontWeight: "600",
            }}
          >
            {error}
          </p>

          <p>
            Make sure the CampusShare backend is
            running on port 3000.
          </p>
        </main>

        <BottomNavigation active="tasks" />
      </div>
    );
  }

  return (
    <div className="page">
      <Header title="CampusShare" />

      <main className="page-content">
        <div className="welcome-section">
          <h2>Campus Tasks</h2>

          <p>
            Find tasks posted by students and earn
            rewards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/post-task")}
          style={{
            padding: "12px 20px",
            marginBottom: "20px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          + Post Task
        </button>

        {tasks.length === 0 ? (
          <p>No tasks available.</p>
        ) : (
          <div className="task-list">
            {tasks.map((task) => {
              const paymentStatus =
                getPaymentStatus(task);

              const transactionStatus =
                getTransactionStatus(task);

              const transactionId =
                getTransactionId(task);

              const postedBy =
                task.postedBy ||
                task.user_name ||
                task.user_id ||
                "Unknown";

              // Check if current logged-in user
              // is the person who posted the task.
              const isOwner =
                Number(currentUserId) ===
                Number(task.user_id);

              console.log(
                "Task:",
                task.id,
                "Task owner:",
                task.user_id,
                "Current user:",
                currentUserId,
                "Is owner:",
                isOwner
              );

              return (
                <div key={task.id}>
                  <TaskCard
                    id={task.id}
                    title={task.title}
                    budget={
                      task.reward || "Not specified"
                    }
                    deadline={
                      task.deadline || "Not specified"
                    }
                    postedBy={postedBy}
                    location={
                      task.location ||
                      "Not specified"
                    }
                    status={task.status}
                    paymentStatus={
                      task.task_payment_status
                    }
                    isOwner={isOwner}
                    onApply={handleApply}
                    onConnectionDetails={(taskId) =>
                      navigate(
                        "/connection-details",
                        {
                          state: {
                            taskId: taskId,
                          },
                        }
                      )
                    }
                  />

                  <div
                    style={{
                      background: "white",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "12px",
                      marginTop: "-8px",
                      marginBottom: "14px",
                      fontSize: "12px",
                    }}
                  >
                    <p
                      style={{
                        marginBottom: "8px",
                        color: "#64748B",
                      }}
                    >
                      {task.description ||
                        "No description provided"}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        padding: "5px 0",
                      }}
                    >
                      <span>Category</span>

                      <strong>
                        {task.category ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        padding: "5px 0",
                      }}
                    >
                      <span>Task Status</span>

                      <strong>
                        {task.status ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        padding: "5px 0",
                      }}
                    >
                      <span>Payment Status</span>

                      <strong>
                        {paymentStatus}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        padding: "5px 0",
                      }}
                    >
                      <span>
                        Transaction Status
                      </span>

                      <strong>
                        {transactionStatus}
                      </strong>
                    </div>

                    {transactionId && (
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "8px",
                          background: "#F8FAFC",
                          borderRadius: "6px",
                          wordBreak: "break-all",
                        }}
                      >
                        <strong>
                          Transaction ID:
                        </strong>

                        <br />

                        {transactionId}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNavigation active="tasks" />
    </div>
  );
}

export default Tasks;