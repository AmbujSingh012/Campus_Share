import { useState } from "react";
import { Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE_URL from "../api";
import "./Login.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError("This password reset link is invalid.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to reset password.");
        return;
      }

      setSuccess(
        "Password reset successful. You can now log in."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(
        "Unable to connect to backend. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page app-page-frame">
      <div className="login-orb login-orb-one"></div>
      <div className="login-orb login-orb-two"></div>
      <div className="login-orb login-orb-three"></div>

      <div className="login-container">
        <div className="login-top">
          <div className="login-brand">
            <div className="login-brand-icon">C</div>
            <span>CampusShare</span>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-glow"></div>

          <div className="login-heading">
            <div className="login-welcome-badge">
              <span></span>
              <h2>Secure Account</h2>
            </div>

            <h1>
              Create a new
              <span> password.</span>
            </h1>

            <p>
              Choose a new password for your CampusShare account.
            </p>
          </div>

          {error && (
            <div className="login-error">
              <span>!</span>
              {error}
            </div>
          )}

          {success && (
            <div
              className="login-error"
              style={{
                borderColor: "#bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
              }}
            >
              <span
                style={{
                  background: "#16a34a",
                }}
              >
                ✓
              </span>
              {success}
            </div>
          )}

          <form
            onSubmit={handleResetPassword}
            className="login-form"
          >
            <div className="login-form-group">
              <label>New password</label>

              <div className="login-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || !!success}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  disabled={loading || !!success}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="login-form-group">
              <label>Confirm new password</label>

              <div className="login-password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Enter your password again"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  disabled={loading || !!success}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  disabled={loading || !!success}
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading || !!success}
            >
              <span>
                {loading ? "Resetting..." : "Reset Password"}
              </span>

              {!loading && !success && (
                <span className="login-submit-icon">
                  <ArrowRight size={17} />
                </span>
              )}
            </button>
          </form>

          <button
            type="button"
            className="login-google"
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            <ArrowLeft size={17} />
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
