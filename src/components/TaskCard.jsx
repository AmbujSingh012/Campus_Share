import { Clock, MapPin } from "lucide-react";

function TaskCard({
  id,
  title,
  budget,
  deadline,
  postedBy,
  location,
  status,
  paymentStatus,
  onApply,
  onConnectionDetails,
}) {
  const isAccepted =
    status === "accepted" || paymentStatus === "paid";

  return (
    <div className="task-card">
      <div className="task-card-header">
        <h3>{title}</h3>

        <span className="task-category">
          Paid
        </span>
      </div>

      <p className="task-budget">
        Reward: {budget}
      </p>

      <div className="task-detail">
        <Clock size={15} />
        <span>{deadline}</span>
      </div>

      <div className="task-detail">
        <MapPin size={15} />
        <span>{location}</span>
      </div>

      <p className="task-poster">
        Posted by: {postedBy}
      </p>

 {isAccepted ? (
  <>
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
  </>
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