import { useState } from "react";
import PaymentModal from "../components/PaymentModal";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import SearchBar from "../components/SearchBar";
import TaskCard from "../components/TaskCard";
import "../css/TaskPaymentStatus.css";
import { useNavigate } from "react-router-dom";

function Tasks() {
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleApply = (task) => {
  navigate("/task-payment", {
    state: {
      task: task,
    },
  });
};

  const tasks = [
    {
      id: 1,
      title: "Print OS Notes",
      budget: "0.10 USDC",
      deadline: "Today, 6 PM",
      postedBy: "Aman",
      location: "Library",
      paymentStatus: "Payment Required",
      transactionStatus: "Pending",
      transactionId: "TXN-10001",
    },
    {
      id: 2,
      title: "Deliver Lab Coat",
      budget: "0.20 USDC",
      deadline: "Tomorrow",
      postedBy: "Neha",
      location: "Block A",
      paymentStatus: "Paid",
      transactionStatus: "Completed",
      transactionId: "TXN-10002",
    },
    {
      id: 3,
      title: "Need DBMS Notes",
      budget: "0.15 USDC",
      deadline: "Today",
      postedBy: "Rohit",
      location: "Hostel",
      paymentStatus: "Pending",
      transactionStatus: "Processing",
      transactionId: "TXN-10003",
    },
    {
      id: 4,
      title: "Photocopy Assignment",
      budget: "0.10 USDC",
      deadline: "Tomorrow, 10 AM",
      postedBy: "Simran",
      location: "Admin Block",
      paymentStatus: "Failed",
      transactionStatus: "Failed",
      transactionId: "TXN-10004",
    },
  ];

  return (
    <div className="page">
      <Header title="Tasks" showBack />

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        taskTitle={selectedTask?.title}
        amount={
          typeof selectedTask?.budget === "string"
            ? selectedTask.budget.replace(" USDC", "")
            : selectedTask?.budget || "0.10"
        }
      />

      <main className="page-content">
        <SearchBar placeholder="Search tasks..." />

        {/* Category Filter */}
        <div className="category-filter">
          <button className="category-pill active">
            All
          </button>

          <button className="category-pill">
            Study
          </button>

          <button className="category-pill">
            Delivery
          </button>

          <button className="category-pill">
            Errands
          </button>

          <button className="category-pill">
            Other
          </button>
        </div>

        {/* Task List */}
        <div className="task-list">
          {tasks.map((task) => (
            <div className="task-wrapper" key={task.id}>

              {/* Existing Task Card */}
              <TaskCard
  key={task.id}
  id={task.id}
  title={task.title}
  budget={task.budget}
  deadline={task.deadline}
  postedBy={task.postedBy}
  location={task.location}
  onApply={() => handleApply(task)}
/>

              {/* Day 5 Reward & Payment Information */}
              <div className="task-payment-info">

                {/* Reward Amount */}
                <div className="reward-row">
                  <div className="reward-left">
                    <span className="reward-label">
                      Reward Amount
                    </span>

                    <span className="reward-value">
                      {task.budget}
                    </span>
                  </div>

                  <div className="reward-icon">
                    💰
                  </div>
                </div>

                {/* Payment Status */}
                <div className="payment-status-row">
                  <div className="status-information">
                    <span className="status-label">
                      Payment Status
                    </span>

                    <span
                      className={`status-badge ${task.paymentStatus
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                    >
                      {task.paymentStatus === "Payment Required" && "💳 "}
                      {task.paymentStatus === "Paid" && "✓ "}
                      {task.paymentStatus === "Pending" && "⏳ "}
                      {task.paymentStatus === "Failed" && "✕ "}

                      {task.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Transaction Status */}
                <div className="payment-status-row">
                  <div className="status-information">
                    <span className="status-label">
                      Transaction Status
                    </span>

                    <span
                      className={`status-badge ${task.transactionStatus
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                    >
                      {task.transactionStatus === "Completed" && "✓ "}
                      {task.transactionStatus === "Processing" && "⏳ "}
                      {task.transactionStatus === "Pending" && "⏳ "}
                      {task.transactionStatus === "Failed" && "✕ "}

                      {task.transactionStatus}
                    </span>
                  </div>
                </div>

                {/* Transaction ID */}
                <div className="transaction-id-row">
                  <span className="status-label">
                    Transaction ID
                  </span>

                  <span className="transaction-id">
                    {task.transactionId}
                  </span>
                </div>

              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNavigation active="tasks" />
    </div>
  );
}

export default Tasks;