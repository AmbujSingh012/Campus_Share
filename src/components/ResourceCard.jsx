import { CheckCircle, Star, MapPin } from "lucide-react";

function ResourceCard({
  name,
  category,
  owner,
  rating,
  location = "Campus",
  imageUrl,
  onBorrow,
}) {
  return (
    <div className="resource-card">

      {/* Image */}
      <div
  className="resource-image"
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  }}
>
        {imageUrl ? (
          <img
            src={`http://localhost:3000${imageUrl}`}
            alt={name}
    style={{
  width: "100%",
  height: "160px",
  objectFit: "cover",
  objectPosition: "center",
  borderRadius: "12px",
  display: "block",
}}
            onError={(e) => {
              console.error(
                "Image failed to load:",
                `http://localhost:3000${imageUrl}`
              );

              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span>Image</span>
        )}
      </div>

      {/* Resource Information */}
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

        <p
          className="location"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
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