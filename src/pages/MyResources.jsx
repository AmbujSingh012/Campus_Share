import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

function MyResources() {
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMyResources = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          "http://localhost:3000/api/resources/my",
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
            data.message || "Failed to load your resources"
          );
          return;
        }

        setResources(data.resources || []);
      } catch (error) {
        console.error("My resources error:", error);
        setError("Unable to connect to backend");
      } finally {
        setLoading(false);
      }
    };

    loadMyResources();
  }, [navigate]);

  const handleDelete = async (resourceId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resource?"
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:3000/api/resources/${resourceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "Failed to delete resource");
        return;
      }

      setResources((current) =>
        current.filter((item) => item.id !== resourceId)
      );

      alert("Resource deleted successfully");
    } catch (error) {
      console.error("Delete resource error:", error);
      alert("Unable to connect to backend");
    }
  };

  return (
    <div className="page">
      <Header title="My Resources" />

      <main className="page-content">

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="small-button"
          >
            ← Back
          </button>

          <h2 style={{ margin: 0 }}>
            My Resources
          </h2>
        </div>

        {loading && (
          <p>Loading your resources...</p>
        )}

        {!loading && error && (
          <div className="resource-card">
            <p
              style={{
                color: "red",
                fontWeight: "600",
              }}
            >
              {error}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          resources.length === 0 && (
            <div className="resource-card">
              <div className="resource-info">
                <h3>No resources posted yet</h3>

                <p className="category">
                  You haven't posted any resources.
                </p>

                <button
                  type="button"
                  className="small-button"
                  onClick={() =>
                    navigate("/post-resource")
                  }
                >
                  + Post Resource
                </button>
              </div>
            </div>
          )}

        {!loading &&
          !error &&
          resources.length > 0 && (
            <div className="resource-list">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="resource-card"
                  style={{
                    marginBottom: "16px",
                  }}
                >
                  <div className="resource-info">

                    <h3>{resource.title}</h3>

                    <p className="category">
                      {resource.category ||
                        "Not specified"}
                    </p>

                    <p>
                      {resource.description ||
                        "No description provided"}
                    </p>

                    <p>
                      <strong>Availability:</strong>{" "}
                      {resource.availability ||
                        "Available"}
                    </p>

                    <p>
                      <strong>Created:</strong>{" "}
                      {resource.created_at
                        ? new Date(
                            resource.created_at
                          ).toLocaleString()
                        : "Not available"}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "12px",
                      }}
                    >
                      <button
                        type="button"
                        className="small-button"
                        onClick={() =>
                          navigate(
                            `/resources/${resource.id}/edit`
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="small-button"
                        style={{
                          background: "#dc2626",
                        }}
                        onClick={() =>
                          handleDelete(resource.id)
                        }
                      >
                        Delete
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

      </main>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default MyResources;
