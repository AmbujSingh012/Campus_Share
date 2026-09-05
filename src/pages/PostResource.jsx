
import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

const API_BASE_URL = "http://localhost:3000";

function PostResource() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [condition, setCondition] = useState("Excellent");
  const [availability, setAvailability] = useState(true);
  const [borrowingFee, setBorrowingFee] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    // Basic validation
    if (!title.trim()) {
      setError("Please enter a resource name.");
      return;
    }

    if (!category) {
      setError("Please select a category.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter a pickup location.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/resources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          location: location.trim(),

          // Current backend uses postedBy.
          // Using logged-in user's ID when available.
          postedBy:
            JSON.parse(localStorage.getItem("user") || "null")?.id || 2,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create resource.");
      }

      setMessage("Resource posted successfully!");

      // Clear form
      setTitle("");
      setCategory("");
      setDescription("");
      setLocation("");
      setCondition("Excellent");
      setAvailability(true);
      setBorrowingFee("");

      // Go to Resources page after successful posting
      setTimeout(() => {
        navigate("/resources");
      }, 1000);
    } catch (err) {
      console.error("Create resource error:", err);
      setError(
        err.message ||
          "Unable to connect to backend. Make sure the backend is running on port 3000."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Header title="Post Resource" showBack />

      <main className="page-content">
        <p className="form-description">
          Share an item with students on your campus
        </p>

        {/* Success message */}
        {message && (
          <div
            style={{
              backgroundColor: "#dcfce7",
              color: "#166534",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontWeight: "600",
            }}
          >
            {message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontWeight: "600",
            }}
          >
            {error}
          </div>
        )}

        <div className="upload-box">
          <ImagePlus size={30} />

          <h3>Upload Resource Image</h3>

          <p>PNG, JPG up to 5MB</p>
        </div>

        <form className="resource-form" onSubmit={handleSubmit}>
          {/* Resource Name */}
          <div className="form-group">
            <label className="form-label">Resource Name</label>

            <input
              className="form-input"
              type="text"
              placeholder="Enter resource name"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={loading}
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>

            <select
              className="form-input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={loading}
            >
              <option value="">Select category</option>
              <option value="Books">Books</option>
              <option value="Electronics">Electronics</option>
              <option value="Sports">Sports</option>
              <option value="Clothing">Clothing</option>
              <option value="Study Materials">Study Materials</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>

            <textarea
              className="form-input textarea"
              placeholder="Describe your resource"
              rows="4"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={loading}
            />
          </div>

          {/* Condition */}
          <div className="form-group">
            <label className="form-label">Condition</label>

            <div className="condition-options">
              {["Excellent", "Good", "Fair", "Needs Repair"].map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    className={`condition-button ${
                      condition === option ? "active" : ""
                    }`}
                    onClick={() => setCondition(option)}
                    disabled={loading}
                  >
                    {option}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Availability */}
          <div className="availability-row">
            <div>
              <label className="form-label">Availability</label>

              <p>Allow students to borrow this resource</p>
            </div>

            <input
              type="checkbox"
              checked={availability}
              onChange={(event) => setAvailability(event.target.checked)}
              disabled={loading}
            />
          </div>

          {/* Borrowing Fee */}
          <div className="form-group">
            <label className="form-label">Borrowing Fee</label>

            <input
              className="form-input"
              type="text"
              placeholder="0.10 USDC"
              value={borrowingFee}
              onChange={(event) => setBorrowingFee(event.target.value)}
              disabled={loading}
            />

            <p className="input-helper">
              Leave as 0 if you want to lend it for free.
            </p>
          </div>

          {/* Pickup Location */}
          <div className="form-group">
            <label className="form-label">Pickup Location</label>

            <input
              className="form-input"
              type="text"
              placeholder="Library Block A"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Posting Resource..." : "Post Resource"}
          </button>
        </form>
      </main>

      <BottomNavigation active="post" />
    </div>
  );
}

export default PostResource;
