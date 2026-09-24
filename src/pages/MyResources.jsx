import API_BASE_URL from "../api";

import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Edit3,
  Package,
  Plus,
  Trash2,
  MapPin,
  Clock3,
  CheckCircle2,
  XCircle,
  Layers3,
  RotateCcw,
} from "lucide-react";

import BottomNavigation from "../components/BottomNavigation";

import "./MyResources.css";

function MyResources() {
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);

  const [borrowedResources, setBorrowedResources] = useState([]);

  const [returnedResources, setReturnedResources] = useState([]);

  const [returnedLoading, setReturnedLoading] = useState(true);

  const [returnedError, setReturnedError] = useState("");

  const [loading, setLoading] = useState(true);

  const [borrowedLoading, setBorrowedLoading] = useState(true);

  const [error, setError] = useState("");

  const [borrowedError, setBorrowedError] = useState("");

  const [returningId, setReturningId] = useState(null);

  // =====================================================
  // RATING STATE
  // =====================================================

  const [ratingResourceId, setRatingResourceId] = useState(null);

  const [ratingValue, setRatingValue] = useState(0);

  const [ratingComment, setRatingComment] = useState("");

  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const [ratingError, setRatingError] = useState("");

  const [ratingSuccess, setRatingSuccess] = useState("");

  const selectedCollege = JSON.parse(
    localStorage.getItem("selectedCollege") || "null"
  );

  const collegeName = selectedCollege?.name || "Your Campus";

  // =====================================================
  // LOAD MY RESOURCES
  // =====================================================

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
          `${API_BASE_URL}/api/resources/my`,
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

  // =====================================================
  // LOAD BORROWED RESOURCES
  // =====================================================

  useEffect(() => {
    const loadBorrowedResources = async () => {
      try {
        setBorrowedLoading(true);
        setBorrowedError("");

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/resources/borrowed`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setBorrowedError(
            data.message ||
              "Failed to load borrowed resources"
          );
          return;
        }

        setBorrowedResources(data.resources || []);
      } catch (error) {
        console.error(
          "Borrowed resources error:",
          error
        );

        setBorrowedError(
          "Unable to connect to backend"
        );
      } finally {
        setBorrowedLoading(false);
      }
    };

    loadBorrowedResources();
  }, [navigate]);

  // =====================================================
  // LOAD RETURNED RESOURCES
  // =====================================================

  useEffect(() => {
    const loadReturnedResources = async () => {
      try {
        setReturnedLoading(true);
        setReturnedError("");

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/resources/returned`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setReturnedError(
            data.message ||
              "Failed to load returned resources"
          );
          return;
        }

        setReturnedResources(data.resources || []);
      } catch (error) {
        console.error(
          "Returned resources error:",
          error
        );

        setReturnedError(
          "Unable to connect to backend"
        );
      } finally {
        setReturnedLoading(false);
      }
    };

    loadReturnedResources();
  }, [navigate]);

  // =====================================================
  // DELETE RESOURCE
  // =====================================================

  const handleDelete = async (resourceId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resource?"
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/resources/${resourceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Failed to delete resource"
        );
        return;
      }

      setResources((current) =>
        current.filter(
          (item) => item.id !== resourceId
        )
      );

      alert("Resource deleted successfully");
    } catch (error) {
      console.error(
        "Delete resource error:",
        error
      );

      alert("Unable to connect to backend");
    }
  };

  // =====================================================
  // RETURN RESOURCE
  // =====================================================

  const handleReturn = async (resourceId) => {
    const confirmed = window.confirm(
      "Are you sure you want to return this resource?"
    );

    if (!confirmed) return;

    try {
      setReturningId(resourceId);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/resources/${resourceId}/return`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Failed to return resource"
        );
        return;
      }

      setBorrowedResources((current) =>
        current.filter(
          (item) => item.id !== resourceId
        )
      );

      const returnedResponse = await fetch(
        `${API_BASE_URL}/api/resources/returned`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const returnedData =
        await returnedResponse.json();

      if (
        returnedResponse.ok &&
        returnedData.success
      ) {
        setReturnedResources(
          returnedData.resources || []
        );
      }

      alert("Resource returned successfully");
    } catch (error) {
      console.error(
        "Return resource error:",
        error
      );

      alert("Unable to connect to backend");
    } finally {
      setReturningId(null);
    }
  };

  // =====================================================
  // OPEN RATING FORM
  // =====================================================

  const handleOpenRating = (resourceId) => {
    setRatingResourceId(resourceId);
    setRatingValue(0);
    setRatingComment("");
    setRatingError("");
    setRatingSuccess("");
  };

  // =====================================================
  // CANCEL RATING
  // =====================================================

  const handleCancelRating = () => {
    setRatingResourceId(null);
    setRatingValue(0);
    setRatingComment("");
    setRatingError("");
    setRatingSuccess("");
  };

  // =====================================================
  // SUBMIT RATING
  // =====================================================

  const handleSubmitRating = async (resourceId) => {
    if (!ratingValue) {
      setRatingError(
        "Please select a rating from 1 to 5 stars."
      );
      return;
    }

    try {
      setRatingSubmitting(true);
      setRatingError("");
      setRatingSuccess("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/ratings`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            resource_id: resourceId,
            rating: ratingValue,
            comment: ratingComment.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setRatingError(
          data.message ||
            "Failed to submit rating"
        );
        return;
      }

      setRatingSuccess(
        "Rating submitted successfully."
      );

      // Refresh returned resources so alreadyRated
      // becomes 1 and Rate User disappears.
      const returnedResponse = await fetch(
        `${API_BASE_URL}/api/resources/returned`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const returnedData =
        await returnedResponse.json();

      if (
        returnedResponse.ok &&
        returnedData.success
      ) {
        setReturnedResources(
          returnedData.resources || []
        );
      }

      // Close rating form after successful submission.
      setTimeout(() => {
        setRatingResourceId(null);
        setRatingValue(0);
        setRatingComment("");
        setRatingSuccess("");
      }, 1200);
    } catch (error) {
      console.error(
        "Submit rating error:",
        error
      );

      setRatingError(
        "Unable to connect to backend"
      );
    } finally {
      setRatingSubmitting(false);
    }
  };

  // =====================================================
  // AVAILABILITY
  // =====================================================

  const getAvailability = (resource) => {
    const value = String(
      resource.availability || "Available"
    ).toLowerCase();

    if (
      value.includes("borrow") ||
      value.includes("unavailable")
    ) {
      return {
        label: resource.availability,
        available: false,
      };
    }

    return {
      label:
        resource.availability ||
        "Available",

      available: true,
    };
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="my-resources-modern-page app-page-frame">
      <div className="my-resources-modern-shell">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="my-resources-topbar">
          <button
            type="button"
            className="my-resources-back"
            onClick={() =>
              navigate("/profile")
            }
            aria-label="Back to profile"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="my-resources-campus">
            <span className="my-resources-campus-dot" />
            {collegeName}
          </div>

          <button
            type="button"
            className="my-resources-add-top"
            onClick={() =>
              navigate("/post-resource")
            }
          >
            <Plus size={18} />
            <span>Post</span>
          </button>
        </header>

        <main className="my-resources-content">

          {/* =================================================
              HEADING
          ================================================= */}

          <section className="my-resources-heading">
            <div>
              <span className="my-resources-eyebrow">
                YOUR SHARED STUFF
              </span>

              <h1>
                My
                <span> resources.</span>
              </h1>

              <p>
                Keep track of everything you
                have shared with your campus
                community.
              </p>
            </div>

            <div className="my-resources-heading-icon">
              <Package size={30} />
            </div>
          </section>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <section className="my-resources-summary">
            <div className="my-resources-summary-card">
              <div className="my-resources-summary-icon blue">
                <Layers3 size={19} />
              </div>

              <div>
                <strong>
                  {resources.length}
                </strong>

                <span>
                  Total resources
                </span>
              </div>
            </div>

            <div className="my-resources-summary-card">
              <div className="my-resources-summary-icon green">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <strong>
                  {
                    resources.filter(
                      (resource) =>
                        getAvailability(
                          resource
                        ).available
                    ).length
                  }
                </strong>

                <span>
                  Available now
                </span>
              </div>
            </div>
          </section>

          {/* =================================================
              MY RESOURCES LOADING
          ================================================= */}

          {loading && (
            <div className="my-resources-state-card">
              <div className="my-resources-state-icon">
                <Package size={26} />
              </div>

              <strong>
                Loading your resources...
              </strong>

              <span>
                Just a moment while we fetch
                your shared items.
              </span>
            </div>
          )}

          {/* =================================================
              MY RESOURCES ERROR
          ================================================= */}

          {!loading && error && (
            <div className="my-resources-state-card error">
              <div className="my-resources-state-icon">
                <XCircle size={26} />
              </div>

              <strong>
                Couldn’t load your resources
              </strong>

              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try again
              </button>
            </div>
          )}

          {/* =================================================
              MY RESOURCES EMPTY
          ================================================= */}

          {!loading &&
            !error &&
            resources.length === 0 && (
              <div className="my-resources-state-card">
                <div className="my-resources-empty-visual">
                  <Package size={32} />
                </div>

                <strong>
                  Nothing shared yet
                </strong>

                <span>
                  Post your first calculator,
                  notes, lab coat, cycle or
                  other useful item.
                </span>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/post-resource"
                    )
                  }
                >
                  <Plus size={18} />
                  Post a resource
                </button>
              </div>
            )}

          {/* =================================================
              MY RESOURCES LIST
          ================================================= */}

          {!loading &&
            !error &&
            resources.length > 0 && (
              <section className="my-resources-list-section">

                <div className="my-resources-list-header">
                  <div>
                    <span>
                      YOUR COLLECTION
                    </span>

                    <h2>
                      Shared resources
                    </h2>
                  </div>

                  <span className="my-resources-count">
                    {resources.length}{" "}
                    {resources.length === 1
                      ? "item"
                      : "items"}
                  </span>
                </div>

                <div className="my-resources-list">
                  {resources.map((resource) => {
                    const availability =
                      getAvailability(
                        resource
                      );

                    return (
                      <article
                        key={resource.id}
                        className="my-resource-card"
                      >
                        <div className="my-resource-card-top">

                          <div className="my-resource-icon">
                            <Package size={23} />
                          </div>

                          <div className="my-resource-main">

                            <div className="my-resource-title-row">
                              <h3>
                                {resource.title}
                              </h3>

                              <span
                                className={
                                  availability.available
                                    ? "my-resource-status available"
                                    : "my-resource-status unavailable"
                                }
                              >
                                {availability.available ? (
                                  <CheckCircle2
                                    size={13}
                                  />
                                ) : (
                                  <XCircle
                                    size={13}
                                  />
                                )}

                                {
                                  availability.label
                                }
                              </span>
                            </div>

                            <span className="my-resource-category">
                              {resource.category ||
                                "Other"}
                            </span>
                          </div>
                        </div>

                        <p className="my-resource-description">
                          {resource.description ||
                            "No description provided."}
                        </p>

                        <div className="my-resource-meta">
                          <span>
                            <MapPin size={15} />

                            {resource.location ||
                              resource.pickup_location ||
                              "Campus pickup"}
                          </span>

                          <span>
                            <Clock3 size={15} />

                            {resource.created_at
                              ? new Date(
                                  resource.created_at
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "Recently posted"}
                          </span>
                        </div>

                        <div className="my-resource-divider" />

                        <div className="my-resource-actions">

                          <button
                            type="button"
                            className="my-resource-edit"
                            onClick={() =>
                              navigate(
                                `/resources/${resource.id}/edit`
                              )
                            }
                          >
                            <Edit3 size={16} />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="my-resource-delete"
                            onClick={() =>
                              handleDelete(
                                resource.id
                              )
                            }
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>

                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

          {/* =================================================
              BORROWED RESOURCES
          ================================================= */}

          {!borrowedLoading &&
            !borrowedError &&
            borrowedResources.length > 0 && (
              <section className="my-resources-list-section">

                <div className="my-resources-list-header">
                  <div>
                    <span>
                      CURRENTLY WITH YOU
                    </span>

                    <h2>
                      Borrowed resources
                    </h2>
                  </div>

                  <span className="my-resources-count">
                    {borrowedResources.length}{" "}
                    {borrowedResources.length === 1
                      ? "item"
                      : "items"}
                  </span>
                </div>

                <div className="my-resources-list">

                  {borrowedResources.map(
                    (resource) => (
                      <article
                        key={resource.id}
                        className="my-resource-card"
                      >

                        <div className="my-resource-card-top">

                          <div className="my-resource-icon">
                            <Package size={23} />
                          </div>

                          <div className="my-resource-main">

                            <div className="my-resource-title-row">

                              <h3>
                                {resource.title}
                              </h3>

                              <span className="my-resource-status unavailable">
                                <Clock3 size={13} />
                                Borrowed
                              </span>

                            </div>

                            <span className="my-resource-category">
                              {resource.category ||
                                "Other"}
                            </span>

                          </div>
                        </div>

                        <p className="my-resource-description">
                          {resource.description ||
                            "No description provided."}
                        </p>

                        <div className="my-resource-meta">

                          <span>
                            <MapPin size={15} />

                            {resource.location ||
                              "Campus pickup"}
                          </span>

                          <span>
                            <Clock3 size={15} />

                            {resource.borrowed_at
                              ? `Borrowed ${new Date(
                                  resource.borrowed_at
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}`
                              : "Currently borrowed"}
                          </span>

                        </div>

                        <div className="my-resource-divider" />

                        <div className="my-resource-actions">

                          <button
                            type="button"
                            className="my-resource-edit"
                            disabled={
                              returningId ===
                              resource.id
                            }
                            onClick={() =>
                              handleReturn(
                                resource.id
                              )
                            }
                          >
                            <RotateCcw size={16} />

                            {returningId ===
                            resource.id
                              ? "Returning..."
                              : "Return Resource"}
                          </button>

                          <button
                            type="button"
                            className="my-resource-delete"
                            onClick={() =>
                              navigate(
                                `/resources/${resource.id}`
                              )
                            }
                          >
                            <Package size={16} />
                            View Resource
                          </button>

                        </div>
                      </article>
                    )
                  )}

                </div>
              </section>
            )}

          {/* =================================================
              RETURNED RESOURCES
          ================================================= */}

          {!returnedLoading &&
            !returnedError &&
            returnedResources.length > 0 && (
              <section className="my-resources-list-section">

                <div className="my-resources-list-header">

                  <div>
                    <span>
                      COMPLETED TRANSACTIONS
                    </span>

                    <h2>
                      Returned resources
                    </h2>
                  </div>

                  <span className="my-resources-count">
                    {returnedResources.length}{" "}
                    {returnedResources.length === 1
                      ? "item"
                      : "items"}
                  </span>

                </div>

                <div className="my-resources-list">

                  {returnedResources.map(
                    (resource) => (
                      <article
                        key={resource.id}
                        className="my-resource-card"
                      >

                        <div className="my-resource-card-top">

                          <div className="my-resource-icon">
                            <Package size={23} />
                          </div>

                          <div className="my-resource-main">

                            <div className="my-resource-title-row">

                              <h3>
                                {resource.title}
                              </h3>

                              <span className="my-resource-status available">
                                <CheckCircle2 size={13} />
                                Returned
                              </span>

                            </div>

                            <span className="my-resource-category">
                              {resource.category ||
                                "Other"}
                            </span>

                          </div>
                        </div>

                        <p className="my-resource-description">
                          {resource.description ||
                            "No description provided."}
                        </p>

                        <div className="my-resource-meta">

                          <span>
                            <MapPin size={15} />

                            {resource.location ||
                              "Campus pickup"}
                          </span>

                          <span>
                            <Clock3 size={15} />

                            {resource.paid_at
                              ? `Paid ${new Date(
                                  resource.paid_at
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}`
                              : "Transaction completed"}
                          </span>

                        </div>

                        <div className="my-resource-divider" />

                        {/* =================================================
                            RATING FORM
                        ================================================= */}

                        {ratingResourceId ===
                        resource.id ? (

                          <div>

                            <strong>
                              Rate User
                            </strong>

                            <p
                              style={{
                                margin: "8px 0",
                              }}
                            >
                              How was your experience?
                            </p>

                            {/* STAR RATING */}

                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems:
                                  "center",
                                flexWrap:
                                  "wrap",
                                marginBottom:
                                  "16px",
                              }}
                            >
                              {[1, 2, 3, 4, 5].map(
                                (star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    className="my-resource-edit"
                                    onClick={() =>
                                      setRatingValue(
                                        star
                                      )
                                    }
                                    disabled={
                                      ratingSubmitting
                                    }
                                    style={{
                                      minWidth:
                                        "44px",
                                      minHeight:
                                        "40px",
                                      padding:
                                        "8px 12px",
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      justifyContent:
                                        "center",
                                      fontSize:
                                        "20px",
                                    }}
                                    aria-label={`${star} star${
                                      star > 1
                                        ? "s"
                                        : ""
                                    }`}
                                  >
                                    {ratingValue >=
                                    star
                                      ? "★"
                                      : "☆"}
                                  </button>
                                )
                              )}
                            </div>

                            {/* COMMENT BLOCK */}

                            <div
                              style={{
                                width: "100%",
                                display: "block",
                                marginBottom:
                                  "14px",
                              }}
                            >
                              <label
                                htmlFor={`rating-comment-${resource.id}`}
                                style={{
                                  display:
                                    "block",
                                  marginBottom:
                                    "6px",
                                  fontWeight:
                                    600,
                                }}
                              >
                                Comment
                              </label>

                              <textarea
                                id={`rating-comment-${resource.id}`}
                                value={
                                  ratingComment
                                }
                                onChange={(e) =>
                                  setRatingComment(
                                    e.target.value
                                  )
                                }
                                placeholder="Write an optional comment..."
                                rows={4}
                                maxLength={500}
                                disabled={
                                  ratingSubmitting
                                }
                                style={{
                                  display:
                                    "block",
                                  width: "100%",
                                  boxSizing:
                                    "border-box",
                                  padding:
                                    "10px 12px",
                                  border:
                                    "1px solid #d1d5db",
                                  borderRadius:
                                    "8px",
                                  resize:
                                    "vertical",
                                  fontFamily:
                                    "inherit",
                                  fontSize:
                                    "14px",
                                  lineHeight:
                                    "1.5",
                                }}
                              />

                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  fontSize:
                                    "12px",
                                  color:
                                    "#64748b",
                                  textAlign:
                                    "right",
                                }}
                              >
                                {
                                  ratingComment.length
                                }
                                /500
                              </div>
                            </div>

                            {/* ERROR */}

                            {ratingError && (
                              <p
                                style={{
                                  margin:
                                    "8px 0",
                                  color:
                                    "#dc2626",
                                }}
                              >
                                {ratingError}
                              </p>
                            )}

                            {/* SUCCESS */}

                            {ratingSuccess && (
                              <p
                                style={{
                                  margin:
                                    "8px 0",
                                  color:
                                    "#16a34a",
                                }}
                              >
                                {ratingSuccess}
                              </p>
                            )}

                            {/* ACTION BUTTONS */}

                            <div
                              style={{
                                display: "flex",
                                gap: "12px",
                                flexWrap:
                                  "wrap",
                                alignItems:
                                  "center",
                                marginTop:
                                  "12px",
                              }}
                            >

                              <button
                                type="button"
                                className="my-resource-edit"
                                onClick={() =>
                                  handleSubmitRating(
                                    resource.id
                                  )
                                }
                                disabled={
                                  ratingSubmitting
                                }
                              >
                                {ratingSubmitting
                                  ? "Submitting..."
                                  : "Submit Rating"}
                              </button>

                              <button
                                type="button"
                                className="my-resource-delete"
                                onClick={
                                  handleCancelRating
                                }
                                disabled={
                                  ratingSubmitting
                                }
                              >
                                Cancel
                              </button>

                            </div>

                          </div>

                        ) : (

                          /* =================================================
                              NORMAL RETURNED RESOURCE BUTTONS
                          ================================================= */

                          <div
                            style={{
                              display: "flex",
                              gap: "12px",
                              flexWrap: "wrap",
                              alignItems:
                                "center",
                            }}
                          >

                            {Number(
                              resource.alreadyRated ||
                                0
                            ) === 1 ? (

                              <button
                                type="button"
                                className="my-resource-edit"
                                disabled
                                style={{
                                  minHeight:
                                    "40px",
                                  padding:
                                    "8px 16px",
                                  borderRadius:
                                    "8px",
                                }}
                              >
                                ★ Already Rated
                              </button>

                            ) : (

                              <button
                                type="button"
                                className="my-resource-edit"
                                onClick={() =>
                                  handleOpenRating(
                                    resource.id
                                  )
                                }
                                style={{
                                  minHeight:
                                    "40px",
                                  padding:
                                    "8px 16px",
                                  borderRadius:
                                    "8px",
                                }}
                              >
                                ⭐ Rate User
                              </button>

                            )}

                            <button
                              type="button"
                              className="my-resource-edit"
                              onClick={() =>
                                navigate(
                                  `/resources/${resource.id}`
                                )
                              }
                              style={{
                                minHeight:
                                  "40px",
                                padding:
                                  "8px 16px",
                                borderRadius:
                                  "8px",
                              }}
                            >
                              View Resource
                            </button>

                          </div>
                        )}

                      </article>
                    )
                  )}

                </div>
              </section>
            )}

          {/* =================================================
              RETURNED RESOURCES ERROR
          ================================================= */}

          {!returnedLoading &&
            returnedError && (
              <div className="my-resources-state-card error">

                <div className="my-resources-state-icon">
                  <XCircle size={26} />
                </div>

                <strong>
                  Couldn’t load returned resources
                </strong>

                <span>
                  {returnedError}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
                >
                  Try again
                </button>

              </div>
            )}

          {/* =================================================
              BORROWED RESOURCES ERROR
          ================================================= */}

          {!borrowedLoading &&
            borrowedError && (
              <div className="my-resources-state-card error">

                <div className="my-resources-state-icon">
                  <XCircle size={26} />
                </div>

                <strong>
                  Couldn’t load borrowed resources
                </strong>

                <span>
                  {borrowedError}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
                >
                  Try again
                </button>

              </div>
            )}

        </main>
      </div>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default MyResources;