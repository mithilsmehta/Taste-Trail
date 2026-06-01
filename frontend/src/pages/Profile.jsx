import { API_BASE_URL } from "../utils/api";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const plannerViewPreferenceKey = "tastewisePlannerView";

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email] = useState(user?.email || "");
  const [plannerView, setPlannerView] = useState(() => localStorage.getItem(plannerViewPreferenceKey) || "week");

  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // ⭐⭐⭐ Sync UI whenever user updates ⭐⭐⭐
  useEffect(() => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setPhone(user?.phone || "");
  }, [user]);

  useEffect(() => {
    localStorage.setItem(plannerViewPreferenceKey, plannerView);
  }, [plannerView]);

const handleProfileUpdate = async (e) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}/api/auth/update-profile/${user._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        firstName,
        lastName,
        phone,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to update");
      return;
    }

    // ⭐⭐⭐ UPDATE FRONTEND USER STATE ⭐⭐⭐
    setUser(data.user);                       // <-- Update React state
    localStorage.setItem("user", JSON.stringify(data.user));  // <-- Update localStorage

    alert("Profile updated!");
  } catch (err) {
    console.log(err);
    alert("Something went wrong");
  }
};

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    try {
     await axios.put(
  `${API_BASE_URL}/api/auth/change-password/${user._id}`,
  { password, newPassword },
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }
);

      toast.success("Password changed!");
      setPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error("Error changing password");
    }
  };

  return (
    <>
    <Navbar />
    <div className="container mt-4 mb-5">

      <div className="profile-topbar d-flex justify-content-between align-items-center mt-4 mb-4">
        <button
          className="btn btn-outline-secondary"
          onClick={() => window.location.href = "/home"}
        >
          ← Back to Home
        </button>

        <h2 className="fw-bold text-center flex-grow-1 mb-0">Your Profile</h2>
      </div>

      <div className="row g-4 mt-3">
        {/* LEFT CARD — PROFILE DETAILS */}
        <div className="col-md-6">
          <div className="card shadow p-4">
            <h4 className="fw-semibold mb-3 text-center">Update Info</h4>

            <form onSubmit={handleProfileUpdate}>
              <div className="mb-3">
                <label className="form-label fw-semibold">First Name</label>
                <input
                  className="form-control p-2"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Last Name</label>
                <input
                  className="form-control p-2"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Phone</label>
                <input
                  className="form-control p-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <input className="form-control p-2" value={email} disabled />
              </div>

              <button className="btn btn-warning w-100 fw-semibold">
                Save Changes
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT CARD — PASSWORD CHANGE */}
        <div className="col-md-6">
          <div className="card shadow p-4">
            <h4 className="fw-semibold mb-3 text-center">
              Change Password
            </h4>

            <form onSubmit={handlePasswordChange}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Current Password</label>
                <input
                  type="password"
                  className="form-control p-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">New Password</label>
                <input
                  type="password"
                  className="form-control p-2"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <button className="btn btn-dark w-100 fw-semibold">
                Update Password
              </button>
            </form>
          </div>
        </div>

      </div>

      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="card shadow p-4">
            <h4 className="fw-semibold mb-2">Meal Planner View</h4>
            <p className="text-muted mb-3">
              Choose which planner layout opens by default.
            </p>
            <div className="profile-planner-toggle">
              <button
                type="button"
                className={plannerView === "week" ? "active" : ""}
                onClick={() => setPlannerView("week")}
              >
                📅 7-Day Planner
              </button>
              <button
                type="button"
                className={plannerView === "calendar" ? "active" : ""}
                onClick={() => setPlannerView("calendar")}
              >
                🗓️ Calendar View
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .profile-planner-toggle {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .profile-planner-toggle button {
          background: #fff;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-weight: 800;
          min-height: 56px;
          padding: 12px 14px;
        }

        .profile-planner-toggle button.active {
          background: #fff8e1;
          border-color: #ffc107;
          box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.16);
        }

        @media (max-width: 767.98px) {
          .profile-topbar {
            flex-direction: column;
            align-items: stretch !important;
            gap: 14px;
          }

          .profile-topbar .btn {
            width: 100%;
          }

          .profile-topbar h2 {
            font-size: 1.6rem;
          }

          .card {
            padding: 20px !important;
          }

          .profile-planner-toggle {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
    </>
  );
}
