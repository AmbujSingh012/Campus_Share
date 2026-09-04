import { Star, CheckCircle } from "lucide-react";

function ResourceCard({
  name,
  category,
  owner,
  rating,
  image = "Image"
}) {

  return (
    <div className="resource-card">

      <div className="resource-image">
        {image}
      </div>

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

        <div className="resource-bottom">

          <span className="available">
            <CheckCircle size={14} />
            Available
          </span>

          <button className="small-button">
            Borrow
          </button>

        </div>

      </div>

    </div>
  );
}

export default ResourceCard;