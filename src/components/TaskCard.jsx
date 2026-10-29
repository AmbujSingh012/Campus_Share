
import { Clock, MapPin } from "lucide-react";
import "./TaskCard.css";

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

function TaskCard({
  id,
  title,
  budget,
  deadline,
  duration,
  postedBy,
  location,
  status,
  paymentStatus,
  isOwner,
  onApply,
  onConnectionDetails,
}) {
  const isAccepted =
    status === "accepted" || paymentStatus === "paid";

  const formattedDuration = formatDuration(duration);

  return (
    <div className="task-card">
      <div className="task-card-header">
        <h3>{title}</h3>
        <span className="task-category">Paid</span>
      </div>

      <p className="task-budget">Reward: {budget}</p>

      <div className="task-detail">
        <Clock size={15} />
        <span>{deadline}</span>
      </div>

      {formattedDuration && (
        <div className="task-detail">
          <Clock size={15} />
          <span>Duration: {formattedDuration}</span>
        </div>
      )}

      <div className="task-detail">
        <MapPin size={15} />
        <span>{location}</span>
      </div>

      <p className="task-poster">Posted by: {postedBy}</p>

      {isAccepted ? (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="small-button"
            type="button"
            disabled
          >
            Task Accepted
          </button>

          <button
            className="small-button"
            type="button"
            onClick={() => onConnectionDetails(id)}
          >
            View Connection Details
          </button>
        </div>
      ) : (
        <button
          className="small-button"
          type="button"
          onClick={() =>
            onApply({
              id,
              title,
              budget,
              deadline,
              duration,
              postedBy,
              location,
            })
          }
        >
          Apply
        </button>
      )}
    </div>
  );
}

export default TaskCard;
