
import API_BASE_URL from "../api";

import "./Login.css";

import { useEffect, useState } from "react";

import {
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [selectedCollege, setSelectedCollege] = useState(null);

  // Handle Google OAuth callback
  useEffect(() => {
    const googleToken = new URLSearchParams(
      window.location.search
    ).get("google_token");

    if (!googleToken) {
      return;
    }

    const handleGoogleCallback = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${googleToken}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Google login failed"
          );
        }

        localStorage.setItem("token", googleToken);

        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        // Remove google_token from the browser URL
        window.history.replaceState(
          {},
          document.title,
          "/login"
        );

        navigate("/home");
      } catch (error) {
        console.error(
          "Google login callback error:",
          error
        );

        setError(
          "Google login failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    handleGoogleCallback();
  }, [navigate]);

  // Load selected college
  useEffect(() => {
    const savedCollege =
      localStorage.getItem("selectedCollege");

    if (savedCollege) {
      try {
        setSelectedCollege(
          JSON.parse(savedCollege)
        );
      } catch (error) {
        console.error(
          "Selected college error:",
          error
        );
      }
    }
  }, []);

  // Normal email/password login
  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError(
        "Please enter email and password"
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            "Invalid email or password"
        );

        return;
      }

      if (data.token) {
        localStorage.setItem(
          "token",
          data.token
        );
      }

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      navigate("/home");
    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      setError(
        "Unable to connect to backend. Make sure the backend is running on port 3000."
      );
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async () => {
    setError("");

    if (!email) {
      setError(
        "Enter your email address first."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            "Unable to send password reset email."
        );

        return;
      }

      setError(
        "Password reset link sent to your email. Please check your inbox."
      );
    } catch (error) {
      console.error(
        "Forgot password error:",
        error
      );

      setError(
        "Unable to connect to backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Google Login
  const handleGoogleLogin = () => {
    const savedCollege =
      localStorage.getItem("selectedCollege");

    let collegeId = "";

    if (savedCollege) {
      try {
        const college =
          JSON.parse(savedCollege);

        collegeId = college?.id || "";
      } catch (error) {
        console.error(
          "Unable to read selected college:",
          error
        );
      }
    }

    const params = new URLSearchParams();

    if (collegeId) {
      params.set(
        "college_id",
        collegeId
      );
    }

    const googleLoginUrl =
      `${API_BASE_URL}/api/auth/google` +
      (params.toString()
        ? `?${params.toString()}`
        : "");

    window.location.href =
      googleLoginUrl;
  };

  const handleSignup = () => {
    navigate("/register");
  };

  return (
    <div className="login-page app-page-frame">

      <div className="login-orb login-orb-one"></div>

      <div className="login-orb login-orb-two"></div>

      <div className="login-orb login-orb-three"></div>

      <div className="login-container">

        <div className="login-top">

          <div className="login-brand">

            <div className="login-brand-icon">
              C
            </div>

            <span>
              CampusShare
            </span>

          </div>

        </div>

        <div className="login-card">

          <div className="login-card-glow"></div>

          {selectedCollege && (
            <button
              type="button"
              className="login-selected-college"
              onClick={() => navigate("/")}
              disabled={loading}
            >

              <div className="login-campus-icon">
                🎓
              </div>

              <div className="login-campus-info">

                <span>
                  Continuing with
                </span>

                <strong>
                  {selectedCollege.name}
                </strong>

              </div>

              <ArrowLeft size={16} />

            </button>
          )}

          <div className="login-heading">

            <div className="login-welcome-badge">

              <span></span>

              <h2>
                Welcome
              </h2>

            </div>

            <h1>
              Login to your
              <span>
                {" "}
                campus.
              </span>
            </h1>

            <p>
              Connect with students, share resources and get profit.
            </p>

          </div>

          {error && (
            <div className="login-error">

              <span>
                !
              </span>

              {error}

            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="login-form"
          >

            <div className="login-form-group">

              <label>
                Email address
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                disabled={loading}
              />

            </div>

            <div className="login-form-group">

              <div className="login-label-row">

                <label>
                  Password
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>

              </div>

              <div className="login-password-wrapper">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  disabled={loading}
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

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >

              <span>
                {loading
                  ? "Logging in..."
                  : "Enter CampusShare"}
              </span>

              {!loading && (
                <span className="login-submit-icon">

                  <ArrowRight
                    size={17}
                  />

                </span>
              )}

            </button>

          </form>

          <div className="login-divider">

            <span></span>

            <small>
              OR
            </small>

            <span></span>

          </div>

          <button
            type="button"
            className="login-google"
            onClick={handleGoogleLogin}
            disabled={loading}
          >

            <span className="login-google-icon">
              G
            </span>

            Continue with Google

          </button>

          <div className="login-trust">

            <ShieldCheck size={15} />

            <span>
              Your campus account stays secure
            </span>

          </div>

          <div className="login-signup">

            <span>
              New to CampusShare?
            </span>

            <button
              type="button"
              onClick={handleSignup}
              disabled={loading}
            >

              Create account

              <ArrowRight
                size={14}
              />

            </button>

          </div>

        </div>

        <p className="login-footer">
          Built for campus life • Share more. Do more.
        </p>

      </div>

    </div>
  );
}

export default Login;