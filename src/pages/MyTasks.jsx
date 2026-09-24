import API_BASE_URL from "../api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ListTodo,
  Plus,
  MapPin,
  Clock3,
  CheckCircle2,
  CircleDollarSign,
  UserRound,
  WalletCards,
  XCircle,
  Layers3,
} from "lucide-react";
import BottomNavigation from "../components/BottomNavigation";
import "./MyTasks.css";

function MyTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedCollege = JSON.parse(
    localStorage.getItem("selectedCollege") || "null"
  );

  const collegeName = selectedCollege?.name || "Your Campus";

  useEffect(() => {
    const loadMyTasks = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/tasks/my`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(
            data.message || "Failed to load your tasks"
          );
          return;
        }

        setTasks(data.tasks || []);
      } catch (error) {
        console.error("My tasks error:", error);
        setError("Unable to connect to backend");
      } finally {
        setLoading(false);
      }
    };

    loadMyTasks();
  }, [navigate]);

  const getTaskStatus = (task) => {
    const taskStatus = String(
      task.status || "open"
    ).toLowerCase();

    const acceptanceStatus = String(
      task.acceptance_status || ""
    ).toLowerCase();

    if (
      acceptanceStatus === "accepted" ||
      taskStatus === "accepted"
    ) {
      return {
        label: "Accepted",
        type: "accepted",
      };
    }

    if (
      taskStatus === "completed" ||
      taskStatus === "complete"
    ) {
      return {
        label: "Completed",
        type: "completed",
      };
    }

    if (
      taskStatus === "closed" ||
      taskStatus === "cancelled"
    ) {
      return {
        label:
          taskStatus === "cancelled"
            ? "Cancelled"
            : "Closed",
        type: "closed",
      };
    }

    return {
      label: "Open",
      type: "open",
    };
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return "No deadline";

    const date = new Date(deadline);

    if (Number.isNaN(date.getTime())) {
      return deadline;
    }

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const openTasks = tasks.filter(
    (task) => getTaskStatus(task).type === "open"
  ).length;

  const acceptedTasks = tasks.filter(
    (task) => getTaskStatus(task).type === "accepted"
  ).length;

  const totalRewards = tasks.reduce(
    (total, task) =>
      total + Number(task.reward || 0),
    0
  );

  return (
    <div className="my-tasks-modern-page app-page-frame">
      <div className="my-tasks-modern-shell">
        <header className="my-tasks-topbar">
          <button
            type="button"
            className="my-tasks-back"
            onClick={() => navigate("/profile")}
            aria-label="Back to profile"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="my-tasks-campus">
            <span className="my-tasks-campus-dot" />
            {collegeName}
          </div>

          <button
            type="button"
            className="my-tasks-add-top"
            onClick={() => navigate("/post-task")}
          >
            <Plus size={18} />
            <span>Post</span>
          </button>
        </header>

        <main className="my-tasks-content">
          <section className="my-tasks-heading">
            <div>
              <span className="my-tasks-eyebrow">
                YOUR CAMPUS TASKS
              </span>

              <h1>
                My
                <span> tasks.</span>
              </h1>

              <p>
                Keep track of the help you have requested
                from your campus community.
              </p>
            </div>

            <div className="my-tasks-heading-icon">
              <ListTodo size={30} />
            </div>
          </section>

          <section className="my-tasks-summary">
            <div className="my-tasks-summary-card">
              <div className="my-tasks-summary-icon blue">
                <Layers3 size={19} />
              </div>

              <div>
                <strong>{tasks.length}</strong>
                <span>Total tasks</span>
              </div>
            </div>

            <div className="my-tasks-summary-card">
              <div className="my-tasks-summary-icon purple">
                <Clock3 size={19} />
              </div>

              <div>
                <strong>{openTasks}</strong>
                <span>Open now</span>
              </div>
            </div>

            <div className="my-tasks-summary-card">
              <div className="my-tasks-summary-icon green">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <strong>{acceptedTasks}</strong>
                <span>Accepted</span>
              </div>
            </div>

            <div className="my-tasks-summary-card">
              <div className="my-tasks-summary-icon orange">
                <CircleDollarSign size={19} />
              </div>

              <div>
                <strong>
                  {totalRewards.toFixed(2)}
                </strong>
                <span>Total USDC</span>
              </div>
            </div>
          </section>

          {loading && (
            <div className="my-tasks-state-card">
              <div className="my-tasks-state-icon">
                <ListTodo size={26} />
              </div>

              <strong>Loading your tasks...</strong>

              <span>
                Just a moment while we fetch your posted
                tasks.
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="my-tasks-state-card error">
              <div className="my-tasks-state-icon">
                <XCircle size={26} />
              </div>

              <strong>Couldn’t load your tasks</strong>

              <span>{error}</span>

              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            tasks.length === 0 && (
              <div className="my-tasks-state-card">
                <div className="my-tasks-empty-visual">
                  <ListTodo size={32} />
                </div>

                <strong>
                  No tasks posted yet
                </strong>

                <span>
                  Need help with notes, printing,
                  deliveries or another campus task?
                  Post it here.
                </span>

                <button
                  type="button"
                  onClick={() => navigate("/post-task")}
                >
                  <Plus size={18} />
                  Post a task
                </button>
              </div>
            )}

          {!loading &&
            !error &&
            tasks.length > 0 && (
              <section className="my-tasks-list-section">
                <div className="my-tasks-list-header">
                  <div>
                    <span>YOUR REQUESTS</span>
                    <h2>Posted tasks</h2>
                  </div>

                  <span className="my-tasks-count">
                    {tasks.length}{" "}
                    {tasks.length === 1
                      ? "task"
                      : "tasks"}
                  </span>
                </div>

                <div className="my-tasks-list">
                  {tasks.map((task) => {
                    const status = getTaskStatus(task);

                    return (
                      <article
                        key={task.id}
                        className="my-task-card"
                      >
                        <div className="my-task-card-top">
                          <div className="my-task-icon">
                            <ListTodo size={23} />
                          </div>

                          <div className="my-task-main">
                            <div className="my-task-title-row">
                              <h3>{task.title}</h3>

                              <span
                                className={`my-task-status ${status.type}`}
                              >
                                {status.type ===
                                  "accepted" ||
                                status.type ===
                                  "completed" ? (
                                  <CheckCircle2
                                    size={13}
                                  />
                                ) : (
                                  <Clock3
                                    size={13}
                                  />
                                )}

                                {status.label}
                              </span>
                            </div>

                            <span className="my-task-category">
                              {task.category ||
                                "General"}
                            </span>
                          </div>
                        </div>

                        <p className="my-task-description">
                          {task.description ||
                            "No description provided."}
                        </p>

                        <div className="my-task-reward">
                          <div>
                            <CircleDollarSign
                              size={18}
                            />

                            <span>Reward</span>
                          </div>

                          <strong>
                            {Number(
                              task.reward || 0
                            ).toFixed(2)}{" "}
                            USDC
                          </strong>
                        </div>

                        <div className="my-task-meta">
                          <span>
                            <MapPin size={15} />
                            {task.location ||
                              "Campus location"}
                          </span>

                          <span>
                            <Clock3 size={15} />
                            Due{" "}
                            {formatDeadline(
                              task.deadline
                            )}
                          </span>
                        </div>

                        {task.helper_name && (
                          <div className="my-task-helper">
                            <div className="my-task-helper-icon">
                              <UserRound size={16} />
                            </div>

                            <div>
                              <span>
                                Accepted helper
                              </span>

                              <strong>
                                {task.helper_name}
                              </strong>
                            </div>
                          </div>
                        )}

                        {task.payment_status && (
                          <div className="my-task-payment">
                            <WalletCards size={16} />

                            <span>
                              Payment
                            </span>

                            <strong>
                              {
                                task.payment_status
                              }
                            </strong>
                          </div>
                        )}

                        {task.payment_transaction_id && (
                          <div className="my-task-transaction">
                            <span>
                              Transaction
                            </span>

                            <strong>
                              {
                                task.payment_transaction_id
                              }
                            </strong>
                          </div>
                        )}

                        <div className="my-task-divider" />

                        <div className="my-task-actions">
                          {task.acceptance_id ? (
                            <button
                              type="button"
                              className="my-task-details"
                              onClick={() =>
                                navigate(
                                  "/connection-details",
                                  {
                                    state: {
                                      taskId: task.id,
                                    },
                                  }
                                )
                              }
                            >
                              View connection
                            </button>
                          ) : (
                            <span className="my-task-waiting">
                              Waiting for a helper
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
        </main>
      </div>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default MyTasks;