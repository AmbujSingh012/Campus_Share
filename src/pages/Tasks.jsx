
import { useEffect, useState } from "react";
import { getTasks } from "../api/api";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, []);

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
        <p style={styles.error}>{error}</p>
        <p>
          Make sure the CampusShare backend is running on port 3000.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>Campus Tasks</h1>

      <p style={styles.subtitle}>
        Tasks loaded from the CampusShare backend.
      </p>

      {tasks.length === 0 ? (
        <p>No tasks available.</p>
      ) : (
        <div style={styles.grid}>
          {tasks.map((task) => (
            <div key={task.id} style={styles.card}>
              <h2>{task.title}</h2>

              <p style={styles.description}>
                {task.description || "No description provided"}
              </p>

              <p>
                <strong>Category:</strong>{" "}
                {task.category || "Not specified"}
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {task.location || "Not specified"}
              </p>

              <p>
                <strong>Reward:</strong>{" "}
                {task.reward || "Not specified"}
              </p>

              <p>
                <strong>Deadline:</strong>{" "}
                {task.deadline || "Not specified"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span style={styles.status}>
                  {task.status || "Not specified"}
                </span>
              </p>
            </div>
          ))}
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
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e5e7eb",
  },

  description: {
    color: "#555",
    lineHeight: "1.5",
  },

  status: {
    fontWeight: "600",
    textTransform: "capitalize",
  },

  error: {
    color: "red",
    fontWeight: "600",
  },
};

export default Tasks;