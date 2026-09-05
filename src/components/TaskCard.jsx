import { Clock, MapPin } from "lucide-react";

function TaskCard({
  id,
  title,
  budget,
  deadline,
  postedBy,
  location,
  onApply,
}) {
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

      <button
  className="small-button"
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
    </div>
  );
}

export default TaskCard;