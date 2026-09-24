import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import "./Home.css";
import ResourceCard from "../components/ResourceCard";
import TaskCard from "../components/TaskCard";

import {
  getResources,
  getTasks,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentReceipt,
  cancelRazorpayPayment,
  acceptTask,
} from "../api";

function Home() {
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedCollege = localStorage.getItem("selectedCollege");

    if (savedCollege) {
      try {
        setSelectedCollege(JSON.parse(savedCollege));
      } catch (err) {
        console.error("Selected college error:", err);
      }
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Current user error:", err);
      }
    }
  }, []);

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true);
        setError("");

        const [resourceData, taskData] = await Promise.all([
          getResources(),
          getTasks(),
        ]);

        if (resourceData.success) {
          setResources(resourceData.resources || []);
        }

        if (taskData.success) {
          setTasks(taskData.tasks || []);
        }

        if (!resourceData.success || !taskData.success) {
          setError("Some campus data could not be loaded.");
        }
      } catch (err) {
        console.error("Home API error:", err);
        setError("Unable to connect to backend.");
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  const handleBorrow = async (resource) => {
    try {
      setError("");

      if (typeof window.Razorpay !== "function") {
        throw new Error(
          "Razorpay Checkout is not available. Please refresh the page and try again."
        );
      }

      const orderData = await createRazorpayOrder({
        resourceId: resource.id,
      });

      if (!orderData.success || !orderData.order) {
        throw new Error(
          orderData.message || "Unable to create payment order"
        );
      }

      if (!orderData.razorpayKeyId) {
        throw new Error(
          "Razorpay key is missing from the payment configuration."
        );
      }

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency || "INR",
        name: "CampusShare",
        description:
          orderData.payment?.title ||
          resource.title ||
          resource.name ||
          "Campus Resource Borrowing",
        order_id: orderData.order.id,

        prefill: {
          name: currentUser?.name || "",
          email: currentUser?.email || "",
          contact: currentUser?.mobile || "",
        },

        notes: {
          resource_id: String(resource.id),
          resource_title:
            resource.title || resource.name || "",
          location: resource.location || "",
        },

        theme: {
          color: "#2563eb",
        },

        handler: async function (response) {
          try {
            const verification = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (!verification.success) {
              throw new Error(
                verification.message ||
                  "Payment verification failed"
              );
            }

            setResources((previousResources) =>
              previousResources.map((item) =>
                item.id === resource.id
                  ? {
                      ...item,
                      availability: "Borrowed",
                      borrowed_by: currentUser?.id,
                    }
                  : item
              )
            );

            const paymentId =
              verification.payment?.id ||
              verification.payment_id;

            if (!paymentId) {
              throw new Error(
                "Payment succeeded, but receipt information was not returned."
              );
            }

            const receiptData =
              await getPaymentReceipt(paymentId);

            if (
              !receiptData.success ||
              !receiptData.receipt
            ) {
              throw new Error(
                receiptData.message ||
                  "Payment succeeded, but the receipt could not be loaded."
              );
            }

            console.log(
              "Payment receipt:",
              receiptData.receipt
            );
          } catch (paymentError) {
            console.error(
              "Payment verification error:",
              paymentError
            );

            setError(
              paymentError.message ||
                "Payment verification failed."
            );
          }
        },

        modal: {
          ondismiss: async function () {
            try {
              const paymentId =
                orderData.payment?.id ||
                orderData.payment_id;

              if (paymentId) {
                await cancelRazorpayPayment(paymentId);

                console.log(
                  "Pending payment cancelled successfully."
                );
              } else {
                console.warn(
                  "Payment ID not available, so pending payment could not be cancelled."
                );
              }
            } catch (cancelError) {
              console.error(
                "Failed to cancel pending payment:",
                cancelError
              );
            }
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.open();
    } catch (err) {
      console.error(
        "Borrow resource error:",
        err
      );

      setError(
        err.message ||
          "Failed to start payment."
      );
    }
  };

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
          data.message ||
            "Failed to apply for task."
        );
      }
    } catch (err) {
      console.error("Apply task error:", err);

      setError(
        err.message ||
          "Failed to apply for task."
      );
    }
  };

  const normalizedSearch =
    searchQuery.trim().toLowerCase();

  const filteredResources = useMemo(() => {
    return resources.filter((resource) =>
      [
        resource.name,
        resource.title,
        resource.category,
        resource.owner,
        resource.owner_name,
        resource.postedBy,
        resource.location,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(normalizedSearch)
        )
    );
  }, [resources, normalizedSearch]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) =>
      [
        task.title,
        task.category,
        task.postedBy,
        task.posted_by,
        task.owner_name,
        task.user_name,
        task.location,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(normalizedSearch)
        )
    );
  }, [tasks, normalizedSearch]);

  const collegeName =
    selectedCollege?.name || "Your Campus";

  const collegeCity =
    selectedCollege?.city || "Campus community";

  return (
    <div className="home-modern-page app-page-frame">
      <Header title="CampusShare" />

      <main className="home-modern-content">
        <section className="home-hero">
          <div className="home-hero-glow"></div>

          <div className="home-hero-top">
            <div>
              <div className="home-campus-pill">
                <span className="home-campus-dot"></span>
                <span>{collegeName}</span>
              </div>

              <p className="home-eyebrow">
                WELCOME 👋
              </p>

              <h1>
                Your campus,
                <br />
                <span>your community.</span>
              </h1>

              <p className="home-hero-description">
                Borrow what you need, share what you have, and earn by helping
                other students.
              </p>
            </div>

            <div className="home-hero-orbit">
              <div className="home-orbit-card home-orbit-card-one">
                <BookOpen size={18} />
                <span>Share</span>
              </div>

              <div className="home-orbit-main">
                <Sparkles size={30} />
              </div>

              <div className="home-orbit-card home-orbit-card-two">
                <CircleDollarSign size={18} />
                <span>Earn</span>
              </div>
            </div>
          </div>

          <button
            className="home-campus-switch"
            type="button"
            onClick={() => navigate("/")}
          >
            <div className="home-campus-switch-icon">
              <MapPin size={18} />
            </div>

            <div>
              <span>Currently exploring</span>
              <strong>
                {collegeName} · {collegeCity}
              </strong>
            </div>

            <ArrowRight size={18} />
          </button>
        </section>

        <section className="home-search-section">
          <div className="home-search-box">
            <Search size={20} />

            <input
              type="text"
              placeholder="Search resources, tasks, notes..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="home-search-clear"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        <section className="home-quick-section">
          <div className="home-section-heading">
            <div>
              <p className="home-section-kicker">
                GET THINGS DONE
              </p>

              <h2>What do you need?</h2>
            </div>
          </div>

          <div className="home-action-grid">
            <button
              type="button"
              className="home-action-card home-action-blue"
              onClick={() => navigate("/resources")}
            >
              <div className="home-action-icon">
                <BookOpen size={24} />
              </div>

              <div>
                <strong>Find resources</strong>
                <span>
                  Books, calculators & more
                </span>
              </div>

              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="home-action-card home-action-purple"
              onClick={() => navigate("/tasks")}
            >
              <div className="home-action-icon">
                <CircleDollarSign size={24} />
              </div>

              <div>
                <strong>Earn on campus</strong>
                <span>
                  Complete student tasks
                </span>
              </div>

              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="home-action-card home-action-orange"
              onClick={() =>
                navigate("/post-resource")
              }
            >
              <div className="home-action-icon">
                <Plus size={24} />
              </div>

              <div>
                <strong>Share something</strong>
                <span>
                  Lend a resource
                </span>
              </div>

              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="home-action-card home-action-green"
              onClick={() =>
                navigate("/post-task")
              }
            >
              <div className="home-action-icon">
                <Users size={24} />
              </div>

              <div>
                <strong>Post a task</strong>
                <span>
                  Get help from students
                </span>
              </div>

              <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <section className="home-stats-row">
          <div className="home-stat-card">
            <div className="home-stat-icon">
              <BookOpen size={19} />
            </div>

            <div>
              <strong>{resources.length}</strong>
              <span>Resources</span>
            </div>
          </div>

          <div className="home-stat-card">
            <div className="home-stat-icon">
              <CircleDollarSign size={19} />
            </div>

            <div>
              <strong>{tasks.length}</strong>
              <span>Active tasks</span>
            </div>
          </div>

          <div className="home-stat-card">
            <div className="home-stat-icon">
              <Users size={19} />
            </div>

            <div>
              <strong>Campus</strong>
              <span>Student network</span>
            </div>
          </div>
        </section>

        <section className="home-content-section">
          <div className="home-section-heading">
            <div>
              <p className="home-section-kicker">
                DISCOVER
              </p>

              <h2>Featured resources</h2>
            </div>

            <button
              type="button"
              className="home-view-all"
              onClick={() => navigate("/resources")}
            >
              View all
              <ArrowRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="home-loading">
              <div className="home-loading-spinner"></div>

              <span>
                Finding resources around campus...
              </span>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="home-empty">
              <BookOpen size={28} />

              <strong>
                No resources found
              </strong>

              <span>
                Try another search or share your first resource.
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate("/post-resource")
                }
              >
                Post a resource
              </button>
            </div>
          ) : (
            <div className="home-resource-grid">
              {filteredResources
                .slice(0, 4)
                .map((resource) => (
                  <div
                    key={resource.id}
                    onClick={(event) => {
                      if (
                        event.target.closest("button")
                      ) {
                        return;
                      }

                      navigate(
                        `/resources?resourceId=${resource.id}`
                      );
                    }}
                  >
                    <ResourceCard
                      name={
                        resource.name ||
                        resource.title
                      }
                      category={resource.category}
                      owner={
                        resource.owner ||
                        resource.owner_name ||
                        resource.postedBy ||
                        "Unknown"
                      }
                      rating={
                        resource.averageRating > 0
                          ? resource.averageRating
                          : "No ratings"
                      }
                      location={
                        resource.location ||
                        "Location not specified"
                      }
                      imageUrl={resource.image_url}
                      showImage={false}
                      onBorrow={() =>
                        handleBorrow(resource)
                      }
                    />
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="home-task-banner">
          <div className="home-task-banner-icon">
            <CircleDollarSign size={25} />
          </div>

          <div className="home-task-banner-content">
            <span>MICRO-TASKS</span>

            <h3>Got 10 minutes?</h3>

            <p>
              Help another student and earn USDC while you're already on
              campus.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/tasks")}
          >
            Explore tasks
            <ArrowRight size={17} />
          </button>
        </section>

        <section className="home-content-section home-last-section">
          <div className="home-section-heading">
            <div>
              <p className="home-section-kicker">
                OPPORTUNITIES
              </p>

              <h2>Latest tasks</h2>
            </div>

            <button
              type="button"
              className="home-view-all"
              onClick={() => navigate("/tasks")}
            >
              View all
              <ArrowRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="home-loading">
              <div className="home-loading-spinner"></div>

              <span>
                Loading campus tasks...
              </span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="home-empty">
              <Clock3 size={28} />

              <strong>
                No tasks found
              </strong>

              <span>
                New student tasks will appear here.
              </span>
            </div>
          ) : (
            <div className="home-task-grid">
              {filteredTasks
                .slice(0, 4)
                .map((task) => {
                  const rewardValue = Number.parseFloat(
                    task.reward ?? task.budget
                  );

                  const rewardDisplay =
                    Number.isFinite(rewardValue)
                      ? `₹${rewardValue.toFixed(2)}`
                      : "—";

                  return (
                    <div
                      key={task.id}
                      onClick={(event) => {
                        if (
                          event.target.closest("button")
                        ) {
                          return;
                        }

                        navigate(
                          `/tasks?taskId=${task.id}`
                        );
                      }}
                    >
                      <TaskCard
                        title={task.title}
                        budget={rewardDisplay}
                        deadline={task.deadline}
                        postedBy={
                          task.postedBy ||
                          task.posted_by ||
                          task.owner_name ||
                          task.user_name ||
                          "Student"
                        }
                        location={task.location}
                        status={task.status}
                        paymentStatus={
                          task.payment_status ||
                          task.paymentStatus
                        }
                        onApply={handleApply}
                        onConnectionDetails={() =>
                          navigate(
                            `/tasks?taskId=${task.id}`
                          )
                        }
                      />
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        <section className="home-trust-strip">
          <div>
            <CheckCircle2 size={19} />
            <span>
              Student-first community
            </span>
          </div>

          <div>
            <CheckCircle2 size={19} />
            <span>
              Campus-based sharing
            </span>
          </div>

          <div>
            <CheckCircle2 size={19} />
            <span>
              Secure digital payments
            </span>
          </div>
        </section>

        {error && (
          <div className="home-error">
            {error}
          </div>
        )}
      </main>

      <BottomNavigation active="home" />
    </div>
  );
}

export default Home;