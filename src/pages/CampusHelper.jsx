import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Star } from "lucide-react";

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

  // Connect Pera Wallet
  const handleConnectWallet = async () => {
    try {
      setWalletConnecting(true);

      const address = await connectPeraWallet();

      setWalletAddress(address);
    } catch (error) {
      console.error("Wallet connection failed:", error);

      setResponse(
        error?.message || "Unable to connect Pera Wallet."
      );
    } finally {
      setWalletConnecting(false);
    }
  };

  // Ask Campus Helper
  const handleAskHelper = async () => {
    if (!request.trim()) {
      setResponse("Please tell me what you need help with.");
      return;
    }

    if (!walletAddress) {
      setResponse("Please connect your Pera Wallet first.");
      return;
    }

    setLoading(true);
    setResponse("");

    setRecommendations({
      resources: [],
      tasks: [],
    });

    try {
      // Create Pera x402 signer
      const signer = createPeraX402Signer();

      // Create Algorand AVM payment scheme
      const avmScheme = new ExactAvmScheme(signer, {
        algodUrl: "https://testnet-api.algonode.cloud",
      });

      // Create x402 client
      const client = new x402Client();

      // Register Algorand Testnet scheme
      client.register(
        "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
        avmScheme
      );

      // Wrap fetch so x402 payment can happen automatically
      const paidFetch = wrapFetchWithPayment(fetch, client);

      // Call Campus Helper API
      const res = await paidFetch(
        "http://localhost:3000/api/helper",
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

      // Show helper's natural-language response
      setResponse(
        data.message || "Here are some recommendations for you."
      );

      // Show structured recommendations
      setRecommendations({
        resources: data.results?.resources || [],
        tasks: data.results?.tasks || [],
      });
    } catch (error) {
      console.error("Campus Helper error:", error);

      setResponse(
        error?.message ||
          "Unable to connect to Campus Helper. Please make sure the backend is running."
      );

      setRecommendations({
        resources: [],
        tasks: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // Borrow recommended resource
  const handleBorrowResource = async (resource) => {
    try {
      setActionLoading(`resource-${resource.id}`);

      const data = await borrowResource(resource.id);

      if (data.success) {
        setResponse(
          `Successfully requested "${resource.title}".`
        );

        // Refresh Resources page to show latest database state
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

  // Apply for recommended task
  const handleApplyTask = async (task) => {
    try {
      setActionLoading(`task-${task.id}`);

      const data = await acceptTask(task.id);

      if (data.success) {
        setResponse(
          `You applied for "${task.title}". No payment is required to apply.`
        );

        // Go to the existing connection details flow
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

  // Example request buttons
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

  return (
    <div className="helper-page">
      <div className="helper-card">

        {/* Header */}
        <div className="helper-header">
          <div className="helper-icon">🤖</div>

          <div>
            <h1>Campus Helper</h1>

            {/* Pera Wallet */}
            <button
              type="button"
              onClick={handleConnectWallet}
              disabled={walletConnecting}
            >
              {walletConnecting
                ? "Connecting..."
                : walletAddress
                ? `Connected: ${walletAddress.slice(
                    0,
                    6
                  )}...${walletAddress.slice(-4)}`
                : "Connect Pera Wallet"}
            </button>

            <p>
              Tell me what you need in your own words.
            </p>
          </div>
        </div>

        {/* Request Input */}
        <div className="helper-input-section">
          <label htmlFor="helper-request">
            What do you need help with?
          </label>

          <textarea
            id="helper-request"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Example: I need a calculator for tomorrow's class..."
            rows="5"
          />

          <button
            type="button"
            className="ask-helper-button"
            onClick={handleAskHelper}
            disabled={loading}
          >
            {loading ? "Thinking..." : "Ask Helper"}
          </button>
        </div>

        {/* Examples */}
        <div className="examples-section">
          <h3>Try an example</h3>

          <div className="example-buttons">
            <button
              type="button"
              onClick={() =>
                handleExampleClick(
                  "I need a calculator for tomorrow's class."
                )
              }
            >
              📱 Need a calculator
            </button>

            <button
              type="button"
              onClick={() =>
                handleExampleClick(
                  "I need someone to help me with Python."
                )
              }
            >
              💻 Python help
            </button>

            <button
              type="button"
              onClick={() =>
                handleExampleClick(
                  "I want to borrow a laptop for two days."
                )
              }
            >
              💻 Borrow a laptop
            </button>
          </div>
        </div>

        {/* Helper Response */}
        <div className="helper-response">
          <h3>🤖 Helper Response</h3>

          <div className="response-box">
            {loading && (
              <p>Processing your request...</p>
            )}

            {!loading && response && (
              <p>{response}</p>
            )}

            {!loading && !response && (
              <p className="response-placeholder">
                Your helper response will appear here.
              </p>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {!loading && hasRecommendations && (
          <div className="helper-recommendations">

            {/* Resources */}
            {recommendations.resources.length > 0 && (
              <div className="recommendation-section">
                <h3>📦 Recommended Resources</h3>

                <div className="recommendation-grid">
                  {recommendations.resources.map((resource) => (
                    <div
                      className="recommendation-card"
                      key={`resource-${resource.id}`}
                    >
                      <div className="recommendation-card-header">
                        <h4>{resource.title}</h4>

                        <span className="recommendation-type">
                          Resource
                        </span>
                      </div>

                      <p className="recommendation-description">
                        {resource.description ||
                          "Campus resource available for borrowing."}
                      </p>

                      <p className="recommendation-detail">
                        <strong>Category:</strong>{" "}
                        {resource.category || "General"}
                      </p>

                      <p className="recommendation-detail">
                        <strong>Owner:</strong>{" "}
                        {resource.postedBy || "Campus student"}
                      </p>

                      <p className="recommendation-detail">
                        <span className="available-status">
                          ● {resource.availability || "Available"}
                        </span>
                      </p>

                      <button
                        type="button"
                        className="recommendation-action"
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
                          ? "Borrowing..."
                          : "Borrow Resource"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            {recommendations.tasks.length > 0 && (
              <div className="recommendation-section">
                <h3>📝 Recommended Tasks</h3>

                <div className="recommendation-grid">
                  {recommendations.tasks.map((task) => (
                    <div
                      className="recommendation-card"
                      key={`task-${task.id}`}
                    >
                      <div className="recommendation-card-header">
                        <h4>{task.title}</h4>

                        <span className="recommendation-type">
                          Task
                        </span>
                      </div>

                      <p className="recommendation-description">
                        {task.description ||
                          "Campus task available for students."}
                      </p>

                      <p className="recommendation-detail">
                        <strong>Category:</strong>{" "}
                        {task.category || "General"}
                      </p>

                      <p className="recommendation-detail">
                        <MapPin size={14} />
                        <strong> Location:</strong>{" "}
                        {task.location || "Campus"}
                      </p>

                      <p className="recommendation-detail">
                        <Clock size={14} />
                        <strong> Deadline:</strong>{" "}
                        {task.deadline
                          ? new Date(
                              task.deadline
                            ).toLocaleString()
                          : "Not specified"}
                      </p>

                      <p className="recommendation-reward">
                        Reward: {task.reward || "0.00"} USDC
                      </p>

                      <p className="recommendation-detail">
                        <strong>Posted by:</strong>{" "}
                        {task.postedBy || "Campus student"}
                      </p>

                      <button
                        type="button"
                        className="recommendation-action"
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
                          : "Apply for Task"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No matches */}
            {!hasRecommendations && (
              <div className="no-recommendations">
                <p>
                  No matching resources or tasks were found.
                  Try describing your request differently.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CampusHelper;
