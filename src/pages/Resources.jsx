
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import ResourceCard from "../components/ResourceCard";
import { getResources } from "../api";

function Resources() {
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [borrowedResources, setBorrowedResources] = useState({});

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        setError("");

        const data = await getResources();

        if (data.success) {
          setResources(data.resources || []);
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
      <div className="page">
        <Header title="CampusShare" />

        <main className="page-content">
          <h2>Campus Resources</h2>
          <p>Loading resources...</p>
        </main>

        <BottomNavigation active="resources" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Header title="CampusShare" />

        <main className="page-content">
          <h2>Campus Resources</h2>

          <p style={{ color: "red", fontWeight: "600" }}>
            {error}
          </p>

          <p>
            Make sure the CampusShare backend is running
            on port 3000.
          </p>
        </main>

        <BottomNavigation active="resources" />
      </div>
    );
  }

  return (
    <div className="page">
      <Header title="CampusShare" />

      <main className="page-content">
        <div className="welcome-section">
          <h2>Campus Resources</h2>
          <p>
            Find useful resources shared by students.
          </p>
        </div>

        <button
          className="quick-action post-action"
          onClick={handlePostResource}
          style={{
            width: "100%",
            marginBottom: "20px",
          }}
        >
          + Post Resource
        </button>

        {resources.length === 0 ? (
          <div className="resource-card">
            <div className="resource-info">
              <h3>No resources available</h3>

              <p className="category">
                Be the first student to post a resource.
              </p>

              <button
                className="small-button"
                onClick={handlePostResource}
              >
                + Post Resource
              </button>
            </div>
          </div>
        ) : (
          <div className="resource-list">
            {resources.map((resource) => {
              const isBorrowed =
                borrowedResources[resource.id];

              return (
                <div key={resource.id}>

                  {/* RESOURCE IMAGE */}
                  {resource.image_url && (
                    <img
                      src={`http://localhost:3000${resource.image_url}`}
                      alt={resource.title}
                      style={{
                        width: "100%",
                        height: "220px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        marginBottom: "10px",
                        display: "block",
                      }}
                      onError={(e) => {
                        console.error(
                          "Image failed to load:",
                          `http://localhost:3000${resource.image_url}`
                        );

                        e.currentTarget.style.display =
                          "none";
                      }}
                    />
                  )}

                  <ResourceCard
                    name={resource.title}
                    category={
                      resource.category ||
                      "Not specified"
                    }
                    owner={
                      resource.postedBy ||
                      "Unknown"
                    }
                    rating="4.8"
                  />

                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "12px",
                      marginTop: "-8px",
                      marginBottom: "16px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 10px",
                        color: "#64748B",
                        lineHeight: "1.5",
                      }}
                    >
                      {resource.description ||
                        "No description provided"}
                    </p>

                    <p
                      style={{
                        margin: "6px 0",
                        fontSize: "13px",
                      }}
                    >
                      <strong>Location:</strong>{" "}
                      {resource.location ||
                        "Not specified"}
                    </p>

                    <p
                      style={{
                        margin: "6px 0",
                        fontSize: "13px",
                      }}
                    >
                      <strong>Availability:</strong>{" "}
                      {resource.availability ||
                        "Available"}
                    </p>

                    <p
                      style={{
                        margin: "6px 0",
                        fontSize: "13px",
                      }}
                    >
                      <strong>Created:</strong>{" "}
                      {resource.created_at
                        ? new Date(
                            resource.created_at
                          ).toLocaleString()
                        : "Not available"}
                    </p>

                    {isBorrowed ? (
                      <button
                        className="small-button"
                        disabled
                        style={{
                          background: "#16a34a",
                          cursor: "not-allowed",
                        }}
                      >
                        ✓ Resource Borrowed
                      </button>
                    ) : (
                      <button
                        className="small-button"
                        onClick={() =>
                          handleBorrow(resource)
                        }
                      >
                        Borrow Resource
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNavigation active="resources" />
    </div>
  );
}

export default Resources;