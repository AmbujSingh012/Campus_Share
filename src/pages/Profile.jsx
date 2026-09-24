import API_BASE_URL from "../api";
import {
  ArrowLeft,
  ChevronRight,
  Edit3,
  History,
  LogOut,
  Settings,
  UserRound,
  Save,
  Wallet,
  Bell,
  ShieldCheck,
  GraduationCap,
  Package,
  ListTodo,
  Star,
  CreditCard,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNavigation from "../components/BottomNavigation";
import "./Profile.css";
import {
  connectPeraWallet,
  reconnectPeraWallet,
} from "../utils/peraX402";

function Profile() {
  const navigate = useNavigate();

  const savedUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const [user, setUser] = useState(savedUser);
  const [activeSection, setActiveSection] = useState("profile");

  const [name, setName] = useState(
    savedUser?.name ||
      savedUser?.full_name ||
      savedUser?.username ||
      ""
  );

  const [email, setEmail] = useState(savedUser?.email || "");
  const [mobile, setMobile] = useState(savedUser?.mobile || "");
const [upiId, setUpiId] = useState(savedUser?.upi_id || "");

  const [walletAddress, setWalletAddress] = useState(
    savedUser?.wallet_address || ""
  );

  const [walletConnecting, setWalletConnecting] =
    useState(false);

  const [notifications, setNotifications] = useState(true);

  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] =
    useState(false);

  useEffect(() => {
    if (!savedUser) {
      navigate("/login");
    }
  }, [savedUser, navigate]);

  const getProfile = async () => {
    try {
      if (!savedUser?.id) return;

      const response = await fetch(
        `${API_BASE_URL}/api/profile/${savedUser.id}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(
          "Profile fetch error:",
          data.message
        );
        return;
      }

      setUser((prev) => ({
        ...prev,
        ...data.profile,
      }));
    } catch (error) {
      console.error(
        "Profile connection error:",
        error
      );
    }
  };

  useEffect(() => {
    if (savedUser?.id) {
      getProfile();
    }
  }, [savedUser?.id]);

  const getTransactions = async () => {
    try {
      setTransactionsLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        setTransactions([]);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/tasks/transactions/history`,
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

  useEffect(() => {
    if (activeSection === "transactions") {
      getTransactions();
    }
  }, [activeSection]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("campussharePayments");

    navigate("/login");
  };

  const handleConnectWallet = async () => {
    try {
      setWalletConnecting(true);

      let address = await connectPeraWallet();

      if (!address) {
        address = await reconnectPeraWallet();
      }

      if (!address) {
        alert("Pera Wallet connection failed.");
        return;
      }

      setWalletAddress(address);
      alert("Pera Wallet connected successfully!");
    } catch (error) {
      console.error("Pera Wallet error:", error);

      alert(
        error.message ||
          "Failed to connect Pera Wallet."
      );
    } finally {
      setWalletConnecting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      alert("Name and email are required.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/auth/profile`,
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
            mobile: mobile.trim() || null,
            upi_id: upiId.trim() || null,
            wallet_address: walletAddress || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Failed to update profile."
        );
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setUser(data.user);
      setName(data.user.name);
      setEmail(data.user.email);
      setMobile(data.user.mobile || "");
      setUpiId(data.user.upi_id || "");
      setWalletAddress(
        data.user.wallet_address || ""
      );

      alert("Profile updated successfully!");

      setActiveSection("profile");
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  if (!user) {
    return null;
  }

  const studentName =
    user.name ||
    user.full_name ||
    user.username ||
    "Student";

  const studentEmail =
    user.email || "No email available";

  const selectedCollege = JSON.parse(
    localStorage.getItem("selectedCollege") || "null"
  );

  const collegeName =
    selectedCollege?.name ||
    "Your Campus";

  const rating =
  user.averageRating > 0
    ? Number(user.averageRating).toFixed(1)
    : "—";

const ratingCount = Number(user.ratingCount || 0);

  if (activeSection === "transactions") {
    return (
      <div className="profile-modern-page app-page-frame">
        <div className="profile-modern-shell">
          <header className="profile-modern-topbar">
            <button
              type="button"
              className="profile-modern-back"
              onClick={() =>
                setActiveSection("profile")
              }
            >
              <ArrowLeft size={20} />
            </button>

            <div className="profile-modern-top-title">
              Transaction History
            </div>

            <div className="profile-modern-top-space" />
          </header>

          <main className="profile-modern-content">
            <section className="profile-page-heading">
              <span className="profile-eyebrow">
                YOUR ACTIVITY
              </span>

              <h1>
                Money moves
                <span> at a glance.</span>
              </h1>

              <p>
                Track task payments, rewards and
                completed transactions.
              </p>
            </section>

            {transactionsLoading ? (
              <div className="profile-empty-card">
                <div className="profile-empty-icon">
                  <History size={26} />
                </div>

                <strong>
                  Loading transactions...
                </strong>
              </div>
            ) : transactions.length === 0 ? (
              <div className="profile-empty-card">
                <div className="profile-empty-icon">
                  <CreditCard size={27} />
                </div>

                <strong>
                  No transactions yet
                </strong>

                <span>
                  Your task payments will appear
                  here after you start using
                  CampusShare.
                </span>
              </div>
            ) : (
              <div className="profile-transactions">
                {transactions.map(
                  (transaction, index) => (
                    <article
                      className="profile-transaction-card"
                      key={
                        transaction.id || index
                      }
                    >
                      <div className="profile-transaction-top">
                        <div className="profile-transaction-icon">
                          <CreditCard size={20} />
                        </div>

                        <div>
                          <strong>
                            Payment #
                            {transaction.id ||
                              index + 1}
                          </strong>

                          <span>
                            {transaction.task_title ||
                              "Campus task"}
                          </span>
                        </div>

                        <span className="profile-status-pill">
                          {transaction.payment_status ||
                            "Pending"}
                        </span>
                      </div>

                      <div className="profile-transaction-grid">
                        <div>
                          <span>Reward</span>
                          <strong>
  ₹{Number(transaction.reward ?? 0).toFixed(2)}
</strong>
                        </div>

                        <div>
                          <span>Acceptance</span>
                          <strong>
                            {transaction.status ||
                              "Unknown"}
                          </strong>
                        </div>
                      </div>

                      {transaction.payment_transaction_id && (
                        <div className="profile-tx-id">
                          <span>
                            Transaction ID
                          </span>

                          <strong>
                            {
                              transaction.payment_transaction_id
                            }
                          </strong>
                        </div>
                      )}

                      {transaction.payment_network && (
                        <div className="profile-tx-meta">
                          Network:{" "}
                          {transaction.payment_network}
                        </div>
                      )}

                      {transaction.paid_at && (
                        <div className="profile-tx-meta">
                          Paid:{" "}
                          {new Date(
                            transaction.paid_at
                          ).toLocaleString()}
                        </div>
                      )}

                      {transaction.accepted_at && (
                        <div className="profile-tx-meta">
                          Accepted:{" "}
                          {new Date(
                            transaction.accepted_at
                          ).toLocaleString()}
                        </div>
                      )}
                    </article>
                  )
                )}
              </div>
            )}
          </main>
        </div>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  if (activeSection === "edit") {
    return (
      <div className="profile-modern-page">
        <div className="profile-modern-shell">
          <header className="profile-modern-topbar">
            <button
              type="button"
              className="profile-modern-back"
              onClick={() =>
                setActiveSection("profile")
              }
            >
              <ArrowLeft size={20} />
            </button>

            <div className="profile-modern-top-title">
              Edit Profile
            </div>

            <div className="profile-modern-top-space" />
          </header>

          <main className="profile-modern-content">
            <section className="profile-page-heading">
              <span className="profile-eyebrow">
                YOUR IDENTITY
              </span>

              <h1>
                Make it
                <span> yours.</span>
              </h1>

              <p>
                Keep your CampusShare profile
                information up to date.
              </p>
            </section>

            <section className="profile-edit-card">
              <div className="profile-edit-avatar">
                <UserRound size={32} />
              </div>

              <div className="profile-form-grid">
                <div className="profile-form-field full">
                  <label>Full name</label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Enter your name"
                  />
                </div>

                <div className="profile-form-field">
                  <label>Email</label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="Enter your email"
                  />
                </div>

                <div className="profile-form-field">
                  <label>Mobile number</label>

                  <input
                    type="tel"
                    value={mobile}
                    onChange={(event) =>
                      setMobile(
                        event.target.value
                      )
                    }
                    placeholder="Enter your mobile"
                  />
                </div>

                <div className="profile-form-field">
                  <label>UPI ID</label>

                  <input
                    type="text"
                    value={upiId}
                    onChange={(event) =>
                      setUpiId(event.target.value)
                    }
                    placeholder="example@upi"
                  />
                </div>
              </div>
            </section>

            <section className="profile-wallet-card">
              <div className="profile-wallet-heading">
                <div className="profile-wallet-icon">
                  <Wallet size={21} />
                </div>

                <div>
                  <strong>
                    Pera Wallet
                  </strong>

                  <span>
                    Connect your Algorand wallet
                    for CampusShare payments.
                  </span>
                </div>
              </div>

              {walletAddress ? (
                <>
                  <div className="profile-wallet-address">
                    {walletAddress}
                  </div>

                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={
                      handleConnectWallet
                    }
                    disabled={walletConnecting}
                  >
                    {walletConnecting
                      ? "Connecting..."
                      : "Change wallet"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="profile-wallet-connect"
                  onClick={
                    handleConnectWallet
                  }
                  disabled={walletConnecting}
                >
                  <Wallet size={18} />

                  {walletConnecting
                    ? "Connecting..."
                    : "Connect Pera Wallet"}
                </button>
              )}
            </section>

            <button
              type="button"
              className="profile-save-button"
              onClick={handleSaveProfile}
            >
              <Save size={18} />
              Save changes
            </button>
          </main>
        </div>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  if (activeSection === "settings") {
    return (
      <div className="profile-modern-page">
        <div className="profile-modern-shell">
          <header className="profile-modern-topbar">
            <button
              type="button"
              className="profile-modern-back"
              onClick={() =>
                setActiveSection("profile")
              }
            >
              <ArrowLeft size={20} />
            </button>

            <div className="profile-modern-top-title">
              Settings
            </div>

            <div className="profile-modern-top-space" />
          </header>

          <main className="profile-modern-content">
            <section className="profile-page-heading">
              <span className="profile-eyebrow">
                PREFERENCES
              </span>

              <h1>
                Your space,
                <span> your rules.</span>
              </h1>

              <p>
                Manage notifications and account
                connections.
              </p>
            </section>

            <section className="profile-settings-card">
              <div className="profile-setting-row">
                <div className="profile-setting-icon">
                  <Bell size={19} />
                </div>

                <div className="profile-setting-copy">
                  <strong>Notifications</strong>

                  <span>
                    Stay updated about tasks,
                    resources and payments.
                  </span>
                </div>

                <button
                  type="button"
                  className={
                    notifications
                      ? "profile-toggle active"
                      : "profile-toggle"
                  }
                  onClick={() =>
                    setNotifications(
                      !notifications
                    )
                  }
                >
                  <span />
                </button>
              </div>

              <div className="profile-setting-row">
                <div className="profile-setting-icon">
                  <ShieldCheck size={19} />
                </div>

                <div className="profile-setting-copy">
                  <strong>Account</strong>

                  <span>
                    Your CampusShare account is
                    active.
                  </span>
                </div>

                <span className="profile-connected">
                  Active
                </span>
              </div>

              <div className="profile-setting-row">
                <div className="profile-setting-icon">
                  <GraduationCap size={19} />
                </div>

                <div className="profile-setting-copy">
                  <strong>
                    College account
                  </strong>

                  <span>
                    Currently connected to{" "}
                    {collegeName}.
                  </span>
                </div>

                <span className="profile-connected">
                  Connected
                </span>
              </div>
            </section>

            <button
              type="button"
              className="profile-switch-campus"
              onClick={() => navigate("/")}
            >
              Switch campus
              <ChevronRight size={18} />
            </button>
          </main>
        </div>

        <BottomNavigation active="profile" />
      </div>
    );
  }

  return (
    <div className="profile-modern-page">
      <div className="profile-modern-shell">
        <header className="profile-modern-topbar">
          <button
            type="button"
            className="profile-modern-back"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="profile-modern-campus">
            <span className="profile-campus-dot" />
            {collegeName}
          </div>

          <button
            type="button"
            className="profile-settings-button"
            onClick={() =>
              setActiveSection("settings")
            }
          >
            <Settings size={19} />
          </button>
        </header>

        <main className="profile-modern-content">
          <section className="profile-hero">
            <div className="profile-hero-top">
              <div className="profile-big-avatar">
                <UserRound size={40} />
              </div>

              <div className="profile-hero-info">
                <span className="profile-eyebrow">
                  CAMPUS MEMBER
                </span>

                <h1>{studentName}</h1>

                <p>{studentEmail}</p>
              </div>

              <button
                type="button"
                className="profile-edit-icon"
                onClick={() =>
                  setActiveSection("edit")
                }
                aria-label="Edit profile"
              >
                <Edit3 size={18} />
              </button>
            </div>

            <div className="profile-campus-badge">
              <GraduationCap size={15} />
              <span>{collegeName}</span>
            </div>

            <div className="profile-rating-line">
              <div>
                <Star size={15} fill="currentColor" />
                <strong>{rating}</strong>
                <span>
  {ratingCount > 0
    ? `based on ${ratingCount} ${
        ratingCount === 1 ? "rating" : "ratings"
      }`
    : "No ratings yet"}
</span>
              </div>

              <span className="profile-verified">
                <ShieldCheck size={14} />
                Verified student
              </span>
            </div>
          </section>

          <section className="profile-stats-modern">
            <div>
              <Package size={18} />
              <strong>
                {user.postedResources || 0}
              </strong>
              <span>Resources</span>
            </div>

            <div>
              <ListTodo size={18} />
              <strong>
                {user.postedTasks || 0}
              </strong>
              <span>Tasks</span>
            </div>

            <div>
              <Star size={18} />
              <strong>{rating}</strong>
              <span>Rating</span>
            </div>
          </section>

          <section className="profile-menu-modern">
            <div className="profile-menu-label">
              YOUR CAMPUS ACTIVITY
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/my-resources")
              }
            >
              <div className="profile-menu-icon blue">
                <Package size={19} />
              </div>

              <div className="profile-menu-copy">
                <strong>My Resources</strong>
                <span>
                  Manage what you have shared
                </span>
              </div>

              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/my-tasks")
              }
            >
              <div className="profile-menu-icon purple">
                <ListTodo size={19} />
              </div>

              <div className="profile-menu-copy">
                <strong>My Tasks</strong>
                <span>
                  See tasks you have posted
                </span>
              </div>

              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "transactions"
                )
              }
            >
              <div className="profile-menu-icon green">
                <History size={19} />
              </div>

              <div className="profile-menu-copy">
                <strong>
                  Transaction History
                </strong>

                <span>
                  View your payment activity
                </span>
              </div>

              <ChevronRight size={18} />
            </button>
          </section>

          <section className="profile-menu-modern">
            <div className="profile-menu-label">
              ACCOUNT
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveSection("edit")
              }
            >
              <div className="profile-menu-icon orange">
                <Edit3 size={19} />
              </div>

              <div className="profile-menu-copy">
                <strong>Edit Profile</strong>
                <span>
                  Update your personal details
                </span>
              </div>

              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveSection("settings")
              }
            >
              <div className="profile-menu-icon slate">
                <Settings size={19} />
              </div>

              <div className="profile-menu-copy">
                <strong>Settings</strong>
                <span>
                  Notifications and account
                  preferences
                </span>
              </div>

              <ChevronRight size={18} />
            </button>
          </section>

          <button
            type="button"
            className="profile-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </main>
      </div>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default Profile;
