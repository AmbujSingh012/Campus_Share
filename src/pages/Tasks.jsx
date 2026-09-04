import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import SearchBar from "../components/SearchBar";
import TaskCard from "../components/TaskCard";

function Tasks() {
  const tasks = [
    {
      title: "Print OS Notes",
      budget: "0.10 USDC",
      deadline: "Today, 6 PM",
      postedBy: "Aman",
      location: "Library",
    },
    {
      title: "Deliver Lab Coat",
      budget: "0.20 USDC",
      deadline: "Tomorrow",
      postedBy: "Neha",
      location: "Block A",
    },
    {
      title: "Need DBMS Notes",
      budget: "0.15 USDC",
      deadline: "Today",
      postedBy: "Rohit",
      location: "Hostel",
    },
    {
      title: "Photocopy Assignment",
      budget: "0.10 USDC",
      deadline: "Tomorrow, 10 AM",
      postedBy: "Simran",
      location: "Admin Block",
    },
  ];

  return (
    <div className="page">
      <Header title="Tasks" showBack />

      <main className="page-content">
        <SearchBar placeholder="Search tasks..." />

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

        <div className="task-list">
          {tasks.map((task, index) => (
            <TaskCard
              key={index}
              title={task.title}
              budget={task.budget}
              deadline={task.deadline}
              postedBy={task.postedBy}
              location={task.location}
            />
          ))}
        </div>
      </main>

      <BottomNavigation active="tasks" />
    </div>
  );
}

export default Tasks;