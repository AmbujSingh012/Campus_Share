import { useState } from "react";

import {
  ArrowLeft,
  CalendarClock,
  Coins,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import BottomNavigation from "../components/BottomNavigation";

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

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCollege = JSON.parse(
    localStorage.getItem("selectedCollege") || "null"
  );

  const savedUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const mobile = savedUser?.mobile || "";

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

    if (!location.trim()) {
      setError("Please enter a location.");
      return;
    }

    if (!mobile) {
      setError(
        "Mobile number is required. Please add your mobile number in Profile."
      );
      return;
    }

    if (!/^[6-9]\d{9}$/.test(String(mobile))) {
      setError(
        "Your saved mobile number is invalid. Please update it in Profile."
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
      });

      if (!data.success) {
        throw new Error(
          data.message || "Failed to create task."
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

                <span>
                  Taking you back to tasks...
                </span>
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
                    <option value="">
                      Select category
                    </option>

                    <option value="Academic">
                      Academic
                    </option>

                    <option value="Programming">
                      Programming
                    </option>

                    <option value="Delivery">
                      Delivery
                    </option>

                    <option value="Campus Help">
                      Campus Help
                    </option>

                    <option value="Other">
                      Other
                    </option>
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

            {/* NEW MOBILE NUMBER SECTION */}
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
                    readOnly
                    disabled={loading}
                    placeholder="10-digit mobile number"
                  />

                  <small>
                    This number is taken from your profile
                    and will be shared with the accepted
                    helper only.
                  </small>

                  {!mobile && (
                    <small>
                      No mobile number found. Please add
                      your mobile number in Profile before
                      posting a task.
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
                {loading
                  ? "Posting task..."
                  : "Post task"}
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