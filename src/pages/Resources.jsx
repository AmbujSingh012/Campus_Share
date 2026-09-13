import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import ResourceCard from "../components/ResourceCard";

import { getResources, borrowResource } from "../api";

function Resources() {
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [borrowingId, setBorrowingId] = useState(null);

  // Current logged-in user
  const currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // =====================================================
  // LOAD RESOURCES
  // =====================================================

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
  }, []);

  // =====================================================
  // BORROW RESOURCE
  // =====================================================

  const handleBorrow = async (resource) => {
    try {
      setBorrowingId(resource.id);
      setError("");

      const data = await borrowResource(resource.id);

      if (data.success) {
        // Update resource on screen immediately
        setResources((previousResources) =>
          previousResources.map((item) =>
            item.id === resource.id
              ? data.resource
              : item
          )
        );
      } else {
        setError(
          data.message || "Failed to borrow resource"
        );
      }
    } catch (err) {
      console.error("Borrow resource error:", err);

      setError(
        err.message || "Failed to borrow resource"
      );
    } finally {
      setBorrowingId(null);
    }
  };

  // =====================================================
  // POST RESOURCE
  // =====================================================

  const handlePostResource = () => {
    navigate("/post-resource");
  };

  // =====================================================
  // LOADING
  // =====================================================

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

  // =====================================================
  // ERROR
  // =====================================================

  if (error && resources.length === 0) {
    return (
      <div className="page">
        <Header title="CampusShare" />

        <main className="page-content">
          <h2>Campus Resources</h2>

          <p
            style={{
              color: "red",
              fontWeight: "600",
            }}
          >
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

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="page">
      <Header title="CampusShare" />

      <main className="page-content">

        {/* Page Heading */}
        <div className="welcome-section">
          <h2>Campus Resources</h2>

          <p>
            Find useful resources shared by students.
          </p>
        </div>

        {/* Post Resource Button */}
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

        {/* Borrow Error */}
        {error && (
          <p
            style={{
              color: "red",
              fontWeight: "600",
              marginBottom: "15px",
            }}
          >
            {error}
          </p>
        )}

        {/* =====================================================
            NO RESOURCES
        ===================================================== */}

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

          /* =====================================================
             RESOURCE LIST
          ===================================================== */

          <div className="resource-list">

            {resources.map((resource) => {

              // =====================================================
              // RESOURCE STATUS
              // =====================================================

              const isBorrowed =
                String(resource.availability || "")
                  .toLowerCase() === "borrowed" ||
                Boolean(resource.borrowed_by);

              const isOwner =
                Number(currentUser?.id) ===
                Number(resource.user_id);

              const isBorrowing =
                borrowingId === resource.id;

              return (
                <div key={resource.id}>

                  {/* =====================================================
                      RESOURCE IMAGE
                  ===================================================== */}


                  {/* =====================================================
                      RESOURCE CARD
                  ===================================================== */}

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
  rating={
    resource.averageRating > 0
      ? resource.averageRating
      : "No ratings"
  }
  location={
    resource.location ||
    "Not specified"
  }
  imageUrl={resource.image_url}
  onBorrow={() =>
    handleBorrow(resource)
  }
/>

                  {/* =====================================================
                      RESOURCE DETAILS
                  ===================================================== */}

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

                    {/* Description */}
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

                    {/* Owner */}
                    <p
                      style={{
                        margin: "6px 0",
                        fontSize: "13px",
                      }}
                    >
                      <strong>Owner:</strong>{" "}
                      {resource.postedBy ||
                        "Unknown"}
                    </p>

                    {/* Owner Email */}
                    <p
                      style={{
                        margin: "6px 0",
                        fontSize: "13px",
                      }}
                    >
                      <strong>Owner Email:</strong>{" "}
                      {resource.ownerEmail ||
                        "Not available"}
                    </p>

                    {/* Owner Mobile */}
                    <p
                      style={{
                        margin: "6px 0",
                        fontSize: "13px",
                      }}
                    >
                      <strong>Owner Mobile:</strong>{" "}
                      {resource.ownerMobile ||
                        "Not available"}
                    </p>

                    {/* Location */}
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

                    {/* Availability */}
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

                    {/* Created */}
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

                    {/* =====================================================
                        BORROWER DETAILS
                    ===================================================== */}

                    {isBorrowed &&
                      resource.borrowedBy && (
                        <>
                          <p
                            style={{
                              margin: "6px 0",
                              fontSize: "13px",
                            }}
                          >
                            <strong>
                              Borrowed By:
                            </strong>{" "}
                            {resource.borrowedBy}
                          </p>

                          <p
                            style={{
                              margin: "6px 0",
                              fontSize: "13px",
                            }}
                          >
                            <strong>
                              Borrower Email:
                            </strong>{" "}
                            {resource.borrowerEmail ||
                              "Not available"}
                          </p>

                          <p
                            style={{
                              margin: "6px 0",
                              fontSize: "13px",
                            }}
                          >
                            <strong>
                              Borrower Mobile:
                            </strong>{" "}
                            {resource.borrowerMobile ||
                              "Not available"}
                          </p>

                          <p
                            style={{
                              margin: "6px 0",
                              fontSize: "13px",
                            }}
                          >
                            <strong>
                              Borrowed At:
                            </strong>{" "}
                            {resource.borrowed_at
                              ? new Date(
                                  resource.borrowed_at
                                ).toLocaleString()
                              : "Not available"}
                          </p>
                        </>
                      )}

                    {/* =====================================================
                        BORROW BUTTON
                    ===================================================== */}

                    {isOwner ? (

                      <button
                        className="small-button"
                        disabled
                        style={{
                          background: "#94A3B8",
                          cursor: "not-allowed",
                        }}
                      >
                        Your Resource
                      </button>

                    ) : isBorrowed ? (

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
                        disabled={isBorrowing}
                      >
                        {isBorrowing
                          ? "Borrowing..."
                          : "Borrow Resource"}
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