import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email] = useState(user?.email || "");

  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    try {
     const res = await axios.put(
  `http://localhost:5000/api/auth/update-profile/${user._id}`,
  { firstName, lastName, phone },
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }
);

      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    try {
     await axios.put(
  `http://localhost:5000/api/auth/change-password/${user._id}`,
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
    <div className="container mt-4">

      <div className="row g-4 mt-3">
<div className="container d-flex justify-content-between align-items-center mt-4">
  <button
    className="btn btn-outline-secondary"
    onClick={() => window.location.href = "/home"}
  >
    ← Back to Home
  </button>

  <h2 className="fw-bold text-center flex-grow-1">Your Profile</h2>
</div>
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
    </div>
  );
}