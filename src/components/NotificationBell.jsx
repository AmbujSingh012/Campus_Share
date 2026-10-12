
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationsRead,
} from "../api";
import "./NotificationBell.css";

function NotificationBell() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const data = await getNotifications();

      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : []
      );
      setUnreadCount(Number(data.unreadCount) || 0);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const intervalId = window.setInterval(loadNotifications, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  const handleBellClick = async () => {
    const opening = !isOpen;
    setIsOpen(opening);

    if (!opening) return;

    setLoading(true);
    setError("");

    try {
      const data = await getNotifications();
      const items = Array.isArray(data.notifications)
        ? data.notifications
        : [];

      setNotifications(items);
      setUnreadCount(Number(data.unreadCount) || 0);

      await markNotificationsRead();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification) => {
    setIsOpen(false);

    if (notification.type === "resource") {
      navigate(`/resources/${notification.entityId}`);
    } else if (notification.type === "task") {
      navigate("/tasks");
    }
  };

  return (
    <div className="notification-bell-wrapper">
      <button
        type="button"
        className="icon-button notification-bell-button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={isOpen}
        onClick={handleBellClick}
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="notification-unread-dot" />
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="notification-dismiss-layer"
            aria-label="Close notifications"
            onClick={() => setIsOpen(false)}
          />

          <section
            className="notification-dropdown"
            aria-label="Notifications"
          >
            <div className="notification-dropdown-heading">
              <h2>Notifications</h2>
              <span>{notifications.length}</span>
            </div>

            {loading && (
              <p className="notification-message">Loading notifications...</p>
            )}

            {!loading && error && (
              <p className="notification-message notification-error">
                {error}
              </p>
            )}

            {!loading && !error && notifications.length === 0 && (
              <p className="notification-message">
                You're all caught up. New task and resource posts will appear
                here.
              </p>
            )}

            {!loading && notifications.length > 0 && (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    className={`notification-item ${
                      !notification.readAt
                        ? "notification-item-unread"
                        : ""
                    }`}
                    onClick={() =>
                      handleNotificationClick(notification)
                    }
                  >
                    <span className="notification-item-icon">
                      <Bell size={17} />
                    </span>

                    <span className="notification-item-content">
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                      {notification.actorName && (
                        <small>Posted by {notification.actorName}</small>
                      )}
                    </span>

                    {!notification.readAt && (
                      <span className="notification-item-dot" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default NotificationBell;
