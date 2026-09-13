import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, ListTodo, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import SearchBar from "../components/SearchBar";
import ResourceCard from "../components/ResourceCard";
import TaskCard from "../components/TaskCard";

import { getResources, getTasks, borrowResource, acceptTask } from "../api";

function Home() {
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleBorrow = async (resource) => {
    try {
      setError("");
      const data = await borrowResource(resource.id);

      if (data.success) {
        setResources((previousResources) =>
          previousResources.map((item) =>
            item.id === resource.id ? data.resource : item
          )
        );
      } else {
        setError(data.message || "Failed to borrow resource");
      }
    } catch (err) {
      console.error("Borrow resource error:", err);
      setError(err.message || "Failed to borrow resource");
    }
  };

  const handleApply = async (task) => {
    try {
      setError("");
      const data = await acceptTask(task.id);

      if (data.success) {
        setTasks((previousTasks) =>
          previousTasks.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status: "accepted",
                  my_acceptance_status: "accepted",
                }
              : item
          )
        );
        alert("Task applied successfully!");
      } else {
        setError(data.message || "Failed to apply for task");
      }
    } catch (err) {
      console.error("Apply task error:", err);
      setError(err.message || "Failed to apply for task");
    }
  };

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true);
        setError("");

        const [resourceData, taskData] = await Promise.all([
          getResources(),
          getTasks(),
        ]);

        console.log("Home resources response:", resourceData);
        console.log("Home tasks response:", taskData);

        if (resourceData.success) {
          setResources(resourceData.resources || []);
        }

        if (taskData.success) {
          setTasks(taskData.tasks || []);
        }

        if (!resourceData.success || !taskData.success) {
          setError("Some home page data could not be loaded");
        }
      } catch (err) {
        console.error("Home API error:", err);
        setError("Unable to connect to backend");
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredResources = resources.filter((resource) =>
    [
      resource.name,
      resource.title,
      resource.category,
      resource.owner,
      resource.owner_name,
      resource.postedBy,
      resource.location,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedSearch)
      )
  );

  const filteredTasks = tasks.filter((task) =>
    [
      task.title,
      task.category,
      task.postedBy,
      task.posted_by,
      task.owner_name,
      task.user_name,
      task.location,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedSearch)
      )
  );

  return (
    <div className="page">
      <Header title="CampusShare" />

      <main className="page-content">
        <section className="welcome-section">
          <h2>Hello, Student 👋</h2>
          <p>What are you looking for today?</p>
        </section>

        <SearchBar
          placeholder="Search resources or tasks..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

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

        {loading ? (
          <p>Loading resources...</p>
        ) : filteredResources.length === 0 ? (
          <p>No resources posted yet.</p>
        ) : (
          <div className="resource-list">
            {filteredResources.slice(0, 2).map((resource) => (
              <ResourceCard
                key={resource.id}
                name={resource.name || resource.title}
                category={resource.category}
                owner={resource.owner || resource.owner_name || resource.postedBy || "Unknown"}
                rating={resource.averageRating > 0 ? resource.averageRating : "No ratings"}
                location={resource.location || "Location not specified"}
                imageUrl={resource.image_url}
                onBorrow={() => handleBorrow(resource)}
              />
            ))}
          </div>
        )}

        <section className="section-header">
          <h2>Latest Tasks</h2>

          <button onClick={() => navigate("/tasks")}>
            View All
            <ArrowRight size={15} />
          </button>
        </section>

        {loading ? (
          <p>Loading tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <p>No tasks posted yet.</p>
        ) : (
          <div className="task-list">
            {filteredTasks.slice(0, 2).map((task) => (
              <TaskCard
                key={task.id}
                title={task.title}
                budget={
                  task.budget ||
                  task.reward ||
                  (task.reward != null
                    ? `${task.reward} USDC`
                    : "—")
                }
                deadline={task.deadline}
                postedBy={
                  task.postedBy ||
                  task.posted_by ||
                  task.owner_name ||
                  task.user_name ||
                  "Student"
                }
                location={task.location}
                status={task.status}
                paymentStatus={task.payment_status || task.paymentStatus}
                onApply={handleApply}
                onConnectionDetails={() => navigate("/tasks")}
              />
            ))}
          </div>
        )}

        {error && (
          <p
            style={{
              color: "red",
              fontWeight: "600",
              marginTop: "12px",
            }}
          >
            {error}
          </p>
        )}
      </main>

      <BottomNavigation active="home" />
    </div>
  );
}

export default Home;
