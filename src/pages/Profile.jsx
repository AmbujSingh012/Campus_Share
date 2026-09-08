import {
  ChevronRight,
  Edit3,
  History,
  LogOut,
  Settings,
  UserRound,
  ArrowLeft,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

function Profile() {
  const navigate = useNavigate();

  const savedUser = JSON.parse(localStorage.getItem("user") || "null");

  const [user, setUser] = useState(savedUser);
  const [activeSection, setActiveSection] = useState("profile");

  const [name, setName] = useState(
    savedUser?.name ||
      savedUser?.full_name ||
      savedUser?.username ||
      ""
  );

  const [email, setEmail] = useState(savedUser?.email || "");

  const [notifications, setNotifications] = useState(true);

  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Redirect if user is not logged in
  useEffect(() => {
    if (!savedUser) {
      navigate("/login");
    }
  }, [savedUser, navigate]);

  // Get transaction history from backend
  const getTransactions = async () => {
    try {
      setTransactionsLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        console.error("No authentication token found");
        setTransactions([]);
        return;
      }

      const response = await fetch(
        "http://localhost:3000/api/tasks/transactions/history",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(
          "Transaction history error:",
          data.message
        );
        setTransactions([]);
        return;
      }

      setTransactions(data.transactions || []);
    } catch (error) {
      console.error(
        "Transaction history connection error:",
        error
      );

      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Load transactions whenever Transaction History is opened
  useEffect(() => {
    if (activeSection === "transactions") {
      getTransactions();
    }
  }, [activeSection]);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("campussharePayments");

    navigate("/login");
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      alert("Name and email are required.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:3000/api/auth/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: user.id,
            name: name.trim(),
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "Failed to update profile.");
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setUser(data.user);
      setName(data.user.name);
      setEmail(data.user.email);

      alert("Profile updated successfully!");

      setActiveSection("profile");
    } catch (error) {
      console.error("Profile update error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // If user is not available
  if (!user) {
    return null;
  }

  // TRANSACTION HISTORY
  if (activeSection === "transactions") {
    return (
      <div className="page">
        <Header title="Transaction History" />

        <main className="page-content">
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => setActiveSection("profile")}
          >
            <ArrowLeft size={19} />
            <span>Back to Profile</span>
          </button>

          <h2 style={{ marginTop: "20px" }}>
            Transaction History
          </h2>

          {transactionsLoading ? (
            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
              }}
            >
              <p>Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
              }}
            >
              <History size={40} />
              <p>No transactions yet.</p>
            </div>
          ) : (
            transactions.map((transaction, index) => (
              <div
                key={transaction.id || index}
                style={{
                  padding: "15px",
                  marginTop: "12px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                }}
              >
                <strong>
                  Payment #{transaction.id || index + 1}
                </strong>

                <p>
                  Task:{" "}
                  {transaction.task_title || "Unknown task"}
                </p>

                <p>
                  Reward: ₹
                  {transaction.reward !== null &&
                  transaction.reward !== undefined
                    ? transaction.reward
                    : "0"}
                </p>

                <p>
                  Payment Status:{" "}
                  {transaction.payment_status || "Pending"}
                </p>

                <p>
                  Acceptance Status:{" "}
                  {transaction.status || "Unknown"}
                </p>

                {transaction.payment_transaction_id && (
                  <p
                    style={{
                      wordBreak: "break-all",
                    }}
                  >
                    Transaction ID:{" "}
                    {transaction.payment_transaction_id}
                  </p>
                )}

                {transaction.payment_network && (
                  <p>
                    Network:{" "}
                    {transaction.payment_network}
                  </p>
                )}

                {transaction.payment_amount && (
                  <p>
                    Payment Amount:{" "}
                    {transaction.payment_amount}
                  </p>
                )}

                {transaction.paid_at && (
                  <p>
                    Paid At:{" "}
                    {new Date(
                      transaction.paid_at
                    ).toLocaleString()}
                  </p>
                )}

                {transaction.accepted_at && (
                  <p>
                    Accepted At:{" "}
                    {new Date(
                      transaction.accepted_at
                    ).toLocaleString()}
                  </p>
                )}
              </div>
            ))
          )}
        </main>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  // EDIT PROFILE
  if (activeSection === "edit") {
    return (
      <div className="page">
        <Header title="Edit Profile" />

        <main className="page-content">
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => setActiveSection("profile")}
          >
            <ArrowLeft size={19} />
            <span>Back to Profile</span>
          </button>

          <div style={{ marginTop: "25px" }}>
            <label>Full Name</label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Enter your name"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                marginBottom: "18px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
              }}
            />

            <label>Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                marginBottom: "20px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
              }}
            />

            <button
              type="button"
              className="logout-button"
              onClick={handleSaveProfile}
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </main>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  // SETTINGS
  if (activeSection === "settings") {
    return (
      <div className="page">
        <Header title="Settings" />

        <main className="page-content">
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => setActiveSection("profile")}
          >
            <ArrowLeft size={19} />
            <span>Back to Profile</span>
          </button>

          <div
            className="profile-menu-item"
            style={{ marginTop: "20px" }}
          >
            <Settings size={19} />

            <span>Notifications</span>

            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) =>
                setNotifications(e.target.checked)
              }
            />
          </div>

          <div
            className="profile-menu-item"
            style={{ marginTop: "10px" }}
          >
            <span>Account</span>

            <span
              style={{
                marginLeft: "auto",
              }}
            >
              Active
            </span>
          </div>

          <div
            className="profile-menu-item"
            style={{ marginTop: "10px" }}
          >
            <span>College Account</span>

            <span
              style={{
                marginLeft: "auto",
              }}
            >
              Connected
            </span>
          </div>
        </main>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  const studentName =
    user.name ||
    user.full_name ||
    user.username ||
    "Student";

  const studentEmail =
    user.email || "No email available";

  // MAIN PROFILE
  return (
    <div className="page">
      <Header
        title="Profile"
        showSettings
      />

      <main className="page-content">
        <section className="profile-header">
          <div className="profile-avatar">
            <UserRound size={34} />
          </div>

          <h2>{studentName}</h2>

          <p>{studentEmail}</p>

          <div className="profile-rating">
            ⭐ 4.8
          </div>
        </section>

        <div className="profile-stats">
          <div>
            <strong>5</strong>
            <span>Resources</span>
          </div>

          <div>
            <strong>8</strong>
            <span>Tasks</span>
          </div>

          <div>
            <strong>4.8</strong>
            <span>Rating</span>
          </div>
        </div>

        <div className="profile-menu">
         <button
  type="button"
  className="profile-menu-item"
  onClick={() => navigate("/my-resources")}
>
  <UserRound size={19} />
  <span>My Resources</span>
  <ChevronRight size={17} />
</button>

          <button
            type="button"
            className="profile-menu-item"
            onClick={() =>
              navigate("/tasks")
            }
          >
            <Edit3 size={19} />

            <span>My Tasks</span>

            <ChevronRight size={17} />
          </button>

          <button
            type="button"
            className="profile-menu-item"
            onClick={() =>
              setActiveSection("transactions")
            }
          >
            <History size={19} />

            <span>Transaction History</span>

            <ChevronRight size={17} />
          </button>

          <button
            type="button"
            className="profile-menu-item"
            onClick={() =>
              setActiveSection("edit")
            }
          >
            <Edit3 size={19} />

            <span>Edit Profile</span>

            <ChevronRight size={17} />
          </button>

          <button
            type="button"
            className="profile-menu-item"
            onClick={() =>
              setActiveSection("settings")
            }
          >
            <Settings size={19} />

            <span>Settings</span>

            <ChevronRight size={17} />
          </button>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Logout
        </button>
      </main>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default Profile;