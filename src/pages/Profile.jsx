import {
  ChevronRight,
  Edit3,
  History,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

function Profile() {
  return (
    <div className="page">
      <Header title="Profile" showSettings />

      <main className="page-content">
        <section className="profile-header">
          <div className="profile-avatar">
            <UserRound size={34} />
          </div>

          <h2>Student Name</h2>

          <p>student@email.com</p>

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
          <button className="profile-menu-item">
            <UserRound size={19} />
            <span>My Resources</span>
            <ChevronRight size={17} />
          </button>

          <button className="profile-menu-item">
            <Edit3 size={19} />
            <span>My Tasks</span>
            <ChevronRight size={17} />
          </button>

          <button className="profile-menu-item">
            <History size={19} />
            <span>Transaction History</span>
            <ChevronRight size={17} />
          </button>

          <button className="profile-menu-item">
            <Edit3 size={19} />
            <span>Edit Profile</span>
            <ChevronRight size={17} />
          </button>

          <button className="profile-menu-item">
            <Settings size={19} />
            <span>Settings</span>
            <ChevronRight size={17} />
          </button>
        </div>

        <button className="logout-button">
          <LogOut size={18} />
          Logout
        </button>
      </main>

      <BottomNavigation active="profile" />
    </div>
  );
}

export default Profile;