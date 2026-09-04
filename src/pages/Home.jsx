import { ArrowRight, BookOpen, ListTodo, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import SearchBar from "../components/SearchBar";
import ResourceCard from "../components/ResourceCard";
import TaskCard from "../components/TaskCard";

function Home() {
  const navigate = useNavigate();

  const resources = [
    {
      name: "Operating System Notes",
      category: "Study Materials",
      owner: "Rahul",
      rating: "4.8",
    },
    {
      name: "Scientific Calculator",
      category: "Electronics",
      owner: "Priya",
      rating: "4.6",
    },
  ];

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
  ];

  return (
    <div className="page">
      <Header title="CampusShare" />

      <main className="page-content">
        <section className="welcome-section">
          <h2>Hello, Student 👋</h2>
          <p>What are you looking for today?</p>
        </section>

        <SearchBar placeholder="Search resources or tasks..." />

        <section className="quick-actions">
          <button
            className="quick-action"
            onClick={() => navigate("/resources")}
          >
            <div className="quick-action-icon">
              <BookOpen size={22} />
            </div>

            <span>Resources</span>
          </button>

          <button
            className="quick-action"
            onClick={() => navigate("/tasks")}
          >
            <div className="quick-action-icon">
              <ListTodo size={22} />
            </div>

            <span>Tasks</span>
          </button>

          <button
            className="quick-action post-action"
            onClick={() => navigate("/post-resource")}
          >
            <div className="quick-action-icon">
              <Plus size={22} />
            </div>

            <span>Post</span>
          </button>
        </section>

        <section className="section-header">
          <h2>Featured Resources</h2>

          <button onClick={() => navigate("/resources")}>
            View All
            <ArrowRight size={15} />
          </button>
        </section>

        <div className="resource-list">
          {resources.map((resource, index) => (
            <ResourceCard
              key={index}
              name={resource.name}
              category={resource.category}
              owner={resource.owner}
              rating={resource.rating}
            />
          ))}
        </div>

        <section className="section-header">
          <h2>Latest Tasks</h2>

          <button onClick={() => navigate("/tasks")}>
            View All
            <ArrowRight size={15} />
          </button>
        </section>

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

      <BottomNavigation active="home" />
    </div>
  );
}

export default Home;