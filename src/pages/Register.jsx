import API_BASE_URL from "../api";

import "./Register.css";

import { useEffect, useState } from "react";

import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [collegeId, setCollegeId] = useState("");

  const [loadingColleges, setLoadingColleges] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedCollege, setSelectedCollege] = useState(null);

  useEffect(() => {
    const savedCollege = localStorage.getItem("selectedCollege");

    if (savedCollege) {
      try {
        setSelectedCollege(JSON.parse(savedCollege));
      } catch (error) {
        console.error("Selected college error:", error);
      }
    }

    setLoadingColleges(false);
  }, []);

  useEffect(() => {
    if (!selectedCollege) {
      setCollegeId("");
      return;
    }

    if (selectedCollege.id) {
      setCollegeId(String(selectedCollege.id));
      return;
    }

    setCollegeId("");
  }, [selectedCollege]);

  const handleMobileChange = (event) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 10);
    setMobile(value);
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!mobile.trim()) {
      setError("Please enter your mobile number.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!collegeId) {
      setError("Please select your college.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            mobile: mobile.trim(),
            password,
            college_id: Number(collegeId),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Registration failed.");
      }

      setMessage("Account created successfully! Redirecting...");

      setName("");
      setEmail("");
      setMobile("");
      setPassword("");
      setCollegeId("");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err.message || "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page app-page-frame">
      <div className="auth-background-shape auth-shape-one"></div>
      <div className="auth-background-shape auth-shape-two"></div>

      <div className="auth-shell">
        <section className="auth-showcase">
          <div className="auth-brand">
            <div className="auth-brand-icon">C</div>
            <span>CampusShare</span>
          </div>

          <div className="auth-showcase-content">
            <div className="auth-pill">
              <Sparkles size={14} />
              Join your campus
            </div>

            <h1>
              Make campus life
              <br />
              <span>more connected.</span>
            </h1>

            <p>
              Create your CampusShare account and discover resources,
              student help, and opportunities around your campus.
            </p>

            <div className="auth-mini-cards">
              <div>
                <strong>01</strong>
                <span>Share resources</span>
              </div>

              <div>
                <strong>02</strong>
                <span>Find what you need</span>
              </div>

              <div>
                <strong>03</strong>
                <span>Connect with students</span>
              </div>
            </div>
          </div>

          <div className="auth-showcase-footer">
            <span>Built for students</span>
            <span>•</span>
            <span>Made for campus life</span>
          </div>
        </section>

        <section className="auth-form-section">
          <div className="auth-form-card">
            {selectedCollege && (
              <button
                type="button"
                className="selected-campus"
                onClick={() => navigate("/")}
              >
                <span className="selected-campus-icon">🎓</span>

                <span>
                  <small>Campus selected</small>
                  <strong>{selectedCollege.name}</strong>
                </span>

                <ArrowRight size={16} />
              </button>
            )}

            <div className="auth-heading">
              <span>Welcome to CampusShare ✨</span>

              <h2>Create your account.</h2>

              <p>
                Join your campus community and start sharing.
              </p>
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-success">
                {message}
              </div>
            )}

            <form
              onSubmit={handleRegister}
              className="auth-form"
            >
              <div className="auth-field">
                <label>
                  Full name
                </label>

                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  disabled={loading}
                  required
                />
              </div>

              <div className="auth-field">
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
                  required
                />
              </div>

              <div className="auth-field">
                <label>
                  Mobile number
                </label>

                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={handleMobileChange}
                  disabled={loading}
                  maxLength={10}
                  required
                />

                <small className="password-hint">
                  Required for payments and student connections
                </small>
              </div>

              <div className="auth-field">
                <label>
                  Password
                </label>

                <div className="auth-password">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
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

                <small className="password-hint">
                  Minimum 6 characters
                </small>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "Creating account..."
                    : "Create my account"}
                </span>

                {!loading && (
                  <ArrowRight size={18} />
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span></span>
              <small>OR</small>
              <span></span>
            </div>

            <button
              type="button"
              className="auth-google"
              onClick={() =>
                alert(
                  "Google signup will be connected later."
                )
              }
              disabled={loading}
            >
              <span className="google-g">G</span>
              Continue with Google
            </button>

            <p className="auth-switch">
              Already have an account?

              <button
                type="button"
                onClick={() => navigate("/login")}
                disabled={loading}
              >
                Login
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Register;