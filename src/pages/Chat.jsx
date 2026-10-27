import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { ArrowLeft, Send, MessageCircle, UserRound } from "lucide-react";
import API_BASE_URL, {
  getCommunityConnections,
  getCommunityMessages,
  sendCommunityMessage,
} from "../api";
import BottomNavigation from "../components/BottomNavigation";
import "./Chat.css";

function Chat() {
  const navigate = useNavigate();
  const { connectionId: routeConnectionId } = useParams();
  const connectionId = Number(routeConnectionId);

  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = Number(currentUser?.id);

  const addMessage = useCallback((incoming) => {
    if (!incoming) return;

    setMessages((previous) => {
      const id = incoming.id;

      if (id != null && previous.some((message) => String(message.id) === String(id))) {
        return previous;
      }

      return [...previous, incoming].sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();

        if (timeA !== timeB) return timeA - timeB;
        return Number(a.id || 0) - Number(b.id || 0);
      });
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let active = true;

    async function loadChat() {
      if (!Number.isSafeInteger(connectionId) || connectionId <= 0) {
        setError("Invalid chat link. Please return to Connections.");
        setLoading(false);
        return;
      }

      try {
        setError("");

        const result = await getCommunityConnections();
        const rows = Array.isArray(result.connections) ? result.connections : [];
        const found = rows.find(
          (item) =>
            Number(item.connectionId) === connectionId &&
            item.status === "accepted"
        );

        if (!found) {
          throw new Error("Accepted connection not found. Please check Connections.");
        }

        if (!active) return;
        setConnection(found);

        const history = await getCommunityMessages(connectionId);
        if (!active) return;

        const historyMessages = Array.isArray(history.messages)
          ? history.messages
          : [];

        setMessages((previous) => {
          const merged = new Map();

          [...historyMessages, ...previous].forEach((message) => {
            const key =
              message.id != null
                ? String(message.id)
                : `${message.senderId}-${message.createdAt}-${message.messageText}`;

            merged.set(key, message);
          });

          return [...merged.values()].sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();

            if (timeA !== timeB) return timeA - timeB;
            return Number(a.id || 0) - Number(b.id || 0);
          });
        });
      } catch (err) {
        if (active) setError(err.message || "Unable to open this chat.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadChat();

    return () => {
      active = false;
    };
  }, [connectionId]);

  useEffect(() => {
    if (!connection || !connectionId) return;

    const token = localStorage.getItem("token");
    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_chat", connectionId);
    });

    socket.on("new_message", (message) => {
      if (Number(message.connectionId) === connectionId) {
        addMessage(message);
      }
    });

    socket.on("connect_error", () => {
      setError((previous) =>
        previous || "Live connection interrupted. Your message history may still be available."
      );
    });

    return () => {
      socket.emit("leave_chat", connectionId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [connection, connectionId, addMessage]);

  const handleSend = async (event) => {
    event.preventDefault();

    const messageText = draft.trim();
    if (!messageText || sending || !connection) return;

    setSending(true);
    setError("");

    try {
      const result = await sendCommunityMessage(connectionId, messageText);
      const sentMessage = result.message;

      if (sentMessage) {
        addMessage(sentMessage);
      }

      setDraft("");
    } catch (err) {
      setError(err.message || "Message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const otherName = connection?.name || connection?.username || "Student";
  const initials = otherName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="chat-page">
      <main className="chat-shell">
        <header className="chat-header">
          <button
            type="button"
            className="chat-back-button"
            onClick={() => navigate("/chats")}
            aria-label="Back to chats"
          >
            <ArrowLeft size={21} />
          </button>

          <div className="chat-avatar">
            {connection?.profilePicture || connection?.profile_picture ? (
              <button
                type="button"
                className="chat-avatar-photo-button"
                onClick={() => setPhotoViewerOpen(true)}
                aria-label={`View ${otherName}'s profile photo`}
              >
                <img
                  src={connection.profilePicture || connection.profile_picture}
                  alt={otherName}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </button>
            ) : (
              initials || <UserRound size={22} />
            )}
          </div>

          <div className="chat-person-details">
            <h1>{connection ? otherName : "Chat"}</h1>
            <p>
              {connection?.username
                ? `@${connection.username}`
                : "Your CampusShare connection"}
            </p>
          </div>

          <div className="chat-header-icon">
            <MessageCircle size={21} />
          </div>
        </header>

        <section className="chat-conversation" aria-label="Conversation messages">
          {loading ? (
            <div className="chat-state">
              <div className="chat-loader" />
              <p>Loading conversation…</p>
            </div>
          ) : error && !connection ? (
            <div className="chat-state">
              <MessageCircle size={30} />
              <p>{error}</p>
              <button
                type="button"
                className="chat-return-button"
                onClick={() => navigate("/chats")}
              >
                Back to Chats
              </button>
            </div>
          ) : (
            <>
              <div className="chat-date-label">Your conversation</div>

              {messages.length === 0 ? (
                <div className="chat-empty">
                  <div className="chat-empty-icon">
                    <MessageCircle size={27} />
                  </div>
                  <h2>Say hello 👋</h2>
                  <p>Start a conversation with {otherName}.</p>
                </div>
              ) : (
                <div className="chat-message-list">
                  {messages.map((message, index) => {
                    const mine = Number(message.senderId) === currentUserId;

                    return (
                      <div
                        key={message.id ?? `${message.createdAt}-${index}`}
                        className={`chat-message-row ${
                          mine ? "chat-message-row--mine" : "chat-message-row--theirs"
                        }`}
                      >
                        <div
                          className={`chat-bubble ${
                            mine ? "chat-bubble--mine" : "chat-bubble--theirs"
                          }`}
                        >
                          <p>{message.messageText}</p>
                          <time>
                            {message.createdAt
                              ? new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : ""}
                          </time>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </>
          )}
        </section>

        {error && connection && (
          <div className="chat-inline-error" role="status">
            {error}
          </div>
        )}

        <form className="chat-composer" onSubmit={handleSend}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message..."
            aria-label="Write a message"
            maxLength={2000}
            disabled={loading || !connection || sending}
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending || loading || !connection}
            aria-label="Send message"
          >
            <Send size={19} />
          </button>
        </form>
      </main>

      {photoViewerOpen && (connection?.profilePicture || connection?.profile_picture) && (
        <div
          className="chat-photo-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`${otherName}'s profile photo`}
          onClick={() => setPhotoViewerOpen(false)}
        >
          <button
            type="button"
            className="chat-photo-viewer-close"
            aria-label="Close profile photo"
            onClick={() => setPhotoViewerOpen(false)}
          >
            ×
          </button>
          <img
            className="chat-photo-viewer-image"
            src={connection.profilePicture || connection.profile_picture}
            alt={`${otherName}'s profile`}
            onClick={(event) => event.stopPropagation()}
          />
          <div className="chat-photo-viewer-name">{otherName}</div>
        </div>
      )}

      <BottomNavigation active="chat" />
    </div>
  );
}

export default Chat;
