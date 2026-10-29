import {
  Home,
  BookOpen,
  Plus,
  ListTodo,
  User,
  Bot,
  Users,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./BottomNavigation.css";

function BottomNavigation({ active }) {
  const navigate = useNavigate();

  return (
    <>
      <nav className="bottom-navigation" aria-label="Mobile navigation">
        <button
          type="button"
          aria-label="Home"
          aria-current={active === "home" ? "page" : undefined}
          className={`nav-item ${active === "home" ? "active" : ""}`}
          onClick={() => navigate("/home")}
        >
          <Home size={19} />
          <span>Home</span>
        </button>

        <button
          type="button"
          aria-label="Resources"
          aria-current={active === "resources" ? "page" : undefined}
          className={`nav-item ${active === "resources" ? "active" : ""}`}
          onClick={() => navigate("/resources")}
        >
          <BookOpen size={19} />
          <span>Resources</span>
        </button>

        <button
          type="button"
          aria-label="Post a resource"
          aria-current={active === "post" ? "page" : undefined}
          className={`nav-item nav-post ${active === "post" ? "active" : ""}`}
          onClick={() => navigate("/post-resource")}
        >
          <Plus size={21} />
          <span>Post</span>
        </button>

        <button
          type="button"
          aria-label="Tasks"
          aria-current={active === "tasks" ? "page" : undefined}
          className={`nav-item ${active === "tasks" ? "active" : ""}`}
          onClick={() => navigate("/tasks")}
        >
          <ListTodo size={19} />
          <span>Tasks</span>
        </button>

        <button
          type="button"
          aria-label="Connections"
          aria-current={active === "connections" ? "page" : undefined}
          className={`nav-item ${active === "connections" ? "active" : ""}`}
          onClick={() => navigate("/connections")}
        >
          <Users size={19} />
          <span>Connect</span>
        </button>

        <button
          type="button"
          aria-label="Profile"
          aria-current={active === "profile" ? "page" : undefined}
          className={`nav-item ${active === "profile" ? "active" : ""}`}
          onClick={() => navigate("/profile")}
        >
          <User size={19} />
          <span>Profile</span>
        </button>
      </nav>
     <button
  type="button"
  className="floating-chat-button"
  onClick={() => navigate("/chats")}
  aria-label="Open Chat"
>
  <MessageCircle size={25} />
  <span>Chat</span>
</button>
      <button
        type="button"
        className="floating-helper-button"
        onClick={() => navigate("/campus-helper")}
        aria-label="Open Campus Helper"
      >
        <span className="helper-glow" />
        <Bot className="helper-icon" size={27} strokeWidth={2.2} />
      </button>
    </>
  );
}

export default BottomNavigation;
