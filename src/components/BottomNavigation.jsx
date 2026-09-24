import {
  Home,
  BookOpen,
  Plus,
  ListTodo,
  User,
  Bot,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./BottomNavigation.css";

function BottomNavigation({ active }) {
  const navigate = useNavigate();

  return (
    <>
      <nav className="bottom-navigation">
        <button
          className={`nav-item ${active === "home" ? "active" : ""}`}
          onClick={() => navigate("/home")}
        >
          <Home size={19} />
          <span>Home</span>
        </button>

        <button
          className={`nav-item ${active === "resources" ? "active" : ""}`}
          onClick={() => navigate("/resources")}
        >
          <BookOpen size={19} />
          <span>Resources</span>
        </button>

        <button
          className={`nav-item ${active === "post" ? "active" : ""}`}
          onClick={() => navigate("/post-resource")}
        >
          <Plus size={21} />
          <span>Post</span>
        </button>

        <button
          className={`nav-item ${active === "tasks" ? "active" : ""}`}
          onClick={() => navigate("/tasks")}
        >
          <ListTodo size={19} />
          <span>Tasks</span>
        </button>

        <button
          className={`nav-item ${active === "profile" ? "active" : ""}`}
          onClick={() => navigate("/profile")}
        >
          <User size={19} />
          <span>Profile</span>
        </button>
      </nav>

      {/* Floating Campus AI Helper */}
      <button
        className="floating-helper-button"
        onClick={() => navigate("/campus-helper")}
        aria-label="Open Campus Helper"
      >
        <span className="helper-glow"></span>
        <Bot className="helper-icon" size={27} strokeWidth={2.2} />
      </button>
    </>
  );
}

export default BottomNavigation;