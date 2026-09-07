import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [collegeId, setCollegeId] = useState("");

  const [colleges, setColleges] = useState([]);

  const [loadingColleges, setLoadingColleges] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /*
  ========================================
  LOAD COLLEGES
  ========================================
  */

  useEffect(() => {
    async function loadColleges() {
      try {
        /*
          For now, these colleges match
          your database.
        */

        setColleges([
          {
            id: 1,
            name: "IIT Delhi",
          },
          {
            id: 2,
            name: "IIT Bombay",
          },
          {
            id: 3,
            name: "NIT Delhi",
          },
        ]);
      } catch (err) {
        console.error("College loading error:", err);

        setError("Unable to load colleges.");
      } finally {
        setLoadingColleges(false);
      }
    }

    loadColleges();
  }, []);

  /*
  ========================================
  REGISTER
  ========================================
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    // Validate name
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    // Validate email
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    // Validate password
    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Validate college
    if (!collegeId) {
      setError("Please select your college.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            college_id: Number(collegeId),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Registration failed."
        );
      }

      setMessage(
        "Registration successful! Redirecting to login..."
      );

      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setCollegeId("");

      // Go to login
      setTimeout(() => {
        navigate("/login");
      }, 1000);

    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err.message ||
          "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <main className="page-content">
        <div
          style={{
            maxWidth: "500px",
            margin: "40px auto",
            padding: "20px",
          }}
        >
          <h2>Create Account</h2>

          <p>
            Register for CampusShare
          </p>

          {message && (
            <p
              style={{
                color: "green",
                fontWeight: "600",
              }}
            >
              {message}
            </p>
          )}

          {error && (
            <p
              style={{
                color: "red",
                fontWeight: "600",
              }}
            >
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit}>

            {/* Name */}
            <div style={{ marginBottom: "15px" }}>
              <label>
                Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Enter your name"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: "15px" }}>
              <label>
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="example@gmail.com"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "15px" }}>
              <label>
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter password"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            {/* College */}
            <div style={{ marginBottom: "15px" }}>
              <label>
                College
              </label>

              <select
                value={collegeId}
                onChange={(e) =>
                  setCollegeId(e.target.value)
                }
                disabled={loadingColleges}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              >
                <option value="">
                  {loadingColleges
                    ? "Loading colleges..."
                    : "Select your college"}
                </option>

                {colleges.map((college) => (
                  <option
                    key={college.id}
                    value={college.id}
                  >
                    {college.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Register button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Registering..."
                : "Register"}
            </button>
          </form>

          <p style={{ marginTop: "20px" }}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Login
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Register;