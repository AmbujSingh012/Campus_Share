import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

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
          `http://localhost:3000/api/resources/${id}`,
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
        `http://localhost:3000/api/resources/${id}`,
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
      <div className="page">
        <Header title="Edit Resource" />

        <main className="page-content">
          <p>Loading resource...</p>
        </main>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Header title="Edit Resource" />

        <main className="page-content">
          <button
            type="button"
            className="small-button"
            onClick={() => navigate("/my-resources")}
          >
            ← Back
          </button>

          <p
            style={{
              color: "red",
              fontWeight: "600",
              marginTop: "20px",
            }}
          >
            {error}
          </p>
        </main>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  return (
    <div className="page">
      <Header title="Edit Resource" />

      <main className="page-content">
        <button
          type="button"
          className="small-button"
          onClick={() => navigate("/my-resources")}
        >
          ← Back
        </button>

        <h2 style={{ marginTop: "20px" }}>
          Edit Resource
        </h2>

        <form onSubmit={handleUpdate}>
          <label>Title</label>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter resource title"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "18px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          />

          <label>Description</label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            rows="4"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "18px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              resize: "vertical",
            }}
          />

          <label>Category</label>

          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Enter category"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "18px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          />

          <label>Availability</label>

          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "20px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>

          <button
            type="submit"
            className="logout-button"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </main>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default EditResource;
