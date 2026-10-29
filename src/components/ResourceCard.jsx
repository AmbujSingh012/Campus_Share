
import API_BASE_URL from "../api";
import "./ResourceCard.css";
import { CheckCircle, Star, MapPin, Clock } from "lucide-react";

function formatDuration(duration) {
  if (
    duration === null ||
    duration === undefined ||
    String(duration).trim() === ""
  ) {
    return null;
  }

  const value = String(duration).trim();

  if (value.toLowerCase() === "permanent") {
    return "Permanent";
  }

  const minutesMatch = value.match(/^(\d+)\s*minutes?$/i);

  if (minutesMatch) {
    const totalMinutes = Number(minutesMatch[1]);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} ${
        minutes === 1 ? "minute" : "minutes"
      }`;
    }

    if (hours > 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }

    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  return value;
}

function ResourceCard({
  name,
  category,
  owner,
  rating,
  location = "Campus",
  imageUrl,
  onBorrow,
  availability = "Available",
  borrowedBy = null,
  duration,
  showImage = true,
}) {
  const isBorrowed =
    String(availability || "").toLowerCase() === "borrowed" ||
    Boolean(borrowedBy);

  const formattedDuration = formatDuration(duration);

  return (
    <div className="resource-card">
      {showImage && (
        <div className="resource-image">
          {imageUrl ? (
            <img
              src={
                imageUrl?.startsWith("http")
                  ? imageUrl
                  : `${API_BASE_URL}${imageUrl}`
              }
              alt={name}
              onError={(e) => {
                console.error(
                  "Image failed to load:",
                  imageUrl?.startsWith("http")
                    ? imageUrl
                    : `${API_BASE_URL}${imageUrl}`
                );
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span>Image</span>
          )}
        </div>
      )}

      <div className="resource-info">
        <div className="resource-title-row">
          <h3>{name}</h3>
          <div className="rating">
            <Star size={14} fill="currentColor" />
            <span>{rating}</span>
          </div>
        </div>

        <p className="category">{category}</p>
        <p className="owner">Owner: {owner}</p>

        <p className="location">
          <MapPin size={14} />
          {location}
        </p>

        {formattedDuration && (
          <p className="location">
            <Clock size={14} />
            <span>Available for: {formattedDuration}</span>
          </p>
        )}

        <div className="resource-bottom">
          <span className={isBorrowed ? "borrowed" : "available"}>
            <CheckCircle size={14} />
            {isBorrowed ? "Borrowed" : "Available"}
          </span>

          <button
            type="button"
            className="small-button"
            disabled={isBorrowed}
            onClick={onBorrow}
          >
            {isBorrowed ? "Borrowed" : "Borrow"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResourceCard;
