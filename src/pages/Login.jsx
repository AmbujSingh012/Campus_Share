import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Login() {

  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  const handleLogin = (e) => {

    e.preventDefault();

    // Temporary frontend login
    // Backend authentication will be added later.

    if (email && password) {
      navigate("/home");
    } else {
      alert("Please enter email and password");
    }
  };


  const handleGoogleLogin = () => {
    alert("Google login will be connected later.");
  };


  const handleSignup = () => {
    alert("Registration page will be added later.");
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
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
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
              >
                Forgot Password?
              </button>

            </div>


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="primary-button"
            >
              Login
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
          >
            Continue with Google
          </button>


          {/* SIGN UP */}

          <div className="signup-text">

            Don't have an account?{" "}

            <button onClick={handleSignup}>
              Sign Up
            </button>

          </div>


        </div>

      </div>

    </div>
  );
}

export default Login;