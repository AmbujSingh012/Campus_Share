import { useState } from "react";
import {
  connectPeraWallet,
  createPeraX402Signer,
} from "../utils/peraWallet";
import { x402Client } from "@x402/core/client";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import "./CampusHelper.css";

function CampusHelper() {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnecting, setWalletConnecting] = useState(false);

  const [request, setRequest] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  // Connect Pera Wallet
  const handleConnectWallet = async () => {
    try {
      setWalletConnecting(true);

      const address = await connectPeraWallet();

      setWalletAddress(address);
    } catch (error) {
      console.error("Wallet connection failed:", error);
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

      // Call the paid Campus Helper API
      const res = await paidFetch("http://localhost:3000/api/helper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request: request.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Campus Helper request failed"
        );
      }

      setResponse(data.message);
    } catch (error) {
      console.error("Campus Helper error:", error);

      setResponse(
        error?.message ||
          "Unable to connect to Campus Helper. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // Example request buttons
  const handleExampleClick = (example) => {
    setRequest(example);
    setResponse("");
  };

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

        {/* Response */}
        <div className="helper-response">
          <h3>🤖 Helper Response</h3>

          <div className="response-box">

            {loading && (
              <p>
                Processing your request...
              </p>
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

      </div>
    </div>
  );
}

export default CampusHelper;