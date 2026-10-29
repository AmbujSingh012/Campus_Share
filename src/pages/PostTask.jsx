import { useState } from "react";

import {
  ArrowLeft,
  CalendarClock,
  Coins,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Clock3,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import BottomNavigation from "../components/BottomNavigation";
import NotificationBell from "../components/NotificationBell";
import "./PostTask.css";

import { createTask } from "../api";

function PostTask() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

  // Duration: custom hours/minutes or permanent.
  const [durationMode, setDurationMode] = useState("custom");
  const [durationHours, setDurationHours] = useState("0");
  const [durationMinutes, setDurationMinutes] = useState("30");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCollege = JSON.parse(
    localStorage.getItem("selectedCollege") || "null"
  );

  const savedUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // Mobile number from Profile, if available.
  const [mobile, setMobile] = useState(
    savedUser?.mobile || ""
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    if (!category) {
      setError("Please select a category.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (!reward || Number(reward) < 0) {
      setError("Please enter a valid reward.");
      return;
    }

    if (!deadline) {
      setError("Please select a deadline.");
      return;
    }

    if (new Date(deadline).getTime() <= Date.now()) {
      setError("The task deadline must be in the future.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter a location.");
      return;
    }

    // Validate the custom duration.
    let durationValue;

    if (durationMode === "permanent") {
      durationValue = "Permanent";
    } else {
      const hours = Number(durationHours);
      const minutes = Number(durationMinutes);

      if (
        durationHours.trim() === "" ||
        durationMinutes.trim() === "" ||
        !Number.isSafeInteger(hours) ||
        !Number.isInteger(minutes) ||
        hours < 0 ||
        minutes < 0 ||
        minutes > 59 ||
        hours * 60 + minutes <= 0 ||
        !Number.isSafeInteger(hours * 60 + minutes)
      ) {
        setError(
          "Enter a valid duration. Hours must be zero or greater, minutes must be between 0 and 59, and the total duration must be greater than zero."
        );
        return;
      }

      durationValue = `${hours * 60 + minutes} Minutes`;
    }

    if (
      meetingTime &&
      new Date(meetingTime).getTime() < Date.now()
    ) {
      setError("The preferred meeting time cannot be in the past.");
      return;
    }

    if (!mobile.trim()) {
      setError(
        "Mobile number is required. Please enter your mobile number."
      );
      return;
    }

    if (!/^[6-9]\d{9}$/.test(String(mobile))) {
      setError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login before posting a task.");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const data = await createTask({
        title: title.trim(),
        description: description.trim(),
        category,
        reward: Number(reward),
        deadline,
        location: location.trim(),
        meeting_time: meetingTime || null,
        mobile: String(mobile),
        duration: durationValue,
      });

      if (!data.success) {
        throw new Error(
          data.message || "Failed to create task."
        );
      }

      // Preserve the mobile number in localStorage.
      const currentUser = JSON.parse(
        localStorage.getItem("user") || "null"
      );

      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          mobile: String(mobile),
        };

        localStorage.setItem(
          "user",
          JSON.stringify(updatedUser)
        );
      }

      setMessage("Task posted successfully!");

      setTitle("");
      setDescription("");
      setCategory("");
      setReward("");
      setDeadline("");
      setLocation("");
      setMeetingTime("");
      setDurationMode("custom");
      setDurationHours("0");
      setDurationMinutes("30");

      setTimeout(() => {
        navigate("/tasks");
      }, 1000);
    } catch (err) {
      console.error("Create task error:", err);

      setError(
        err.message ||
          "Unable to connect to backend. Make sure the backend is running on port 3000."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-task-modern-page app-page-frame">
      <div className="post-task-shell">
        <header className="post-task-topbar">
          <button
            className="post-task-back"
            type="button"
            onClick={() => navigate("/tasks")}
            aria-label="Back to tasks"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="post-task-campus">
            <span className="post-task-campus-dot"></span>
            <span>
              {selectedCollege?.name || "Your Campus"}
            </span>
          </div>

          <div className="post-task-top-label">
            Micro-task
          </div>

          <NotificationBell />
        </header>

        <main className="post-task-content">
          <section className="post-task-intro">
            <div>
              <span className="post-task-eyebrow">
                ASK YOUR CAMPUS
              </span>

              <h1>
                Need a little
                <span> help?</span>
              </h1>

              <p>
                Post a task, set a reward, and let students
                around your campus help you get it done.
              </p>
            </div>

            <div className="post-task-intro-icon">
              <Sparkles size={30} />
            </div>
          </section>

          {message && (
            <div className="post-task-success">
              <ShieldCheck size={20} />

              <div>
                <strong>{message}</strong>
                <span>Taking you back to tasks...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="post-task-error">
              <strong>Couldn&apos;t post task</strong>
              <span>{error}</span>
            </div>
          )}

          <form
            className="post-task-form"
            onSubmit={handleSubmit}
          >
            <section className="post-task-card">
              <div className="post-task-section-heading">
                <div>
                  <span>01</span>
                  <h2>What do you need?</h2>
                </div>

                <p>
                  Tell students exactly what you need help
                  with.
                </p>
              </div>

              <div className="post-task-fields">
                <div className="post-task-field full">
                  <label>Task title</label>

                  <input
                    type="text"
                    placeholder="e.g. Need help carrying a lab coat"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>

                <div className="post-task-field">
                  <label>Category</label>

                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value)
                    }
                    disabled={loading}
                  >
                    <option value="">Select category</option>
                    <option value="Academic">Academic</option>
                    <option value="Programming">Programming</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Campus Help">Campus Help</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="post-task-field">
                  <label>
                    <Coins size={14} />
                    Reward
                  </label>

                  <div className="post-task-reward-input">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="50"
                      value={reward}
                      onChange={(event) =>
                        setReward(event.target.value)
                      }
                      disabled={loading}
                    />

                    <span>₹</span>
                  </div>

                  <small>
                    Set a fair reward to attract helpers.
                  </small>
                </div>

                <div className="post-task-field full">
                  <label>Describe the task</label>

                  <textarea
                    placeholder="Explain what needs to be done, any important details, and what the helper should know..."
                    rows="6"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            </section>

            <section className="post-task-card">
              <div className="post-task-section-heading">
                <div>
                  <span>02</span>
                  <h2>Set the details</h2>
                </div>

                <p>
                  Help the right student know when and where
                  to help.
                </p>
              </div>

              <div className="post-task-fields">
                {/* Custom duration */}
                <div className="post-task-field full">
                  <label>
                    <Clock3 size={14} />
                    Duration
                  </label>

                  <select
                    value={durationMode}
                    onChange={(event) =>
                      setDurationMode(event.target.value)
                    }
                    disabled={loading}
                  >
                    <option value="custom">
                      Custom duration
                    </option>
                    <option value="permanent">
                      Permanent
                    </option>
                  </select>

                  {durationMode === "custom" ? (
                    <>
                      <div className="post-task-fields">
                        <div className="post-task-field">
                          <label>Hours</label>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            placeholder="0"
                            value={durationHours}
                            onChange={(event) =>
                              setDurationHours(event.target.value)
                            }
                            disabled={loading}
                          />
                        </div>

                        <div className="post-task-field">
                          <label>Minutes</label>

                          <input
                            type="number"
                            min="0"
                            max="59"
                            step="1"
                            inputMode="numeric"
                            placeholder="30"
                            value={durationMinutes}
                            onChange={(event) =>
                              setDurationMinutes(event.target.value)
                            }
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <small>
                        Choose any duration greater than zero.
                        For example, 2 hours and 30 minutes.
                        Minutes must be between 0 and 59.
                      </small>
                    </>
                  ) : (
                    <small>
                      Permanent means no duration limit.
                    </small>
                  )}
                </div>

                <div className="post-task-field">
                  <label>
                    <CalendarClock size={14} />
                    Deadline
                  </label>

                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(event) =>
                      setDeadline(event.target.value)
                    }
                    disabled={loading}
                  />

                  <small>
                    The latest time by which the task should
                    be completed.
                  </small>
                </div>

                <div className="post-task-field">
                  <label>
                    <MapPin size={14} />
                    Location
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. Library Block A"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>

                <div className="post-task-field full">
                  <label>
                    <CalendarClock size={14} />
                    Preferred meeting time

                    <span className="optional-label">
                      Optional
                    </span>
                  </label>

                  <input
                    type="datetime-local"
                    value={meetingTime}
                    onChange={(event) =>
                      setMeetingTime(event.target.value)
                    }
                    disabled={loading}
                  />

                  <small>
                    Leave empty if the helper can coordinate
                    the time with you.
                  </small>
                </div>
              </div>
            </section>

            <section className="post-task-card">
              <div className="post-task-section-heading">
                <div>
                  <span>03</span>
                  <h2>Contact details</h2>
                </div>

                <p>
                  Your mobile number is required so the
                  accepted helper can contact you.
                </p>
              </div>

              <div className="post-task-fields">
                <div className="post-task-field full">
                  <label>
                    <Phone size={14} />
                    Mobile number
                  </label>

                  <input
                    type="tel"
                    value={mobile}
                    onChange={(event) =>
                      setMobile(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10)
                      )
                    }
                    disabled={loading}
                    placeholder="10-digit mobile number"
                  />

                  <small>
                    {mobile
                      ? "This number will be shared with the accepted helper only."
                      : "You can enter your mobile number here or add it in Profile."}
                  </small>

                  {!mobile && (
                    <small>
                      No mobile number found. You can enter
                      your mobile number here.
                    </small>
                  )}
                </div>
              </div>
            </section>

            <div className="post-task-submit-area">
              <div>
                <strong>
                  Ready to ask your campus?
                </strong>

                <span>
                  Your task will be visible to students at
                  {selectedCollege?.name
                    ? ` ${selectedCollege.name}.`
                    : " your campus."}
                </span>
              </div>

              <button
                type="submit"
                className="post-task-submit"
                disabled={loading}
              >
                {loading ? "Posting task..." : "Post task"}
              </button>
            </div>
          </form>
        </main>
      </div>

      <BottomNavigation active="tasks" />
    </div>
  );
}

export default PostTask;