
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid email or password");
        return;
      }

      // Save login information for later pages
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Login successful
      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        "Unable to connect to backend. Make sure the backend is running on port 3000."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert("Google login will be connected later.");
  };

  const handleSignup = () => {
    navigate("/register");
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">

          {/* LOGO */}
          <h1 className="logo">
            CampusShare
          </h1>

          {/* HEADING */}
          <h2 className="login-heading">
            Welcome Back!
          </h2>

          <p className="login-subtitle">
            Login to continue
          </p>

          {/* ERROR MESSAGE */}
          {error && (
            <div
              style={{
                color: "#dc2626",
                backgroundColor: "#fee2e2",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "15px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin}>

            {/* EMAIL */}
            <div className="form-group">
              <label className="form-label">
                Email Address
              </label>

              <input
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label className="form-label">
                Password
              </label>

              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input password-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </div>

            {/* FORGOT PASSWORD */}
            <div className="forgot-password">
              <button
                type="button"
                onClick={() =>
                  alert("Forgot password will be added later.")
                }
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>

          {/* DIVIDER */}
          <div className="divider">
            <div className="divider-line"></div>

            <span className="divider-text">
              OR
            </span>

            <div className="divider-line"></div>
          </div>

          {/* GOOGLE */}
          <button
            className="google-button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Continue with Google
          </button>

          {/* SIGN UP */}
          <div className="signup-text">
            Don't have an account?{" "}
            <button
              onClick={handleSignup}
              disabled={loading}
            >
              Sign Up
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;
