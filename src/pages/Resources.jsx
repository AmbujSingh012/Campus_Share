
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getResources } from "../api/api";

function Resources() {
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Store borrowed resources for the current frontend session
  const [borrowedResources, setBorrowedResources] =
    useState({});

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

    // Load previously borrowed resources
    const savedBorrowed =
      JSON.parse(
        localStorage.getItem("campusshareBorrowedResources")
      ) || {};

    setBorrowedResources(savedBorrowed);
  }, []);

  const handleBorrow = (resource) => {
    const updatedBorrowed = {
      ...borrowedResources,
      [resource.id]: true,
    };

    setBorrowedResources(updatedBorrowed);

    localStorage.setItem(
      "campusshareBorrowedResources",
      JSON.stringify(updatedBorrowed)
    );
  };

  const handlePostResource = () => {
    navigate("/post-resource");
  };

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

        <p style={styles.error}>
          {error}
        </p>

        <p>
          Make sure the CampusShare backend is running
          on port 3000.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>

      {/* Page Header */}
      <div style={styles.header}>

        <div>
          <h1>Campus Resources</h1>

          <p style={styles.subtitle}>
            Resources loaded from the CampusShare backend.
          </p>
        </div>

        {/* Post Resource Button */}
        <button
          style={styles.postButton}
          onClick={handlePostResource}
        >
          + Post Resource
        </button>

      </div>

      {resources.length === 0 ? (
        <div style={styles.emptyState}>
          <h2>No resources available</h2>

          <p>
            Be the first student to post a resource.
          </p>

          <button
            style={styles.postButton}
            onClick={handlePostResource}
          >
            + Post Resource
          </button>
        </div>
      ) : (
        <div style={styles.grid}>

          {resources.map((resource) => {

            const isBorrowed =
              borrowedResources[resource.id];

            return (
              <div
                key={resource.id}
                style={styles.card}
              >

                {/* Resource Title */}
                <h2>
                  {resource.title}
                </h2>

                {/* Description */}
                <p style={styles.description}>
                  {resource.description ||
                    "No description provided"}
                </p>

                {/* Category */}
                <p>
                  <strong>Category:</strong>{" "}
                  {resource.category ||
                    "Not specified"}
                </p>

                {/* Location */}
                <p>
                  <strong>Location:</strong>{" "}
                  {resource.location ||
                    "Not specified"}
                </p>

                {/* Posted By */}
                <p>
                  <strong>
                    Posted by User ID:
                  </strong>{" "}
                  {resource.postedBy ||
                    "Not specified"}
                </p>

                {/* Availability */}
                <div style={styles.availabilityRow}>

                  <strong>
                    Availability:
                  </strong>

                  <span
                    style={
                      resource.availability ===
                      "available"
                        ? styles.available
                        : styles.notSpecified
                    }
                  >
                    {resource.availability ||
                      "Available"}
                  </span>

                </div>

                {/* Created */}
                <p>
                  <strong>Created:</strong>{" "}
                  {resource.created_at
                    ? new Date(
                        resource.created_at
                      ).toLocaleString()
                    : "Not available"}
                </p>

                {/* Borrow Button */}
                {isBorrowed ? (
                  <button
                    style={styles.borrowedButton}
                    disabled
                  >
                    ✓ Resource Borrowed
                  </button>
                ) : (
                  <button
                    style={styles.borrowButton}
                    onClick={() =>
                      handleBorrow(resource)
                    }
                  >
                    Borrow Resource
                  </button>
                )}

              </div>
            );
          })}

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

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  subtitle: {
    color: "#666",
    marginBottom: "0",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow:
      "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e5e7eb",
  },

  description: {
    color: "#555",
    lineHeight: "1.5",
  },

  availabilityRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "10px",
    marginBottom: "10px",
  },

  available: {
    padding: "5px 10px",
    borderRadius: "6px",
    backgroundColor: "#dcfce7",
    color: "#166534",
    fontSize: "13px",
    fontWeight: "600",
  },

  notSpecified: {
    padding: "5px 10px",
    borderRadius: "6px",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontSize: "13px",
    fontWeight: "600",
  },

  postButton: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },

  borrowButton: {
    width: "100%",
    marginTop: "18px",
    padding: "12px 16px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },

  borrowedButton: {
    width: "100%",
    marginTop: "18px",
    padding: "12px 16px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "not-allowed",
  },

  emptyState: {
    textAlign: "center",
    padding: "50px 20px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
  },

  error: {
    color: "red",
    fontWeight: "600",
  },
};

export default Resources;