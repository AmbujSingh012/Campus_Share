import { useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  MapPin,
  PackagePlus,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNavigation from "../components/BottomNavigation";
import "./PostResource.css";
import { createResource } from "../api";

function PostResource() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState("Excellent");
  const [availability, setAvailability] = useState(true);
  const [borrowingFee, setBorrowingFee] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCollege = JSON.parse(
    localStorage.getItem("selectedCollege") || "null"
  );

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a PNG or JPG image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    setError("");
    setImage(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

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

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login before posting a resource.");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const data = await createResource({
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        availability: availability
          ? "Available"
          : "Unavailable",
        condition,
        borrowingFee,
        image,
      });

      if (!data.success) {
        throw new Error(
          data.message || "Failed to create resource."
        );
      }

      setMessage("Resource posted successfully!");

      setTitle("");
      setCategory("");
      setDescription("");
      setLocation("");
      setCondition("Excellent");
      setAvailability(true);
      setBorrowingFee("");
      setImage(null);
      setImagePreview("");

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
    <div className="post-resource-modern-page app-page-frame">
      <div className="post-resource-shell">
        <header className="post-resource-topbar">
          <button
            className="post-resource-back"
            type="button"
            onClick={() => navigate("/resources")}
            aria-label="Back to resources"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="post-resource-campus">
            <span className="post-resource-campus-dot"></span>
            <span>
              {selectedCollege?.name || "Your Campus"}
            </span>
          </div>

          <div className="post-resource-top-label">
            Share
          </div>
        </header>

        <main className="post-resource-content">
          <section className="post-resource-intro">
            <div>
              <span className="post-resource-eyebrow">
                SHARE WITH YOUR CAMPUS
              </span>

              <h1>
                Give your stuff
                <span> a second life.</span>
              </h1>

              <p>
                List something useful and let students
                around your campus borrow it when they
                need it.
              </p>
            </div>

            <div className="post-resource-intro-icon">
              <PackagePlus size={30} />
            </div>
          </section>

          {message && (
            <div className="post-resource-success">
              <ShieldCheck size={20} />
              <div>
                <strong>{message}</strong>
                <span>Taking you back to resources...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="post-resource-error">
              <strong>Couldn&apos;t post resource</strong>
              <span>{error}</span>
            </div>
          )}

          <form
            className="post-resource-form"
            onSubmit={handleSubmit}
          >
            <section className="post-resource-card">
              <div className="post-resource-section-heading">
                <div>
                  <span>01</span>
                  <h2>Show your resource</h2>
                </div>

                <p>Add a clear photo so people know what
                  they&apos;re borrowing.</p>
              </div>

              <label className="post-resource-upload">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageChange}
                  disabled={loading}
                />

                {imagePreview ? (
                  <div className="post-resource-preview">
                    <img
                      src={imagePreview}
                      alt="Resource preview"
                    />

                    <div className="post-resource-preview-info">
                      <strong>{image.name}</strong>
                      <span>Click to change image</span>
                    </div>
                  </div>
                ) : (
                  <div className="post-resource-upload-empty">
                    <div className="post-resource-upload-icon">
                      <ImagePlus size={25} />
                    </div>

                    <strong>Upload a resource photo</strong>

                    <span>
                      PNG or JPG · Maximum 5MB
                    </span>
                  </div>
                )}
              </label>
            </section>

            <section className="post-resource-card">
              <div className="post-resource-section-heading">
                <div>
                  <span>02</span>
                  <h2>Tell students about it</h2>
                </div>

                <p>Keep the details simple and useful.</p>
              </div>

              <div className="post-resource-fields">
                <div className="post-resource-field full">
                  <label>Resource name</label>

                  <input
                    type="text"
                    placeholder="e.g. Casio scientific calculator"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>

                <div className="post-resource-field">
                  <label>Category</label>

                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value)
                    }
                    disabled={loading}
                  >
                    <option value="">
                      Select category
                    </option>
                    <option value="Books">Books</option>
                    <option value="Electronics">
                      Electronics
                    </option>
                    <option value="Sports">Sports</option>
                    <option value="Clothing">
                      Clothing
                    </option>
                    <option value="Study Materials">
                      Study Materials
                    </option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="post-resource-field">
                  <label>Condition</label>

                  <div className="post-resource-condition-list">
                    {[
                      "Excellent",
                      "Good",
                      "Fair",
                      "Needs Repair",
                    ].map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={
                          condition === option
                            ? "post-resource-condition active"
                            : "post-resource-condition"
                        }
                        onClick={() =>
                          setCondition(option)
                        }
                        disabled={loading}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="post-resource-field full">
                  <label>Description</label>

                  <textarea
                    placeholder="What is it, and what should someone know before borrowing it?"
                    rows="5"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            </section>

            <section className="post-resource-card">
              <div className="post-resource-section-heading">
                <div>
                  <span>03</span>
                  <h2>Set the borrowing details</h2>
                </div>

                <p>Choose where and how students can borrow it.</p>
              </div>

              <div className="post-resource-fields">
                <div className="post-resource-field">
                  <label>
                    <MapPin size={14} />
                    Pickup location
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. Library Block A"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>

                <div className="post-resource-field">
                  <label>
                    <Wallet size={14} />
                    Borrowing fee
                  </label>

                  <input
                    type="text"
                    placeholder="Enter Amount In INR"
                    value={borrowingFee}
                    onChange={(event) =>
                      setBorrowingFee(event.target.value)
                    }
                    disabled={loading}
                  />

                  <small>
                    Use 0 or leave empty for free borrowing.
                  </small>
                </div>
              </div>

              <div className="post-resource-availability">
                <div>
                  <strong>Available for borrowing      </strong>
                  <span>
                    Students can request this resource
                    when enabled.
                  </span>
                </div>

                <button
                  type="button"
                  className={
                    availability
                      ? "post-resource-toggle active"
                      : "post-resource-toggle"
                  }
                  onClick={() =>
                    setAvailability(!availability)
                  }
                  disabled={loading}
                  aria-label="Toggle availability"
                >
                  <span></span>
                </button>
              </div>
            </section>

            <div className="post-resource-submit-area">
              <div>
                <strong>Ready to share?</strong>
                <span>
                  Your resource will appear in the campus
                  marketplace.
                </span>
              </div>

              <button
                type="submit"
                className="post-resource-submit"
                disabled={loading}
              >
                {loading
                  ? "Posting resource..."
                  : "Post resource"}
              </button>
            </div>
          </form>
        </main>
      </div>

      <BottomNavigation active="post" />
    </div>
  );
}

export default PostResource;
