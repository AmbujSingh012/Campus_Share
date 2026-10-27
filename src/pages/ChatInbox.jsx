import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, Users, ChevronRight, RefreshCw } from "lucide-react";
import { getCommunityConnections, getCommunityMessages } from "../api";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import "./ChatInbox.css";

function getInitials(name = "Student") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function ChatInbox() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = Number(currentUser?.id);
  const [connections, setConnections] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInbox() {
      setLoading(true);
      setError("");

      try {
        const result = await getCommunityConnections();
        const accepted = (Array.isArray(result?.connections) ? result.connections : [])
          .filter((item) => item.status === "accepted")
          .filter((item) => Number(item.connectionId) > 0);

        if (!active) return;
        setConnections(accepted);

        // Load the most recent message for each accepted connection.
        const messageResults = await Promise.all(
          accepted.map(async (connection) => {
            try {
              const response = await getCommunityMessages(connection.connectionId);
              const messages = Array.isArray(response?.messages) ? response.messages : [];
              const latest = messages.reduce((current, message) => {
                if (!current) return message;
                return new Date(message.createdAt || 0) > new Date(current.createdAt || 0)
                  ? message
                  : current;
              }, null);

              return [String(connection.connectionId), latest];
            } catch {
              return [String(connection.connectionId), null];
            }
          })
        );

        if (active) setLastMessages(Object.fromEntries(messageResults));
      } catch (err) {
        if (active) setError(err.message || "Couldn't load your chats.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInbox();
    return () => {
      active = false;
    };
  }, []);

  const filteredConnections = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...connections]
      .filter((person) => {
        const name = person.name || person.username || "CampusShare member";
        return !query ||
          name.toLowerCase().includes(query) ||
          String(person.username || "").toLowerCase().includes(query);
      })
      .sort((a, b) => {
        const messageA = lastMessages[String(a.connectionId)];
        const messageB = lastMessages[String(b.connectionId)];
        const timeA = new Date(messageA?.createdAt || 0).getTime();
        const timeB = new Date(messageB?.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [connections, lastMessages, search]);

  return (
    <div className="inbox-page">
      <Header title="Chats" />

      <main className="inbox-shell">
        <section className="inbox-heading">
          <div>
            <span className="inbox-eyebrow">CAMPUSSHARE MESSAGES</span>
            <h1>Your people, <span>your chats.</span></h1>
            <p>Pick up where your conversations left off.</p>
          </div>
          <div className="inbox-heading-icon">
            <MessageCircle size={27} />
          </div>
        </section>

        <div className="inbox-search">
          <Search size={19} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people or usernames"
            aria-label="Search chats"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              Clear
            </button>
          )}
        </div>

        <section className="inbox-list-card">
          <div className="inbox-list-heading">
            <div>
              <h2>Messages</h2>
              <p>{connections.length} accepted {connections.length === 1 ? "connection" : "connections"}</p>
            </div>
            <span className="inbox-live-label"><span /> YOUR NETWORK</span>
          </div>

          {loading ? (
            <div className="inbox-state">
              <div className="inbox-spinner" />
              <p>Finding your conversations…</p>
            </div>
          ) : error ? (
            <div className="inbox-state">
              <MessageCircle size={30} />
              <p>{error}</p>
              <button type="button" onClick={() => window.location.reload()}>
                <RefreshCw size={16} /> Try again
              </button>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="inbox-empty">
              <div className="inbox-empty-icon">
                {search ? <Search size={28} /> : <Users size={28} />}
              </div>
              <h3>{search ? "No matching people" : "Your chats start here"}</h3>
              <p>
                {search
                  ? "Try another name or username."
                  : "When a connection is accepted, you'll find them here. Open Connections to meet people on your campus."}
              </p>
              {!search && (
                <button type="button" onClick={() => navigate("/connections")}>
                  Explore connections <ChevronRight size={17} />
                </button>
              )}
            </div>
          ) : (
            <div className="inbox-people-list">
              {filteredConnections.map((person, index) => {
                const name = person.name || person.username || "CampusShare member";
                const latest = lastMessages[String(person.connectionId)];
                const isMyMessage =
                  latest && Number(latest.senderId) === currentUserId;

                const preview = latest
                  ? `${isMyMessage ? "You" : name}: ${latest.messageText || ""}`
                  : "You're connected! Say hello 👋";

                return (
                  <button
                    type="button"
                    className="inbox-person"
                    key={person.connectionId}
                    onClick={() => navigate(`/chat/${person.connectionId}`)}
                  >
                    <div className={`inbox-avatar inbox-avatar-${index % 5}`}>
                      {person.profilePicture || person.profile_picture ? (
                        <img
                          src={person.profilePicture || person.profile_picture}
                          alt={name}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        getInitials(name)
                      )}
                      <span className="inbox-avatar-status" />
                    </div>

                    <div className="inbox-person-content">
                      <div className="inbox-person-topline">
                        <h3>{name}</h3>
                        <time>{formatTime(latest?.createdAt)}</time>
                      </div>
                      <div className="inbox-person-bottomline">
                        <p>{preview}</p>
                        <ChevronRight size={17} />
                      </div>
                      {person.username && <span className="inbox-username">@{person.username}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <p className="inbox-footer-note">
          <span className="inbox-footer-dot" />
          Private conversations with your accepted connections
        </p>
      </main>

      <BottomNavigation active="chat" />
    </div>
  );
}

export default ChatInbox;
