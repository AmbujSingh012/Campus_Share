import {
  ArrowLeft,
  Bell,
  Settings,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

function Header({
  title,
  showBack = false,
  showSettings = false,
}) {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-left">
        {showBack && (
          <button
            className="icon-button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={21} />
          </button>
        )}

        <h1 className="header-title">
          {title}
        </h1>
      </div>

      <div className="header-right">
        {!showSettings && (
          <button className="icon-button">
            <Bell size={20} />
          </button>
        )}

        {showSettings && (
          <button className="icon-button">
            <Settings size={20} />
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;