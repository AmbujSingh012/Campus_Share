
import { useEffect, useMemo, useState } from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  Search,
  Wallet,
  Zap,
} from "lucide-react";

import {
  getTasks,
  acceptTask,
} from "../api";

import BottomNavigation from "../components/BottomNavigation";

import "./Tasks.css";

function Tasks() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const selectedTaskId =
    searchParams.get("taskId");

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [activeCategory, setActiveCategory] =
    useState("All");

  const [applyingId, setApplyingId] =
    useState(null);

  const savedUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const currentUserId =
    savedUser?.id;

  const selectedCollege = JSON.parse(
    localStorage.getItem("selectedCollege") ||
      "null"
  );

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        setError("");

        const data = await getTasks();

        console.log(
          "Tasks API response:",
          data
        );

        if (data.success) {
          setTasks(data.tasks || []);
        } else {
          setError(
            "Failed to load tasks"
          );
        }
      } catch (err) {
        console.error(
          "Tasks API error:",
          err
        );

        setError(
          "Unable to connect to backend"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  /*
   * If Home page sends:
   * /tasks?taskId=5
   *
   * this finds task-5 and scrolls
   * directly to that task.
   */
  useEffect(() => {
    if (
      loading ||
      !selectedTaskId ||
      tasks.length === 0
    ) {
      return;
    }

    const targetTask = tasks.find(
      (task) =>
        String(task.id) ===
        String(selectedTaskId)
    );

    if (!targetTask) {
      return;
    }

    const scrollToTask = () => {
      const element =
        document.getElementById(
          `task-${selectedTaskId}`
        );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(
        scrollToTask
      );
    });
  }, [
    loading,
    selectedTaskId,
    tasks,
  ]);

  const handleApply = async (task) => {
    try {
      setApplyingId(task.id);
      setError("");

      const data =
        await acceptTask(task.id);

      if (data.success) {
        setTasks(
          (previousTasks) =>
            previousTasks.map((item) =>
              item.id === task.id
                ? {
                    ...item,
                    status: "accepted",
                    my_acceptance_status:
                      "accepted",
                  }
                : item
            )
        );

        alert("You're on it! ⚡");
      } else {
        setError(
          data.message ||
            "Failed to jump into this task"
        );
      }
    } catch (err) {
      console.error(
        "Apply task error:",
        err
      );

      setError(
        err.message ||
          "Failed to jump into this task"
      );
    } finally {
      setApplyingId(null);
    }
  };

  const getPaymentStatus = (task) => {
    if (
      task.my_payment_status ===
        "paid" ||
      task.task_payment_status ===
        "paid"
    ) {
      return "Paid 💸";
    }

    if (
      task.my_payment_status ===
        "pending" ||
      task.task_payment_status ===
        "pending"
    ) {
      return "Payout pending";
    }

    return "Payout pending";
  };

  const getTransactionStatus = (
    task
  ) => {
    if (
      task.my_payment_status ===
        "paid" ||
      task.task_payment_status ===
        "paid"
    ) {
      return "Done ✓";
    }

    if (
      task.my_payment_status ===
        "pending" ||
      task.task_payment_status ===
        "pending"
    ) {
      return "Pending";
    }

    return "Not started";
  };

  const getTransactionId = (task) => {
    if (task.my_transaction_id) {
      return task.my_transaction_id;
    }

    return (
      task.task_transaction_id ||
      ""
    );
  };

  const categories = useMemo(() => {
    const uniqueCategories =
      tasks
        .map(
          (task) => task.category
        )
        .filter(Boolean);

    return [
      "All",
      ...new Set(uniqueCategories),
    ];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query =
      searchQuery
        .trim()
        .toLowerCase();

    return tasks.filter((task) => {
      const category =
        String(
          task.category || ""
        ).toLowerCase();

      const matchesCategory =
        activeCategory === "All" ||
        category ===
          activeCategory.toLowerCase();

      const searchableText = [
        task.title,
        task.description,
        task.category,
        task.location,
        task.postedBy,
        task.user_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchableText.includes(
          query
        );

      return (
        matchesCategory &&
        matchesSearch
      );
    });
  }, [
    tasks,
    searchQuery,
    activeCategory,
  ]);

  const availableCount =
    tasks.filter((task) => {
      const status = String(
        task.status || ""
      ).toLowerCase();

      return (
        status !== "accepted" &&
        status !== "completed" &&
        status !== "closed"
      );
    }).length;

  const totalReward =
    tasks.reduce(
      (total, task) => {
        const reward = Number(
          task.reward
        );

        return (
          total +
          (Number.isFinite(
            reward
          )
            ? reward
            : 0)
        );
      },
      0
    );

  if (loading) {
    return (
      <div className="tasks-modern-page app-page-frame">
        <div className="tasks-loading">
          <div className="tasks-spinner"></div>

          <p>
            Loading campus tasks...
          </p>
        </div>

        <BottomNavigation active="tasks" />
      </div>
    );
  }

  return (
    <div className="tasks-modern-page">
      <div className="tasks-modern-shell">

        <header className="tasks-topbar">

          <button
            className="tasks-back"
            onClick={() =>
              navigate("/home")
            }
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="tasks-campus">
            <span className="tasks-campus-dot"></span>

            <span>
              {selectedCollege?.name ||
                "Your Campus"}
            </span>
          </div>

          <button
            className="tasks-post-top"
            onClick={() =>
              navigate("/post-task")
            }
          >
            <Plus size={18} />

            <span>
              Drop a task
            </span>
          </button>

        </header>

        <main className="tasks-modern-content">

          <section className="tasks-hero">

            <div className="tasks-hero-copy">

              <span className="tasks-eyebrow">
                CAMPUS HUSTLE
              </span>

              <h1>
                Get stuff done.
                <span>
                  {" "}Get paid.
                </span>
              </h1>

              <p>
                Pick up quick tasks from
                students around your campus
                and earn rewards for getting
                things done.
              </p>

            </div>

            <div className="tasks-hero-stat">

              <Zap size={22} />

              <strong>
                {availableCount}
              </strong>

              <span>
                tasks live
              </span>

            </div>

          </section>

          <section className="tasks-stats-row">

            <div className="tasks-mini-stat">

              <div className="tasks-mini-icon">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <strong>
                  {availableCount}
                </strong>

                <span>
                  Live now
                </span>
              </div>

            </div>

            <div className="tasks-mini-stat">

              <div className="tasks-mini-icon">
                <Wallet size={18} />
              </div>

              <div>
                <strong>
                  ₹{totalReward.toFixed(2)}
                </strong>

                <span>
                  Money on the table
                </span>
              </div>

            </div>

          </section>

          <section className="tasks-search-section">

            <div className="tasks-search-box">

              <Search size={20} />

              <input
                type="text"
                placeholder="Search tasks, tutoring, delivery..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
              />

              {searchQuery && (
                <button
                  className="tasks-search-clear"
                  onClick={() =>
                    setSearchQuery("")
                  }
                >
                  Clear
                </button>
              )}

            </div>

          </section>

          <section className="tasks-filter-section">

            <div className="tasks-filter-header">

              <div>

                <h2>
                  Find your next task
                </h2>

                <p>
                  {filteredTasks.length}{" "}
                  task
                  {filteredTasks.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  available
                </p>

              </div>

            </div>

            <div className="tasks-category-list">

              {categories.map(
                (category) => (
                  <button
                    key={category}
                    className={
                      activeCategory ===
                      category
                        ? "tasks-category active"
                        : "tasks-category"
                    }
                    onClick={() =>
                      setActiveCategory(
                        category
                      )
                    }
                  >
                    {category}
                  </button>
                )
              )}

            </div>

          </section>

          {error && (
            <div className="tasks-error">

              <strong>
                Something went wrong
              </strong>

              <span>
                {error}
              </span>

            </div>
          )}

          {filteredTasks.length ===
          0 ? (
            <section className="tasks-empty">

              <div className="tasks-empty-icon">
                <Zap size={32} />
              </div>

              <h3>
                {searchQuery ||
                activeCategory !==
                  "All"
                  ? "No matching tasks"
                  : "No tasks yet 👀"}
              </h3>

              <p>
                {searchQuery ||
                activeCategory !==
                  "All"
                  ? "Try another search or category."
                  : "Drop the first task on campus."}
              </p>

            </section>
          ) : (
            <section className="tasks-grid">

              {filteredTasks.map(
                (task) => {

                  const postedBy =
                    task.postedBy ||
                    task.user_name ||
                    task.user_id ||
                    "Student";

                  const isOwner =
                    Number(
                      currentUserId
                    ) ===
                    Number(
                      task.user_id
                    );

                  const paymentStatus =
                    getPaymentStatus(
                      task
                    );

                  const transactionStatus =
                    getTransactionStatus(
                      task
                    );

                  const transactionId =
                    getTransactionId(
                      task
                    );

                  const status =
                    String(
                      task.status || ""
                    ).toLowerCase();

                  const isAccepted =
                    status ===
                      "accepted" ||
                    task.my_acceptance_status ===
                      "accepted";

                  const isApplying =
                    applyingId ===
                    task.id;

                  return (
                    <article
                      id={`task-${task.id}`}
                      className="tasks-item"
                      key={task.id}
                    >

                      <div className="tasks-card">

                        <div className="tasks-card-top">

                          <div className="tasks-card-category">
                            {task.category ||
                              "Campus task"}
                          </div>

                          <div className="tasks-reward">

                            <span>
                              Reward
                            </span>

                            <strong>
                              ₹
                              {Number(
                                task.reward || 0
                              ).toFixed(2)}
                            </strong>

                          </div>

                        </div>

                        <h3 className="tasks-card-title">
                          {task.title}
                        </h3>

                        <p className="tasks-card-description">
                          {task.description ||
                            "A quick task dropped by a fellow student."}
                        </p>

                        <div className="tasks-card-meta">

                          <span>
                            <MapPin
                              size={15}
                            />

                            {task.location ||
                              "Campus"}
                          </span>

                          <span>
                            <CalendarDays
                              size={15}
                            />

                            {task.deadline ||
                              "No deadline"}
                          </span>

                        </div>

                        <div className="tasks-divider"></div>

                        <div className="tasks-poster-row">

                          <div className="tasks-avatar">

                            {String(
                              postedBy
                            )
                              .charAt(0)
                              .toUpperCase()}

                          </div>

                          <div className="tasks-poster-info">

                            <small>
                              Dropped by
                            </small>

                            <strong>
                              {postedBy}
                            </strong>

                          </div>

                          <div className="tasks-live">

                            <span></span>

                            {isAccepted
                              ? "You're on it"
                              : "Open"}

                          </div>

                        </div>

                        <div className="tasks-status-grid">

                          <div>

                            <small>
                              Payout
                            </small>

                            <strong>
                              {paymentStatus}
                            </strong>

                          </div>

                          <div>

                            <small>
                              Tx status
                            </small>

                            <strong>
                              {transactionStatus}
                            </strong>

                          </div>

                        </div>

                        {transactionId && (
                          <div className="tasks-transaction">

                            <Clock3
                              size={14}
                            />

                            <span>
                              {transactionId}
                            </span>

                          </div>
                        )}

                        <div className="tasks-card-actions">

                          {isOwner ? (

                            <button
                              className="tasks-owner-button"
                              disabled
                            >
                              Your task
                            </button>

                          ) : isAccepted ? (

                            <button
                              className="tasks-accepted-button"
                              disabled
                            >
                              <CheckCircle2
                                size={17}
                              />

                              You're in ✓
                            </button>

                          ) : (

                            <button
                              className="tasks-apply-button"
                              onClick={() =>
                                handleApply(
                                  task
                                )
                              }
                              disabled={
                                isApplying
                              }
                            >
                              {isApplying
                                ? "Jumping in..."
                                : "I'm on it ⚡"}
                            </button>

                          )}

                          {(isOwner ||
                            isAccepted) && (

                            <button
                              className="tasks-connection-button"
                              onClick={() =>
                                navigate(
                                  "/connection-details",
                                  {
                                    state: {
                                      taskId:
                                        task.id,
                                    },
                                  }
                                )
                              }
                            >
                              View connection 🔗
                            </button>

                          )}

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </section>
          )}

        </main>

      </div>

      <BottomNavigation active="tasks" />

    </div>
  );
}

export default Tasks;