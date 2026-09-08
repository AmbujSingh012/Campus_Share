import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
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
      });

      if (!data.success) {
        throw new Error(data.message || "Failed to create task.");
      }

      setMessage("Task posted successfully!");

      setTitle("");
      setDescription("");
      setCategory("");
      setReward("");
      setDeadline("");
      setLocation("");

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
    <div className="page">
      <Header title="Post Task" />

      <main className="page-content">
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "20px",
          }}
        >
          <h2>Post a Task</h2>

          <p>
            Create a task for students from your college.
          </p>

          {message && (
            <p style={{ color: "green" }}>
              {message}
            </p>
          )}

          {error && (
            <p style={{ color: "red" }}>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label>Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example: Help with Python assignment"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              >
                <option value="">Select category</option>
                <option value="Academic">Academic</option>
                <option value="Programming">Programming</option>
                <option value="Delivery">Delivery</option>
                <option value="Campus Help">Campus Help</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Describe what help you need..."
                rows="5"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Reward</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="Example: 50"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) =>
                  setDeadline(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Location</label>
              <div className="form-group">
         <label htmlFor="meetingTime">Meeting Time</label>

      <input
    id="meetingTime"
    type="datetime-local"
    value={meetingTime}
    onChange={(e) => setMeetingTime(e.target.value)}
  />
</div>
              <input
                type="text"
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
                placeholder="Example: Library"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Posting..." : "Post Task"}
            </button>
          </form>
        </div>
      </main>

      <BottomNavigation active="tasks" />
    </div>
  );
}

export default PostTask;
