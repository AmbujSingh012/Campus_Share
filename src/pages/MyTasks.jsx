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
  IndianRupee,
  UserRound,
  WalletCards,
  XCircle,
  Layers3,
  Star,
} from "lucide-react";
import BottomNavigation from "../components/BottomNavigation";
import "./MyTasks.css";

function MyTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [ratingTaskId, setRatingTaskId] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [ratingSuccess, setRatingSuccess] = useState("");

  const selectedCollege = JSON.parse(
    localStorage.getItem("selectedCollege") || "null"
  );

  const collegeName = selectedCollege?.name || "Your Campus";

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

  useEffect(() => {
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
      taskStatus === "completed" ||
      taskStatus === "complete"
    ) {
      return {
        label: "Completed",
        type: "completed",
      };
    }

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

  const getPaymentStatus = (paymentStatus) => {
    const status = String(
      paymentStatus || ""
    ).toLowerCase();

    if (status === "paid") {
      return "Payment paid";
    }

    if (status === "pending") {
      return "Payment pending";
    }

    if (status === "failed") {
      return "Payment failed";
    }

    if (status === "cancelled") {
      return "Payment cancelled";
    }

    return "Payment pending";
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

  const handleOpenRating = (taskId) => {
    setRatingTaskId(taskId);
    setRatingValue(0);
    setRatingComment("");
    setRatingError("");
    setRatingSuccess("");
  };

  const handleCancelRating = () => {
    if (ratingSubmitting) {
      return;
    }

    setRatingTaskId(null);
    setRatingValue(0);
    setRatingComment("");
    setRatingError("");
    setRatingSuccess("");
  };

  const handleSubmitRating = async (taskId) => {
    if (!ratingValue) {
      setRatingError("Please select a rating.");
      return;
    }

    try {
      setRatingSubmitting(true);
      setRatingError("");
      setRatingSuccess("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/ratings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            task_id: taskId,
            rating: ratingValue,
            comment: ratingComment.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setRatingError(
          data.message || "Failed to submit rating."
        );
        return;
      }

      setRatingSuccess(
        "Rating submitted successfully!"
      );

      await loadMyTasks();

      setTimeout(() => {
        setRatingTaskId(null);
        setRatingValue(0);
        setRatingComment("");
        setRatingSuccess("");
      }, 1200);
    } catch (error) {
      console.error(
        "Submit task rating error:",
        error
      );

      setRatingError(
        "Unable to connect to backend."
      );
    } finally {
      setRatingSubmitting(false);
    }
  };

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
                <IndianRupee size={19} />
              </div>

              <div>
                <strong>
                  ₹{totalRewards.toFixed(2)}
                </strong>
                <span>Total INR</span>
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
                  {tasks
                    .filter((task) => {
                      const status =
                        getTaskStatus(task).type;

                      if (status !== "completed") {
                        return true;
                      }

                      const savedUser = JSON.parse(
                        localStorage.getItem("user") || "null"
                      );

                      const isOwner =
                        Number(savedUser?.id) ===
                        Number(task.user_id);

                      const alreadyRated =
                        Number(
                          task.owner_already_rated || 0
                        ) === 1;

                      return isOwner && !alreadyRated;
                    })
                    .map((task) => {
                    const status = getTaskStatus(task);

                    const isCompleted =
                      status.type === "completed";

                    const alreadyRated =
                      Number(
                        task.owner_already_rated || 0
                      ) === 1;

                    const isRatingOpen =
                      ratingTaskId === task.id;

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
                            <IndianRupee
                              size={18}
                            />

                            <span>Reward</span>
                          </div>

                          <strong>
                            ₹
                            {Number(
                              task.reward || 0
                            ).toFixed(2)}
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
                              {getPaymentStatus(
                                task.payment_status
                              )}
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

                        {isCompleted &&
                          task.helper_id &&
                          (alreadyRated ||
                            isRatingOpen) && (
                            <div
                              style={{
                                marginTop: "14px",
                                paddingTop: "14px",
                                borderTop:
                                  "1px solid #e5e7eb",
                              }}
                            >
                              {alreadyRated &&
                                !isRatingOpen && (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems:
                                        "center",
                                      gap: "7px",
                                      color: "#16a34a",
                                      fontSize:
                                        "14px",
                                      fontWeight:
                                        "600",
                                    }}
                                  >
                                    <CheckCircle2
                                      size={16}
                                    />
                                    Already Rated
                                  </div>
                                )}

                              {isRatingOpen && (
                                <div>
                                  <div
                                    style={{
                                      fontSize:
                                        "14px",
                                      fontWeight:
                                        "600",
                                      marginBottom:
                                        "10px",
                                    }}
                                  >
                                    Rate your helper
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "6px",
                                      marginBottom:
                                        "12px",
                                    }}
                                  >
                                    {[1, 2, 3, 4, 5].map(
                                      (star) => (
                                        <button
                                          key={star}
                                          type="button"
                                          onClick={() =>
                                            setRatingValue(
                                              star
                                            )
                                          }
                                          disabled={
                                            ratingSubmitting
                                          }
                                          aria-label={`Rate ${star} star`}
                                          style={{
                                            border:
                                              "none",
                                            background:
                                              "transparent",
                                            padding:
                                              "2px",
                                            cursor:
                                              ratingSubmitting
                                                ? "not-allowed"
                                                : "pointer",
                                          }}
                                        >
                                          <Star
                                            size={25}
                                            fill={
                                              star <=
                                              ratingValue
                                                ? "#f59e0b"
                                                : "none"
                                            }
                                            strokeWidth={
                                              1.8
                                            }
                                          />
                                        </button>
                                      )
                                    )}
                                  </div>

                                  <textarea
                                    value={
                                      ratingComment
                                    }
                                    onChange={(event) =>
                                      setRatingComment(
                                        event.target
                                          .value
                                      )
                                    }
                                    placeholder="Write a comment (optional)"
                                    disabled={
                                      ratingSubmitting
                                    }
                                    rows={3}
                                    style={{
                                      width: "100%",
                                      boxSizing:
                                        "border-box",
                                      resize: "vertical",
                                      border:
                                        "1px solid #d1d5db",
                                      borderRadius:
                                        "10px",
                                      padding: "10px",
                                      fontFamily:
                                        "inherit",
                                      fontSize:
                                        "14px",
                                      outline: "none",
                                    }}
                                  />

                                  {ratingError && (
                                    <div
                                      style={{
                                        marginTop:
                                          "8px",
                                        color:
                                          "#dc2626",
                                        fontSize:
                                          "13px",
                                      }}
                                    >
                                      {ratingError}
                                    </div>
                                  )}

                                  {ratingSuccess && (
                                    <div
                                      style={{
                                        marginTop:
                                          "8px",
                                        color:
                                          "#16a34a",
                                        fontSize:
                                          "13px",
                                        fontWeight:
                                          "600",
                                      }}
                                    >
                                      {ratingSuccess}
                                    </div>
                                  )}

                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "8px",
                                      marginTop:
                                        "10px",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSubmitRating(
                                          task.id
                                        )
                                      }
                                      disabled={
                                        ratingSubmitting
                                      }
                                      className="my-task-details"
                                    >
                                      {ratingSubmitting
                                        ? "Submitting..."
                                        : "Submit Rating"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={
                                        handleCancelRating
                                      }
                                      disabled={
                                        ratingSubmitting
                                      }
                                      className="my-task-details"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                        <div className="my-task-divider" />

                        <div className="my-task-actions">
                          {task.acceptance_id ? (
                            <>
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

                              {isCompleted &&
                                task.helper_id &&
                                !alreadyRated &&
                                !isRatingOpen && (
                                  <button
                                    type="button"
                                    className="my-task-details"
                                    onClick={() =>
                                      handleOpenRating(
                                        task.id
                                      )
                                    }
                                  >
                                    <Star size={15} />
                                    Rate User
                                  </button>
                                )}

                              {isCompleted &&
                                task.helper_id &&
                                alreadyRated && (
                                  <span className="my-task-waiting">
                                    Already Rated
                                  </span>
                                )}
                            </>
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