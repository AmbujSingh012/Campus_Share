import { useEffect, useState } from "react";
import { getResources } from "../api/api";

function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        setError("");

        const data = await getResources();

        if (data.success) {
          setResources(data.resources);
        } else {
          setError("Failed to load resources");
        }
      } catch (err) {
        console.error("Resources API error:", err);
        setError("Unable to connect to backend");
      } finally {
        setLoading(false);
      }
    }

    loadResources();
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Resources</h1>
        <p>Loading resources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1>Resources</h1>
        <p style={styles.error}>{error}</p>
        <p>
          Make sure the CampusShare backend is running on port 3000.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>Campus Resources</h1>

      <p style={styles.subtitle}>
        Resources loaded from the CampusShare backend.
      </p>

      {resources.length === 0 ? (
        <p>No resources available.</p>
      ) : (
        <div style={styles.grid}>
          {resources.map((resource) => (
            <div key={resource.id} style={styles.card}>
              <h2>{resource.title}</h2>

              <p style={styles.description}>
                {resource.description || "No description provided"}
              </p>

              <p>
                <strong>Category:</strong>{" "}
                {resource.category || "Not specified"}
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {resource.location || "Not specified"}
              </p>

              <p>
                <strong>Posted by User ID:</strong>{" "}
                {resource.postedBy || "Not specified"}
              </p>

              <p>
                <strong>Availability:</strong>{" "}
                {resource.availability || "Not specified"}
              </p>

              <p>
                <strong>Created:</strong>{" "}
                {resource.created_at
                  ? new Date(resource.created_at).toLocaleString()
                  : "Not available"}
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

  error: {
    color: "red",
    fontWeight: "600",
  },
};

export default Resources;
