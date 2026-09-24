import API_BASE_URL from "../api";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Edit3,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import BottomNavigation from "../components/BottomNavigation";
import "./EditResource.css";

function EditResource() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("available");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResource = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/resources/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.message || "Failed to load resource");
          return;
        }

        const resource = data.resource;

        setTitle(resource.title || "");
        setDescription(resource.description || "");
        setCategory(resource.category || "");
        setAvailability(resource.availability || "available");
      } catch (error) {
        console.error("Load resource error:", error);
        setError("Unable to connect to backend");
      } finally {
        setLoading(false);
      }
    };

    loadResource();
  }, [id, navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!title.trim() || !category.trim()) {
      alert("Title and category are required.");
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/resources/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            category: category.trim(),
            availability,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "Failed to update resource");
        return;
      }

      alert("Resource updated successfully!");
      navigate("/my-resources");
    } catch (error) {
      console.error("Update resource error:", error);
      alert("Unable to connect to backend");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-resource-state-page">
        <div className="edit-resource-state-card">
          <div className="edit-resource-state-icon">
            <Loader2 size={28} className="spin" />
          </div>

          <h2>Loading resource</h2>
          <p>
            Give us a moment while we fetch your resource details.
          </p>
        </div>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="edit-resource-state-page">
        <div className="edit-resource-state-card">
          <div className="edit-resource-state-icon error">
            <CircleAlert size={28} />
          </div>

          <h2>Couldn't load resource</h2>

          <p>{error}</p>

          <button
            type="button"
            className="edit-resource-state-button"
            onClick={() => navigate("/my-resources")}
          >
            <ArrowLeft size={15} />
            Back to My Resources
          </button>
        </div>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  return (
    <div className="edit-resource-page app-page-frame">
      <div className="edit-resource-shell">
        <header className="edit-resource-topbar">
          <button
            type="button"
            className="edit-resource-back"
            onClick={() => navigate("/my-resources")}
            aria-label="Back"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="edit-resource-topbar-copy">
            <span>CampusShare</span>
            <strong>Edit Resource</strong>
          </div>
        </header>

        <main className="edit-resource-content">
          <section className="edit-resource-hero">
            <div>
              <span className="edit-resource-eyebrow">
                <Sparkles size={11} /> UPDATE YOUR LISTING
              </span>

              <h1>Make it better.</h1>

              <p>
                Keep your resource details accurate so students know
                exactly what is available and how to use it.
              </p>
            </div>

            <div className="edit-resource-hero-icon">
              <Edit3 size={30} />
            </div>
          </section>

          <section className="edit-resource-card">
            <form
              className="edit-resource-form"
              onSubmit={handleUpdate}
            >
              <div className="edit-resource-field">
                <label htmlFor="resource-title">
                  Resource title
                </label>

                <input
                  id="resource-title"
                  className="edit-resource-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DBMS Notes, Scientific Calculator"
                />
              </div>

              <div className="edit-resource-field">
                <label htmlFor="resource-description">
                  Description <span>Optional</span>
                </label>

                <textarea
                  id="resource-description"
                  className="edit-resource-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add useful details about the resource..."
                  rows="5"
                />
              </div>

              <div className="edit-resource-grid">
                <div className="edit-resource-field">
                  <label htmlFor="resource-category">
                    Category
                  </label>

                  <input
                    id="resource-category"
                    className="edit-resource-input"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Books, Electronics"
                  />
                </div>

                <div className="edit-resource-field">
                  <label>Availability</label>

                  <div className="edit-resource-availability">
                    <div className="edit-resource-availability-option">
                      <input
                        id="availability-available"
                        type="radio"
                        name="availability"
                        value="available"
                        checked={availability === "available"}
                        onChange={(e) =>
                          setAvailability(e.target.value)
                        }
                      />

                      <label htmlFor="availability-available">
                        <Check size={15} />
                        Available
                      </label>
                    </div>

                    <div className="edit-resource-availability-option">
                      <input
                        id="availability-unavailable"
                        type="radio"
                        name="availability"
                        value="unavailable"
                        checked={availability === "unavailable"}
                        onChange={(e) =>
                          setAvailability(e.target.value)
                        }
                      />

                      <label htmlFor="availability-unavailable">
                        Unavailable
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="edit-resource-form-footer">
                <button
                  type="button"
                  className="edit-resource-cancel"
                  onClick={() => navigate("/my-resources")}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="edit-resource-save"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default EditResource;
