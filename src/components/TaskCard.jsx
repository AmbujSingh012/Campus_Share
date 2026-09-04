import { MapPin, Clock } from "lucide-react";

function TaskCard({
  title,
  budget,
  deadline,
  postedBy,
  location
}) {

  return (
    <div className="task-card">

      <h3>{title}</h3>

      <p className="task-budget">
        Budget: {budget}
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

      <button className="small-button">
        Apply
      </button>

    </div>
  );
}

export default TaskCard;