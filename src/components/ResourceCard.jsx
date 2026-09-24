import API_BASE_URL from "../api";
import "./ResourceCard.css";
import { CheckCircle, Star, MapPin } from "lucide-react";

function ResourceCard({
  name,
  category,
  owner,
  rating,
  location = "Campus",
  imageUrl,
  onBorrow,
  showImage = true,
}) {
  return (
    <div className="resource-card">
      {showImage && (
        <div className="resource-image">
          {imageUrl ? (
            <img
              src={`${API_BASE_URL}${imageUrl}`}
              alt={name}
              onError={(e) => {
                console.error(
                  "Image failed to load:",
                  `${API_BASE_URL}${imageUrl}`
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

        <p className="category">
          {category}
        </p>

        <p className="owner">
          Owner: {owner}
        </p>

        <p className="location">
          <MapPin size={14} />
          {location}
        </p>

        <div className="resource-bottom">
          <span className="available">
            <CheckCircle size={14} />
            Available
          </span>

          <button
            className="small-button"
            onClick={onBorrow}
          >
            Borrow
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResourceCard;