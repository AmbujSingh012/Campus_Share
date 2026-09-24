import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  MapPin,
  Star,
  User,
  Clock3,
} from "lucide-react";

import { getResourceById } from "../api";
import BottomNavigation from "../components/BottomNavigation";
import "./Resources.css";

function ResourceDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResource = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getResourceById(id);

        if (!data.success || !data.resource) {
          setError(data.message || "Resource not found");
          return;
        }

        setResource(data.resource);
      } catch (err) {
        console.error("Resource details error:", err);
        setError("Unable to load resource details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadResource();
    } else {
      setError("Invalid resource ID");
      setLoading(false);
    }
  }, [id]);

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const isOwner =
    Number(currentUser?.id) === Number(resource?.user_id);

  const isBorrowed =
    String(resource?.availability || "")
      .toLowerCase() === "borrowed" ||
    Boolean(resource?.borrowed_by);

  if (loading) {
    return (
      <div className="resources-modern-page">
        <div className="resources-modern-shell">
          <div className="resources-loading">
            <div className="resources-spinner"></div>
            <h2>Loading resource...</h2>
            <p>Fetching resource details.</p>
          </div>
        </div>

        <BottomNavigation active="resources" />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="resources-modern-page">
        <div className="resources-modern-shell">
          <header className="resources-topbar">
            <button
              type="button"
              className="resources-back"
              onClick={() => navigate("/my-resources")}
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="resources-campus">
              <span className="resources-campus-dot"></span>
              <span>Resource Details</span>
            </div>
          </header>

          <main className="resources-modern-content">
            <section className="resources-empty">
              <div className="resources-empty-icon">
                <Package size={32} />
              </div>

              <h3>Resource not found</h3>

              <p>
                {error || "This resource could not be loaded."}
              </p>

              <button
                type="button"
                className="resources-borrow-button"
                onClick={() => navigate("/my-resources")}
              >
                Back to My Resources
              </button>
            </section>
          </main>
        </div>

        <BottomNavigation active="resources" />
      </div>
    );
  }

  return (
    <div className="resources-modern-page">
      <div className="resources-modern-shell">
        <header className="resources-topbar">
          <button
            type="button"
            className="resources-back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="resources-campus">
            <span className="resources-campus-dot"></span>
            <span>Resource Details</span>
          </div>
        </header>

        <main className="resources-modern-content">
          <section className="resources-hero">
            <div>
              <span className="resources-eyebrow">
                CAMPUS RESOURCE
              </span>

              <h1>
                {resource.title}
                <span>.</span>
              </h1>

              <p>
                View the complete details of this shared
                campus resource.
              </p>
            </div>

            <div className="resources-hero-stat">
              <Package size={22} />

              <strong>
                ₹{Number(resource.borrowing_fee || 0).toFixed(2)}
              </strong>

              <span>borrowing fee</span>
            </div>
          </section>

          <section className="resources-grid">
            <article className="resources-item">
              <div className="resources-item-details">
                <h3 className="resources-resource-name">
                  {resource.title}
                </h3>

                <div className="resources-meta-row">
                  <span className="resources-location">
                    <MapPin size={14} />
                    {resource.location || "Campus"}
                  </span>

                  <span className="resources-rating">
                    <Star size={14} />
                    {resource.averageRating > 0
                      ? resource.averageRating
                      : "New"}
                  </span>
                </div>

                <p className="resources-description">
                  {resource.description ||
                    "A useful resource shared by a fellow student."}
                </p>

                <div className="resources-owner-row">
                  <div className="resources-avatar">
                    {String(
                      resource.postedBy ||
                        resource.ownerName ||
                        "S"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <small>Shared by</small>

                    <strong>
                      {resource.postedBy ||
                        resource.ownerName ||
                        "Student"}
                    </strong>
                  </div>
                </div>

                <div className="resources-owner-row">
                  <div className="resources-avatar">
                    <User size={16} />
                  </div>

                  <div>
                    <small>Category</small>

                    <strong>
                      {resource.category || "Other"}
                    </strong>
                  </div>
                </div>

                <div className="resources-owner-row">
                  <div className="resources-avatar">
                    <Clock3 size={16} />
                  </div>

                  <div>
                    <small>Posted</small>

                    <strong>
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
                        : "Recently"}
                    </strong>
                  </div>
                </div>

                {isOwner ? (
                  <button
                    type="button"
                    className="resources-status-button owner"
                    disabled
                  >
                    Your resource
                  </button>
                ) : isBorrowed ? (
                  <button
                    type="button"
                    className="resources-status-button borrowed"
                    disabled
                  >
                    ✓ Currently borrowed
                  </button>
                ) : (
                  <button
                    type="button"
                    className="resources-borrow-button"
                    onClick={() => navigate("/resources")}
                  >
                    Borrow resource
                  </button>
                )}
              </div>
            </article>
          </section>
        </main>
      </div>

      <BottomNavigation active="resources" />
    </div>
  );
}

export default ResourceDetails;
