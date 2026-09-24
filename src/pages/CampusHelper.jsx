import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock3,
  Coins,
  Laptop,
  MapPin,
  MessageCircle,
  Package,
  Send,
  Sparkles,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";

import {
  connectPeraWallet,
  createPeraX402Signer,
} from "../utils/peraWallet";

import { borrowResource, acceptTask } from "../api";

import { x402Client } from "@x402/core/client";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";

import "./CampusHelper.css";

function CampusHelper() {
  const navigate = useNavigate();

  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [request, setRequest] = useState("");
  const [response, setResponse] = useState("");
  const [recommendations, setRecommendations] = useState({
    resources: [],
    tasks: [],
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const handleConnectWallet = async () => {
    try {
      setWalletConnecting(true);

      const address = await connectPeraWallet();

      setWalletAddress(address);
      setResponse("Pera Wallet connected. You are ready to ask the helper.");
    } catch (error) {
      console.error("Wallet connection failed:", error);

      setResponse(
        error?.message || "Unable to connect Pera Wallet."
      );
    } finally {
      setWalletConnecting(false);
    }
  };

  const handleAskHelper = async () => {
    if (!request.trim()) {
      setResponse("Tell me what you need and I’ll find the closest match.");
      return;
    }

    if (!walletAddress) {
      setResponse("Connect your Pera Wallet first to use Campus Helper.");
      return;
    }

    setLoading(true);
    setResponse("");
    setRecommendations({
      resources: [],
      tasks: [],
    });

    try {
      const signer = createPeraX402Signer();

      const avmScheme = new ExactAvmScheme(signer, {
        algodUrl: "https://testnet-api.algonode.cloud",
      });

      const client = new x402Client();

      client.register(
        "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
        avmScheme
      );

      const paidFetch = wrapFetchWithPayment(fetch, client);

      const res = await paidFetch(
        `${API_BASE_URL}/api/helper`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request: request.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Campus Helper request failed"
        );
      }

      setResponse(
        data.message ||
          "I found some things that might help you."
      );

      setRecommendations({
        resources: data.results?.resources || [],
        tasks: data.results?.tasks || [],
      });
    } catch (error) {
      console.error("Campus Helper error:", error);

      setResponse(
        error?.message ||
          "Unable to connect to Campus Helper. Make sure the backend is running."
      );

      setRecommendations({
        resources: [],
        tasks: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowResource = async (resource) => {
    try {
      setActionLoading(`resource-${resource.id}`);

      const data = await borrowResource(resource.id);

      if (data.success) {
        setResponse(
          `Successfully requested "${resource.title}".`
        );

        setTimeout(() => {
          navigate("/resources");
        }, 700);
      } else {
        throw new Error(
          data.message || "Unable to borrow this resource."
        );
      }
    } catch (error) {
      console.error("Borrow resource error:", error);

      setResponse(
        error?.message || "Unable to borrow this resource."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyTask = async (task) => {
    try {
      setActionLoading(`task-${task.id}`);

      const data = await acceptTask(task.id);

      if (data.success) {
        setResponse(
          `You applied for "${task.title}". No payment is required to apply.`
        );

        setTimeout(() => {
          navigate("/connection-details", {
            state: {
              taskId: task.id,
            },
          });
        }, 700);
      } else {
        throw new Error(
          data.message || "Unable to apply for this task."
        );
      }
    } catch (error) {
      console.error("Apply task error:", error);

      setResponse(
        error?.message || "Unable to apply for this task."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleExampleClick = (example) => {
    setRequest(example);
    setResponse("");
    setRecommendations({
      resources: [],
      tasks: [],
    });
  };

  const hasRecommendations =
    recommendations.resources.length > 0 ||
    recommendations.tasks.length > 0;

  const formatDeadline = (deadline) => {
    if (!deadline) return "No deadline";

    const date = new Date(deadline);

    if (Number.isNaN(date.getTime())) {
      return "No deadline";
    }

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="helper-page app-page-frame">
      <div className="helper-background-orb helper-orb-one" />
      <div className="helper-background-orb helper-orb-two" />

      <div className="helper-shell">
        <header className="helper-topbar">
          <button
            type="button"
            className="helper-back-button"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft size={19} />
          </button>

          <div className="helper-brand">
            <div className="helper-brand-icon">
              <Sparkles size={17} />
            </div>

            <div>
              <strong>Campus Helper</strong>
              <span>AI campus concierge</span>
            </div>
          </div>

          <button
            type="button"
            className={`helper-wallet-button ${
              walletAddress ? "connected" : ""
            }`}
            onClick={handleConnectWallet}
            disabled={walletConnecting}
          >
            {walletAddress ? (
              <>
                <CheckCircle2 size={16} />
                <span>
                  {walletAddress.slice(0, 5)}...
                  {walletAddress.slice(-4)}
                </span>
              </>
            ) : (
              <>
                <Wallet size={16} />
                <span>
                  {walletConnecting
                    ? "Connecting..."
                    : "Connect wallet"}
                </span>
              </>
            )}
          </button>
        </header>

        <main className="helper-content">
          <section className="helper-hero">
            <div className="helper-hero-copy">
              <div className="helper-live-pill">
                <span />
                AI helper is online
              </div>

              <h1>
                Tell me what
                <br />
                <em>you need.</em>
              </h1>

              <p>
                Describe it naturally. I’ll scan your campus
                for resources and micro-tasks that match.
              </p>

              <div className="helper-powered">
                <Zap size={14} />
                Powered by CampusShare + x402
              </div>
            </div>

            <div className="helper-hero-bot">
              <div className="helper-bot-ring">
                <Bot size={54} strokeWidth={1.7} />
              </div>

              <div className="helper-floating-chip chip-one">
                <Package size={14} />
                Resources
              </div>

              <div className="helper-floating-chip chip-two">
                <Coins size={14} />
                Micro-tasks
              </div>
            </div>
          </section>

          <section className="helper-command-card">
            <div className="helper-command-top">
              <div className="helper-command-label">
                <MessageCircle size={17} />
                <span>YOUR REQUEST</span>
              </div>

              <span className="helper-command-hint">
                Natural language
              </span>
            </div>

            <textarea
              id="helper-request"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="e.g. I need a calculator for tomorrow's class..."
              rows="4"
              disabled={loading}
            />

            <div className="helper-command-bottom">
              <span>
                {request.length > 0
                  ? `${request.length} characters`
                  : "What can I help you find?"}
              </span>

              <button
                type="button"
                className="helper-ask-button"
                onClick={handleAskHelper}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="helper-spinner" />
                    Thinking...
                  </>
                ) : (
                  <>
                    Ask Helper
                    <Send size={16} />
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="helper-examples">
            <div className="helper-section-heading">
              <span>START HERE</span>
              <h2>Try asking for...</h2>
            </div>

            <div className="helper-example-grid">
              <button
                type="button"
                onClick={() =>
                  handleExampleClick(
                    "I need a calculator for tomorrow's class."
                  )
                }
              >
                <span className="helper-example-icon blue">
                  <Laptop size={18} />
                </span>

                <span>
                  <strong>Study gear</strong>
                  <small>“Need a calculator”</small>
                </span>

                <ArrowUpRight size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  handleExampleClick(
                    "I need someone to help me with Python."
                  )
                }
              >
                <span className="helper-example-icon purple">
                  <Bot size={18} />
                </span>

                <span>
                  <strong>Skill help</strong>
                  <small>“Help me with Python”</small>
                </span>

                <ArrowUpRight size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  handleExampleClick(
                    "I want to borrow a laptop for two days."
                  )
                }
              >
                <span className="helper-example-icon green">
                  <Package size={18} />
                </span>

                <span>
                  <strong>Borrow something</strong>
                  <small>“Need a laptop”</small>
                </span>

                <ArrowUpRight size={16} />
              </button>
            </div>
          </section>

          {(loading || response) && (
            <section className="helper-response-section">
              <div className="helper-section-heading">
                <span>AI RESPONSE</span>
                <h2>Here’s what I found.</h2>
              </div>

              <div
                className={`helper-response-card ${
                  loading ? "is-loading" : ""
                }`}
              >
                <div className="helper-response-avatar">
                  <Sparkles size={19} />
                </div>

                <div className="helper-response-content">
                  {loading ? (
                    <>
                      <strong>Searching your campus...</strong>
                      <p>
                        Matching your request with available
                        resources and tasks.
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>Campus Helper</strong>
                      <p>{response}</p>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {!loading && hasRecommendations && (
            <section className="helper-results">
              {recommendations.resources.length > 0 && (
                <div className="helper-result-section">
                  <div className="helper-result-heading">
                    <div>
                      <span className="helper-result-number">
                        01
                      </span>

                      <div>
                        <span>MATCHED FOR YOU</span>
                        <h2>Resources</h2>
                      </div>
                    </div>

                    <span className="helper-result-count">
                      {recommendations.resources.length}
                    </span>
                  </div>

                  <div className="helper-result-grid">
                    {recommendations.resources.map(
                      (resource) => (
                        <article
                          className="helper-result-card resource"
                          key={`resource-${resource.id}`}
                        >
                          <div className="helper-result-card-top">
                            <div className="helper-result-card-icon">
                              <Package size={20} />
                            </div>

                            <span className="helper-match-pill">
                              Available
                            </span>
                          </div>

                          <h3>{resource.title}</h3>

                          <p>
                            {resource.description ||
                              "Campus resource available for borrowing."}
                          </p>

                          <div className="helper-card-details">
                            <span>
                              Category
                              <strong>
                                {resource.category ||
                                  "General"}
                              </strong>
                            </span>

                            <span>
                              Owner
                              <strong>
                                {resource.postedBy ||
                                  "Campus student"}
                              </strong>
                            </span>
                          </div>

                          <button
                            type="button"
                            className="helper-result-action"
                            disabled={
                              actionLoading ===
                              `resource-${resource.id}`
                            }
                            onClick={() =>
                              handleBorrowResource(resource)
                            }
                          >
                            {actionLoading ===
                            `resource-${resource.id}`
                              ? "Requesting..."
                              : "Borrow resource"}

                            <ArrowUpRight size={16} />
                          </button>
                        </article>
                      )
                    )}
                  </div>
                </div>
              )}

              {recommendations.tasks.length > 0 && (
                <div className="helper-result-section">
                  <div className="helper-result-heading">
                    <div>
                      <span className="helper-result-number">
                        02
                      </span>

                      <div>
                        <span>EARN ON CAMPUS</span>
                        <h2>Micro-tasks</h2>
                      </div>
                    </div>

                    <span className="helper-result-count">
                      {recommendations.tasks.length}
                    </span>
                  </div>

                  <div className="helper-result-grid">
                    {recommendations.tasks.map((task) => (
                      <article
                        className="helper-result-card task"
                        key={`task-${task.id}`}
                      >
                        <div className="helper-result-card-top">
                          <div className="helper-result-card-icon">
                            <Coins size={20} />
                          </div>

                          <span className="helper-reward-pill">
                            {Number(task.reward || 0).toFixed(
                              2
                            )}{" "}
                            USDC
                          </span>
                        </div>

                        <h3>{task.title}</h3>

                        <p>
                          {task.description ||
                            "Campus task available for students."}
                        </p>

                        <div className="helper-task-meta">
                          <span>
                            <MapPin size={14} />
                            {task.location || "Campus"}
                          </span>

                          <span>
                            <Clock3 size={14} />
                            {formatDeadline(task.deadline)}
                          </span>
                        </div>

                        <div className="helper-task-poster">
                          Posted by{" "}
                          <strong>
                            {task.postedBy ||
                              "Campus student"}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="helper-result-action"
                          disabled={
                            actionLoading ===
                            `task-${task.id}`
                          }
                          onClick={() =>
                            handleApplyTask(task)
                          }
                        >
                          {actionLoading ===
                          `task-${task.id}`
                            ? "Applying..."
                            : "Apply for task"}

                          <ArrowUpRight size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {!loading &&
            response &&
            !hasRecommendations && (
              <div className="helper-no-results">
                <div>
                  <XCircle size={20} />
                </div>

                <div>
                  <strong>No direct matches yet</strong>
                  <p>
                    Try adding a little more detail to your
                    request and I’ll search again.
                  </p>
                </div>
              </div>
            )}
        </main>
      </div>
    </div>
  );
}

export default CampusHelper;
