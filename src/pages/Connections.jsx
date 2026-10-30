
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API_BASE_URL from "../api";
import {
  ArrowLeft,
  Check,
  MessageCircle,
  RefreshCw,
  Search,
  UserPlus,
  Send,
  UserRound,
  X,
} from "lucide-react";

import {
  getCommunityConnections,
  getCommunityStudents,
  requestCommunityConnection,
  respondToConnection,
  getCommunityMessages,
  sendCommunityMessage,
} from "../api";

import BottomNavigation from "../components/BottomNavigation";
import "./Connections.css";

function Connections() {
  const navigate = useNavigate();

  const [connections, setConnections] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [discoveryError, setDiscoveryError] = useState("");
  const [discoveryNotice, setDiscoveryNotice] = useState("");
  const [requestBusyId, setRequestBusyId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = Number(currentUser?.id);

  const loadConnections = useCallback(async () => {
    try {
      setError("");
      const result = await getCommunityConnections();
      setConnections(
        Array.isArray(result.connections) ? result.connections : []
      );
    } catch (err) {
      setError(err.message || "Unable to load connections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const loadStudents = useCallback(async (query = "") => {
    try {
      setDiscoveryError("");
      setDiscoveryLoading(true);
      const result = await getCommunityStudents(query);
      setStudents(Array.isArray(result.students) ? result.students : []);
    } catch (err) {
      setDiscoveryError(err.message || "Unable to discover students.");
    } finally {
      setDiscoveryLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadStudents(studentSearch), 300);
    return () => window.clearTimeout(timer);
  }, [studentSearch, loadStudents]);

  const handleConnect = async (student) => {
    if (requestBusyId !== null) return;
    try {
      setRequestBusyId(Number(student.id));
      setDiscoveryError("");
      setDiscoveryNotice("");
      const result = await requestCommunityConnection(student.id);
      setDiscoveryNotice(result.message || "Connection request sent.");
      await loadConnections();
    } catch (err) {
      setDiscoveryError(err.message || "Unable to send connection request.");
    } finally {
      setRequestBusyId(null);
    }
  };

  const loadMessages = useCallback(async (connectionId, showLoading = false) => {
    if (showLoading) setChatLoading(true);

    try {
      setChatError("");
      const result = await getCommunityMessages(connectionId);
      setMessages(Array.isArray(result.messages) ? result.messages : []);
    } catch (err) {
      setChatError(err.message || "Unable to load messages.");
    } finally {
      if (showLoading) setChatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected || selected.status !== "accepted") {
      setMessages([]);
      return undefined;
    }

    let active = true;
    const connectionId = Number(selected.connectionId);
    const token = localStorage.getItem("token");

    setMessages([]);
    setChatError("");
    setChatLoading(true);

    // Load the existing conversation from the database first.
    getCommunityMessages(connectionId)
      .then((result) => {
        if (active) {
          setMessages(Array.isArray(result.messages) ? result.messages : []);
          setChatError("");
        }
      })
      .catch((err) => {
        if (active) {
          setChatError(err.message || "Unable to load messages.");
        }
      })
      .finally(() => {
        if (active) setChatLoading(false);
      });

    if (!token) {
      setChatError("Please sign in again to use chat.");
      return () => {
        active = false;
      };
    }

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("join_chat", connectionId, (result) => {
        if (!active) return;
        if (!result?.success) {
          setChatError(result?.message || "Unable to join this chat.");
        } else {
          setChatError("");
        }
      });
    });

    socket.on("connect_error", (err) => {
      if (active) {
        setChatError(err.message || "Real-time connection failed.");
      }
    });

    socket.on("new_message", (message) => {
      if (!active || Number(message?.connectionId) !== connectionId) return;

      setMessages((previous) => {
        const alreadyExists = previous.some(
          (item) => Number(item.id) === Number(message.id)
        );
        return alreadyExists ? previous : [...previous, message];
      });
    });

    return () => {
      active = false;
      socket.emit("leave_chat", connectionId);
      socket.disconnect();
    };
  }, [selected?.connectionId, selected?.status]);

  const handleResponse = async (connection, status) => {
    try {
      setBusyId(connection.connectionId);
      setError("");

      await respondToConnection(connection.connectionId, status);

      if (
        selected?.connectionId === connection.connectionId &&
        status === "rejected"
      ) {
        setSelected(null);
      }

      await loadConnections();
    } catch (err) {
      setError(err.message || "Unable to update request.");
    } finally {
      setBusyId(null);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();

    const messageText = draft.trim();

    if (!selected || !messageText || sending) return;

    try {
      setSending(true);
      setChatError("");

      const result = await sendCommunityMessage(
        selected.connectionId,
        messageText
      );

      if (result.message) {
        setMessages((previous) => {
          const alreadyExists = previous.some(
            (item) => Number(item.id) === Number(result.message.id)
          );
          return alreadyExists ? previous : [...previous, result.message];
        });
      }

      setDraft("");
    } catch (err) {
      setChatError(err.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const incomingRequests = connections.filter(
    (connection) =>
      connection.status === "pending" &&
      Number(connection.recipientId) === currentUserId
  );

  const outgoingRequests = connections.filter(
    (connection) =>
      connection.status === "pending" &&
      Number(connection.requesterId) === currentUserId
  );

  const acceptedConnections = connections.filter(
    (connection) => connection.status === "accepted"
  );

  const personName = (person) =>
    person?.name || person?.username || "CampusShare member";

  const openChat = (connection) => {
    navigate(`/chat/${connection.connectionId}`);
  };

  return (
    <div className="community-page">
      <header className="community-header">
        <button
          type="button"
          className="community-back"
          onClick={() => navigate("/profile")}
          aria-label="Back to profile"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1>Connections</h1>
          <p>Connect with people you've exchanged with</p>
        </div>

        <button
          type="button"
          className="community-refresh"
          onClick={loadConnections}
          aria-label="Refresh connections"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      {error && <div className="community-alert">{error}</div>}

      <main className="community-content">
        <section className="community-section">
          <section className="community-section community-discover-section">
          <h2>Discover students</h2>
          <p className="community-discover-description">
            Find people from your active college.
          </p>

          <label className="community-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search name, username or department"
              maxLength={80}
              aria-label="Search students"
            />
          </label>

          {discoveryNotice && (
            <div className="community-success" role="status">
              {discoveryNotice}
            </div>
          )}

          {discoveryError && (
            <div className="community-alert" role="alert">
              {discoveryError}
            </div>
          )}

          {discoveryLoading ? (
            <p className="community-muted">Finding students…</p>
          ) : students.length === 0 ? (
            <p className="community-empty">
              No matching students found in this college.
            </p>
          ) : (
            students.map((student) => {
              const sid = Number(student.id);
              const existing = connections.find((connection) => {
                const requesterId = Number(connection.requesterId);
                const recipientId = Number(connection.recipientId);
                return (
                  (requesterId === sid && recipientId === currentUserId) ||
                  (requesterId === currentUserId && recipientId === sid)
                );
              });

              let label = "Connect";
              let disabled = false;

              if (existing?.status === "accepted") {
                label = "Connected";
                disabled = true;
              } else if (existing?.status === "pending") {
                label =
                  Number(existing.requesterId) === currentUserId
                    ? "Request sent"
                    : "Respond to request";
                disabled = true;
              } else if (existing?.status === "rejected") {
                label = "Previously declined";
                disabled = true;
              }

              return (
                <article className="community-person-card" key={student.id}>
                  <div className="community-avatar">
                    <UserRound size={22} />
                  </div>
                  <div className="community-person-info">
                    <strong>{student.name || "CampusShare member"}</strong>
                    {student.username && <span>@{student.username}</span>}
                    {student.department && <span>{student.department}</span>}
                    {student.studyYear && <span>Year {student.studyYear}</span>}
                    {student.bio && <p>{student.bio}</p>}
                  </div>
                  <button
                    type="button"
                    className="community-connect-button"
                    disabled={disabled || requestBusyId === sid}
                    onClick={() => handleConnect(student)}
                  >
                    <UserPlus size={16} />
                    {requestBusyId === sid ? "Sending…" : label}
                  </button>
                </article>
              );
            })
          )}

          <p className="community-discover-note">
            You can connect after accepting a task or borrowing a resource.
          </p>
        </section>

        <h2>Connection requests</h2>

          {loading ? (
            <p className="community-muted">Loading connections…</p>
          ) : incomingRequests.length === 0 ? (
            <p className="community-empty">No incoming requests right now.</p>
          ) : (
            incomingRequests.map((connection) => (
              <article
                className="community-person-card"
                key={connection.connectionId}
              >
                <div className="community-avatar">
                  <UserRound size={22} />
                </div>

                <div className="community-person-info">
                  <strong>{personName(connection)}</strong>
                  {connection.username && (
                    <span>@{connection.username}</span>
                  )}
                  {connection.department && (
                    <span>{connection.department}</span>
                  )}
                  {connection.bio && <p>{connection.bio}</p>}
                </div>

                <div className="community-actions">
                  <button
                    type="button"
                    className="community-accept"
                    disabled={busyId === connection.connectionId}
                    onClick={() => handleResponse(connection, "accepted")}
                    aria-label="Accept request"
                  >
                    <Check size={17} /> Accept
                  </button>
                  <button
                    type="button"
                    className="community-reject"
                    disabled={busyId === connection.connectionId}
                    onClick={() => handleResponse(connection, "rejected")}
                    aria-label="Reject request"
                  >
                    <X size={17} /> Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="community-section">
          <h2>Sent requests</h2>

          {!loading && outgoingRequests.length === 0 ? (
            <p className="community-empty">You have no pending sent requests.</p>
          ) : (
            outgoingRequests.map((connection) => (
              <article
                className="community-person-card"
                key={connection.connectionId}
              >
                <div className="community-avatar">
                  <UserRound size={22} />
                </div>
                <div className="community-person-info">
                  <strong>{personName(connection)}</strong>
                  {connection.username && <span>@{connection.username}</span>}
                  <span className="community-pending-label">
                    Request pending
                  </span>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="community-section">
          <h2>Your connections</h2>

          {!loading && acceptedConnections.length === 0 ? (
            <p className="community-empty">
              Accepted connections will appear here.
            </p>
          ) : (
            acceptedConnections.map((connection) => (
              <article
                className={`community-person-card ${
                  selected?.connectionId === connection.connectionId
                    ? "community-person-selected"
                    : ""
                }`}
                key={connection.connectionId}
              >
                <div className="community-avatar">
                  <UserRound size={22} />
                </div>

                <div className="community-person-info">
                  <strong>{personName(connection)}</strong>
                  {connection.username && <span>@{connection.username}</span>}
                  {connection.department && (
                    <span>{connection.department}</span>
                  )}
                  {connection.studyYear && (
                    <span>Year {connection.studyYear}</span>
                  )}
                </div>

                <button
                  type="button"
                  className="community-chat-button"
                  onClick={() => openChat(connection)}
                >
                  <MessageCircle size={17} />
                  Chat
                </button>
              </article>
            ))
          )}
        </section>

        {selected && (
          <section className="community-chat-panel">
            <div className="community-chat-header">
              <div className="community-avatar">
                <MessageCircle size={21} />
              </div>
              <div>
                <h2>{personName(selected)}</h2>
                <p>Private connection chat</p>
              </div>
              <button
                type="button"
                className="community-close-chat"
                onClick={() => setSelected(null)}
                aria-label="Close chat"
              >
                <X size={19} />
              </button>
            </div>

            <div className="community-message-list">
              {chatLoading ? (
                <p className="community-muted">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="community-empty">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`community-message ${
                      Number(message.senderId) === currentUserId
                        ? "community-message-mine"
                        : "community-message-theirs"
                    }`}
                  >
                    <p>{message.messageText}</p>
                    <time>
                      {message.createdAt
                        ? new Date(message.createdAt).toLocaleString()
                        : ""}
                    </time>
                  </div>
                ))
              )}
            </div>

            {chatError && <div className="community-alert">{chatError}</div>}

            <form className="community-message-form" onSubmit={handleSend}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a message…"
                maxLength={4000}
                aria-label="Message"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </form>
          </section>
        )}
      </main>

      <BottomNavigation active="connections" />
    </div>
  );
}

export default Connections;
