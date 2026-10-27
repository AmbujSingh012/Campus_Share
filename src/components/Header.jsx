import {
  ArrowLeft,
  Bell,
  Settings,
  Menu,
  X,
  Home,
  BookOpen,
  Plus,
  ListTodo,
  User,
  Users,
  MessageCircle,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

function Header({
  title,
  showBack = false,
  showSettings = false,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

 const menuItems = [
  { label: "Home", icon: Home, path: "/home" },
  { label: "Resources", icon: BookOpen, path: "/resources" },
  { label: "Post Resource", icon: Plus, path: "/post-resource" },
  { label: "Tasks", icon: ListTodo, path: "/tasks" },
  { label: "Connections", icon: Users, path: "/connections" },
  { label: "Chats", icon: MessageCircle, path: "/chats" },
  { label: "Profile", icon: User, path: "/profile" },
];
  const handleNavigation = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="header">
      <div className="header-left">
        {showBack && (
          <button
            className="icon-button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={21} />
          </button>
        )}

        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right">
     {!showSettings && <NotificationBell />}

        {showSettings && (
          <button
            className="icon-button"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        )}

        <button
          className="icon-button desktop-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            className="desktop-menu-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />

          <nav className="desktop-navigation-menu" aria-label="Main navigation">
            <p className="desktop-menu-heading">NAVIGATION</p>

            {menuItems.map(({ label, icon: Icon, path }) => (
              <button
                key={path}
                className="desktop-menu-item"
                onClick={() => handleNavigation(path)}
              >
                <Icon size={19} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}

export default Header;