import { API_BASE_URL } from "../utils/api";
import { useCallback, useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { foodPreferenceOptions, getFoodPreferenceLabel } from "../utils/foodPreference";
import { formatPremiumDate, getSubscription } from "../utils/subscription";

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

const genderOptions = ["Female", "Male"];
const servingOptions = Array.from({ length: 10 }, (_, index) => index + 1);

const calculateBmi = (heightCm, weightKg) => {
  const height = Number(heightCm);
  const weight = Number(weightKg);
  if (!height || !weight) return "";
  return Number((weight / ((height / 100) ** 2)).toFixed(1));
};

const getStoredFoodPreference = (profileUser = {}) =>
  getFoodPreferenceLabel(
    profileUser?.onboarding?.foodPreference ||
    profileUser?.onboarding?.dietaryPreference ||
    profileUser?.preferences?.diet ||
    "Veg"
  );

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const plannerViewPreferenceKey = "tastewisePlannerView";
  const userOnboarding = user?.onboarding || {};

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email] = useState(user?.email || "");
  const [plannerView, setPlannerView] = useState(() => localStorage.getItem(plannerViewPreferenceKey) || "week");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [onboarding, setOnboarding] = useState({
    gender: userOnboarding.gender || "",
    ethnicity: userOnboarding.ethnicity || "",
    foodPreference: getStoredFoodPreference(user),
    usualServings: userOnboarding.usualServings || 2,
    healthyGoal: userOnboarding.healthyGoal ?? 50,
    heightCm: userOnboarding.heightCm || "",
    weightKg: userOnboarding.weightKg || ""
  });

  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const syncProfileFields = useCallback((profileUser = user) => {
    setFirstName(profileUser?.firstName || "");
    setLastName(profileUser?.lastName || "");
    setPhone(profileUser?.phone || "");
    setOnboarding({
      gender: profileUser?.onboarding?.gender || "",
      ethnicity: profileUser?.onboarding?.ethnicity || "",
      foodPreference: getStoredFoodPreference(profileUser),
      usualServings: profileUser?.onboarding?.usualServings || 2,
      healthyGoal: profileUser?.onboarding?.healthyGoal ?? 50,
      heightCm: profileUser?.onboarding?.heightCm || "",
      weightKg: profileUser?.onboarding?.weightKg || ""
    });
  }, [user]);

  // ⭐⭐⭐ Sync UI whenever user updates ⭐⭐⭐
  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      syncProfileFields(user);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [syncProfileFields, user]);

  useEffect(() => {
    localStorage.setItem(plannerViewPreferenceKey, plannerView);
  }, [plannerView]);

const handleProfileUpdate = async (e) => {
  e.preventDefault();
  const bmi = calculateBmi(onboarding.heightCm, onboarding.weightKg);

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
        onboarding: {
          ...onboarding,
          foodPreference: onboarding.foodPreference,
          dietaryPreference: onboarding.foodPreference,
          usualServings: Number(onboarding.usualServings) || 2,
          healthyGoal: Number(onboarding.healthyGoal),
          heightCm: onboarding.heightCm ? Number(onboarding.heightCm) : null,
          weightKg: onboarding.weightKg ? Number(onboarding.weightKg) : null,
          bmi
        }
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
    setIsEditingInfo(false);

    alert("Profile updated!");
  } catch (err) {
    console.log(err);
    alert("Something went wrong");
  }
};

  const updateOnboarding = (field, value) => {
    setOnboarding((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditToggle = () => {
    if (isEditingInfo) {
      syncProfileFields(user);
    }

    setIsEditingInfo((current) => !current);
  };

  const bmi = calculateBmi(onboarding.heightCm, onboarding.weightKg);
  const subscription = getSubscription(user);

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
      console.error(err);
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
            <div className="profile-card-title-row mb-3">
              <h4 className="fw-semibold mb-0">Update Info</h4>
              <button
                type="button"
                className={`btn btn-sm ${isEditingInfo ? "btn-outline-secondary" : "btn-outline-warning"}`}
                onClick={handleEditToggle}
              >
                {isEditingInfo ? "Cancel" : "Edit"}
              </button>
            </div>

            <form onSubmit={handleProfileUpdate}>
              <div className="mb-3">
                <label className="form-label fw-semibold">First Name</label>
                <input
                  className="form-control p-2"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!isEditingInfo}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Last Name</label>
                <input
                  className="form-control p-2"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!isEditingInfo}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Phone</label>
                <input
                  className="form-control p-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditingInfo}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <input className="form-control p-2" value={email} disabled />
              </div>

              <div className="row">
                <div className="col-12 col-sm-6 mb-3">
                  <label className="form-label fw-semibold">Gender</label>
                  <select
                    className="form-select p-2"
                    value={onboarding.gender}
                    onChange={(e) => updateOnboarding("gender", e.target.value)}
                    disabled={!isEditingInfo}
                  >
                    <option value="">Select gender</option>
                    {genderOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-sm-6 mb-3">
                  <label className="form-label fw-semibold">Food Preference</label>
                  <select
                    className="form-select p-2"
                    value={onboarding.foodPreference}
                    onChange={(e) => updateOnboarding("foodPreference", e.target.value)}
                    disabled={!isEditingInfo}
                  >
                    <option value="">Select preference</option>
                    {foodPreferenceOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">How many people do you usually cook for?</label>
                <select
                  className="form-select p-2"
                  value={onboarding.usualServings}
                  onChange={(e) => updateOnboarding("usualServings", e.target.value)}
                  disabled={!isEditingInfo}
                >
                  {servingOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Ethnicity</label>
                <select
                  className="form-select p-2"
                  value={onboarding.ethnicity}
                  onChange={(e) => updateOnboarding("ethnicity", e.target.value)}
                  disabled={!isEditingInfo}
                >
                  <option value="">Select state</option>
                  {indianStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div className="profile-health-box mb-3">
                <div className="profile-health-labels profile-health-icons">
                  <span
                    className={`profile-health-heart profile-health-heart-broken ${Number(onboarding.healthyGoal) < 30 ? "active" : ""}`}
                    aria-label="Unhealthy"
                    title="Unhealthy"
                  >
                    💔
                  </span>
                  <strong>{onboarding.healthyGoal}%</strong>
                  <span
                    className={`profile-health-heart profile-health-heart-full ${Number(onboarding.healthyGoal) > 70 ? "active" : ""}`}
                    aria-label="Healthy"
                    title="Healthy"
                  >
                    ❤️
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={onboarding.healthyGoal}
                  onChange={(e) => updateOnboarding("healthyGoal", e.target.value)}
                  className="w-100"
                  disabled={!isEditingInfo}
                />
              </div>

              <div className="row">
                <div className="col-12 col-sm-4 mb-3">
                  <label className="form-label fw-semibold">Height (cm)</label>
                  <input
                    type="number"
                    className="form-control p-2"
                    value={onboarding.heightCm}
                    onChange={(e) => updateOnboarding("heightCm", e.target.value)}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div className="col-12 col-sm-4 mb-3">
                  <label className="form-label fw-semibold">Weight (kg)</label>
                  <input
                    type="number"
                    className="form-control p-2"
                    value={onboarding.weightKg}
                    onChange={(e) => updateOnboarding("weightKg", e.target.value)}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div className="col-12 col-sm-4 mb-3">
                  <label className="form-label fw-semibold">BMI</label>
                  <input className="form-control p-2 fw-bold" value={bmi || "--"} disabled />
                </div>
              </div>

              {isEditingInfo && (
                <button className="btn btn-warning w-100 fw-semibold">
                  Save Changes
                </button>
              )}
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
            <div className="profile-premium-card">
              <div>
                <h4 className="fw-semibold mb-1">Tastewise Premium</h4>
                <p className="text-muted mb-0">
                  {subscription.isPremium
                    ? `Premium is active${subscription.plan ? ` on ${subscription.plan.replace(/_/g, " ")}` : ""}${subscription.premiumExpiresAt ? ` until ${formatPremiumDate(subscription.premiumExpiresAt)}` : ""}. Ads are hidden for your account.`
                    : "Free account. Premium will remove ads and unlock more cooking tools."}
                </p>
              </div>
              <Link to="/premium">
                {subscription.isPremium ? "View Plan" : "View Premium"}
              </Link>
            </div>
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

      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="card shadow p-4">
            <h4 className="fw-semibold mb-2">Legal & Support</h4>
            <p className="text-muted mb-3">
              App information, privacy details, and support pages.
            </p>
            <div className="profile-legal-links">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/about">About</Link>
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

        .profile-premium-card {
          align-items: center;
          display: flex;
          gap: 16px;
          justify-content: space-between;
        }

        .profile-premium-card a {
          background: var(--tw-sage);
          border-radius: 999px;
          color: #fff;
          flex: 0 0 auto;
          font-weight: 900;
          padding: 11px 16px;
          text-decoration: none;
        }

        .profile-legal-links {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .profile-legal-links a {
          background: var(--tw-surface);
          border: 1px solid var(--tw-border);
          border-radius: 999px;
          color: var(--tw-sage);
          font-weight: 850;
          padding: 10px 14px;
          text-decoration: none;
        }

        .profile-legal-links a:hover {
          background: var(--tw-sage-soft);
          color: var(--tw-sage);
        }

        .profile-card-title-row {
          align-items: center;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .profile-health-box {
          background: var(--tw-sage-soft);
          border: 1px solid rgba(95, 143, 103, 0.32);
          border-radius: 12px;
          padding: 14px;
        }

        .profile-health-labels {
          align-items: center;
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .profile-health-labels strong {
          color: #198754;
        }

        .profile-health-icons {
          margin-bottom: 10px;
        }

        .profile-health-heart {
          filter: grayscale(1);
          font-size: 1.75rem;
          line-height: 1;
          opacity: 0.35;
          transform: scale(0.94);
          transition: filter 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
        }

        .profile-health-heart.active {
          filter: saturate(1.6) drop-shadow(0 0 9px rgba(255, 71, 87, 0.58));
          opacity: 1;
          transform: scale(1.14);
        }

        .profile-health-heart-full.active {
          filter: saturate(1.7) drop-shadow(0 0 10px rgba(220, 53, 69, 0.62));
        }

        .profile-health-heart-broken.active {
          filter: saturate(1.7) drop-shadow(0 0 10px rgba(255, 54, 54, 0.62));
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
          background: var(--tw-sage-soft);
          border-color: var(--tw-sage);
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

          .profile-premium-card {
            align-items: stretch;
            display: grid;
          }

          .profile-premium-card a {
            text-align: center;
          }

          .profile-legal-links {
            display: grid;
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
    </>
  );
}
