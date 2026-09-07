
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import TaskCard from "../components/TaskCard";
import { getTasks } from "../api/api";

function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

    const savedPaymentInfo =
      JSON.parse(localStorage.getItem("campussharePayments")) || {};

    setPaymentInfo(savedPaymentInfo);
  }, []);

  const handleApply = (task) => {
    navigate("/task-payment", {
      state: {
        task: {
          ...task,
          budget: task.reward,
        },
      },
    });
  };

  const getPaymentStatus = (task) => {
    return (
      paymentInfo[task.id]?.paymentStatus ||
      "Payment Required"
    );
  };

  const getTransactionStatus = (task) => {
    return (
      paymentInfo[task.id]?.transactionStatus ||
      "Not Started"
    );
  };

  const getTransactionId = (task) => {
    return paymentInfo[task.id]?.transactionId || "";
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

          <p style={{ color: "red", fontWeight: "600" }}>
            {error}
          </p>

          <p>
            Make sure the CampusShare backend is running on
            port 3000.
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
            Find tasks posted by students and earn rewards.
          </p>
        </div>

        {tasks.length === 0 ? (
          <p>No tasks available.</p>
        ) : (
          <div className="task-list">
            {tasks.map((task) => {
              const paymentStatus = getPaymentStatus(task);
              const transactionStatus =
                getTransactionStatus(task);
              const transactionId = getTransactionId(task);

              const postedBy =
                task.postedBy ||
                task.user_name ||
                task.user_id ||
                "Unknown";

              return (
                <div key={task.id}>
                  <TaskCard
                    id={task.id}
                    title={task.title}
                    budget={task.reward || "Not specified"}
                    deadline={
                      task.deadline || "Not specified"
                    }
                    postedBy={postedBy}
                    location={
                      task.location || "Not specified"
                    }
                    onApply={handleApply}
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
                        justifyContent: "space-between",
                        padding: "5px 0",
                      }}
                    >
                      <span>Category</span>
                      <strong>
                        {task.category || "Not specified"}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "5px 0",
                      }}
                    >
                      <span>Task Status</span>
                      <strong>
                        {task.status || "Not specified"}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "5px 0",
                      }}
                    >
                      <span>Payment Status</span>
                      <strong>{paymentStatus}</strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "5px 0",
                      }}
                    >
                      <span>Transaction Status</span>
                      <strong>{transactionStatus}</strong>
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
                        <strong>Transaction ID:</strong>
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