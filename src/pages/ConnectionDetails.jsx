import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTaskConnection } from "../api";

function ConnectionDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const taskId =
    location.state?.taskId ||
    location.state?.task?.id;

  useEffect(() => {
    console.log("Connection Details taskId:", taskId);
    console.log("Connection Details state:", location.state);

    if (!taskId) {
      setError("Connection details not found.");
      setLoading(false);
      return;
    }

    async function loadConnection() {
      try {
        const result = await getTaskConnection(taskId);

        console.log("Connection API result:", result);

        setData(result);
      } catch (err) {
        console.error("Connection details error:", err);
        setError(err.message || "Failed to load connection details.");
      } finally {
        setLoading(false);
      }
    }

    loadConnection();
  }, [taskId, location.state]);

  if (loading) {
    return (
      <div className="page-container">
        <h2>Loading connection details...</h2>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <h2>Connection Details</h2>
        <p>{error || "Connection details not found."}</p>

        <button
          className="small-button"
          onClick={() => navigate("/tasks")}
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button
        className="small-button"
        onClick={() => navigate("/tasks")}
      >
        ← Back to Tasks
      </button>

      <h1>Connection Details</h1>

      <div className="profile-card">
        <h2>Task Details</h2>

        <p>
          <strong>Title:</strong> {data.task?.title}
        </p>

        <p>
          <strong>Description:</strong>{" "}
          {data.task?.description || "Not provided"}
        </p>

        <p>
          <strong>Category:</strong> {data.task?.category}
        </p>

        <p>
          <strong>Reward:</strong> {data.task?.reward}
        </p>

        <p>
          <strong>Deadline:</strong> {data.task?.deadline}
        </p>

        <p>
          <strong>Status:</strong> {data.task?.status}
        </p>
      </div>

      <div className="profile-card">
        <h2>Meeting Details</h2>

        <p>
          <strong>Location:</strong>{" "}
          {data.task?.location || "Not provided"}
        </p>

        <p>
          <strong>Meeting Time:</strong>{" "}
          {data.task?.meeting_time
            ? new Date(data.task.meeting_time).toLocaleString()
            : "Not provided"}
        </p>
      </div>

      <div className="profile-card">
        <h2>Task Owner</h2>

        <p>
          <strong>Name:</strong>{" "}
          {data.owner?.name || "Not available"}
        </p>

        <p>
          <strong>Email:</strong>{" "}
          {data.owner?.email || "Not available"}
        </p>
      </div>

      <div className="profile-card">
        <h2>Accepted By</h2>

        <p>
          <strong>Name:</strong>{" "}
          {data.helper?.name || "Not available"}
        </p>

        <p>
          <strong>Email:</strong>{" "}
          {data.helper?.email || "Not available"}
        </p>
      </div>

      <div className="profile-card">
        <h2>Payment Details</h2>

        <p>
          <strong>Status:</strong>{" "}
          {data.payment?.status || "Not available"}
        </p>

        <p>
          <strong>Transaction ID:</strong>{" "}
          {data.payment?.transaction_id || "Not available"}
        </p>

        <p>
          <strong>Network:</strong>{" "}
          {data.payment?.network || "Not available"}
        </p>

        <p>
          <strong>Amount:</strong>{" "}
          {data.payment?.amount || "Not available"}
        </p>

        <p>
          <strong>Paid At:</strong>{" "}
          {data.payment?.paid_at
            ? new Date(data.payment.paid_at).toLocaleString()
            : "Not available"}
        </p>
      </div>
    </div>
  );
}

export default ConnectionDetails;