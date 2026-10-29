
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  ArrowLeft,
  Send,
  MessageCircle,
  UserRound,
  Paperclip,
  FileText,
  X,
  ExternalLink,
} from "lucide-react";
import API_BASE_URL, {
  getCommunityConnections,
  getCommunityMessages,
  sendCommunityMessage,
  downloadCommunityAttachment,
} from "../api";
import BottomNavigation from "../components/BottomNavigation";
import "./Chat.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

function formatFileSize(bytes) {
  if (!Number.isFinite(Number(bytes))) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Chat() {
  const navigate = useNavigate();
  const { connectionId: routeConnectionId } = useParams();
  const connectionId = Number(routeConnectionId);

  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = Number(currentUser?.id);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setFilePreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(selectedFile);
    setFilePreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const addMessage = useCallback((incoming) => {
    if (!incoming) return;

    setMessages((previous) => {
      const id = incoming.id;

      if (
        id != null &&
        previous.some((message) => String(message.id) === String(id))
      ) {
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
        const rows = Array.isArray(result.connections)
          ? result.connections
          : [];

        const found = rows.find(
          (item) =>
            Number(item.connectionId) === connectionId &&
            item.status === "accepted"
        );

        if (!found) {
          throw new Error(
            "Accepted connection not found. Please check Connections."
          );
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
    if (!connection || !connectionId) return undefined;

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
      setError(
        (previous) =>
          previous ||
          "Live connection interrupted. Your message history may still be available."
      );
    });

    return () => {
      socket.emit("leave_chat", connectionId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [connection, connectionId, addMessage]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or PDF file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be 5 MB or less.");
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  const handleSend = async (event) => {
    event.preventDefault();

    const messageText = draft.trim();

    if ((!messageText && !selectedFile) || sending || !connection) return;

    setSending(true);
    setError("");

    try {
      const result = await sendCommunityMessage(
        connectionId,
        messageText,
        selectedFile
      );

      if (result.message) {
        addMessage(result.message);
      } else {
        throw new Error("Message was sent, but no message data was returned.");
      }

      setDraft("");
      setSelectedFile(null);
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
   const handleDownloadAttachment = async (message) => {
  try {
    setError("");

    const blob = await downloadCommunityAttachment(
      connectionId,
      message.id
    );

    const fileName = message.attachmentName || "Shared document.pdf";
    const safeFileName = fileName.toLowerCase().endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;

    const pdfBlob = new Blob([blob], {
      type: "application/pdf",
    });

    const objectUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = safeFileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    setError(err.message || "Unable to download this attachment.");
  }
};
const renderAttachment = (message) => {
  if (!message.attachmentUrl) return null;

  const isImage =
    message.attachmentType === "image/jpeg" ||
    message.attachmentType === "image/png";

  if (isImage) {
    return (
      <a
        className="chat-attachment-image-link"
        href={message.attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open image ${message.attachmentName || ""}`}
      >
        <img
          className="chat-attachment-image"
          src={message.attachmentUrl}
          alt={message.attachmentName || "Shared image"}
          loading="lazy"
        />
      </a>
    );
  }

  const fileName = message.attachmentName || "Shared document.pdf";

  return (
    <button
      type="button"
      className="chat-attachment-file"
      onClick={() => handleDownloadAttachment(message)}
      aria-label={`Download ${fileName}`}
    >
      <span className="chat-attachment-file-icon">
        <FileText size={22} />
      </span>

      <span className="chat-attachment-file-details">
        <strong>{fileName}</strong>
        <small>
          PDF
          {message.attachmentSize != null
            ? ` · ${formatFileSize(message.attachmentSize)}`
            : ""}
        </small>
      </span>

      <ExternalLink size={16} />
    </button>
  );
};

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

        <section
          className="chat-conversation"
          aria-label="Conversation messages"
        >
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
                          mine
                            ? "chat-message-row--mine"
                            : "chat-message-row--theirs"
                        }`}
                      >
                        <div
                          className={`chat-bubble ${
                            mine ? "chat-bubble--mine" : "chat-bubble--theirs"
                          }`}
                        >
                          {message.messageText && <p>{message.messageText}</p>}

                          {renderAttachment(message)}

                          <time>
                            {message.createdAt
                              ? new Date(message.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  }
                                )
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
            ref={fileInputRef}
            className="chat-file-input"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={handleFileChange}
            disabled={loading || !connection || sending}
            aria-label="Choose an image or PDF"
          />

          <button
            type="button"
            className="chat-attach-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || !connection || sending}
            aria-label="Attach an image or PDF"
            title="Attach JPG, PNG, or PDF (max 5 MB)"
          >
            <Paperclip size={19} />
          </button>

          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message..."
            aria-label="Write a message"
            maxLength={4000}
            disabled={loading || !connection || sending}
          />

          <button
            type="submit"
            disabled={
              (!draft.trim() && !selectedFile) ||
              sending ||
              loading ||
              !connection
            }
            aria-label="Send message"
          >
            <Send size={19} />
          </button>
        </form>

        {selectedFile && (
          <div className="chat-selected-file">
            {filePreviewUrl ? (
              <img
                className="chat-selected-image"
                src={filePreviewUrl}
                alt="Selected image preview"
              />
            ) : (
              <span className="chat-selected-file-icon">
                <FileText size={22} />
              </span>
            )}

            <div className="chat-selected-file-details">
              <strong>{selectedFile.name}</strong>
              <small>{formatFileSize(selectedFile.size)}</small>
            </div>

            <button
              type="button"
              className="chat-remove-file"
              onClick={() => setSelectedFile(null)}
              disabled={sending}
              aria-label="Remove selected file"
              title="Remove attachment"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </main>

      {photoViewerOpen &&
        (connection?.profilePicture || connection?.profile_picture) && (
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