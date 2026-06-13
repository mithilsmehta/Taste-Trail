import { apiUrl } from "../utils/api";
import { useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";
import "../styles/auth.css";

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
const dietaryOptions = ["Diet", "Veg", "Vegan"];
const servingOptions = Array.from({ length: 10 }, (_, index) => index + 1);

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPass: "",
  gender: "",
  ethnicity: "",
  dietaryPreference: "",
  usualServings: 2,
  healthyGoal: 50,
  heightCm: "",
  weightKg: ""
};

const splitName = (fullName) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ") || firstName;
  return { firstName, lastName };
};

const calculateBmi = (heightCm, weightKg) => {
  const height = Number(heightCm);
  const weight = Number(weightKg);
  if (!height || !weight) return "";

  const bmi = weight / ((height / 100) ** 2);
  return Number(bmi.toFixed(1));
};

const getBmiLabel = (bmi) => {
  if (!bmi) return "Enter height and weight";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight";
  return "Obese range";
};

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const bmi = useMemo(() => calculateBmi(form.heightCm, form.weightKg), [form.heightCm, form.weightKg]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateAccountStep = () => {
    if (!form.fullName.trim() || !form.phone.trim() || !form.email.trim() || !form.password || !form.confirmPass) {
      toast.error("Please fill all account details");
      return false;
    }

    if (form.password !== form.confirmPass) {
      toast.error("Passwords do not match!");
      return false;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }

    return true;
  };

  const validateKnowYouStep = () => {
    if (!form.gender || !form.ethnicity || !form.dietaryPreference || !form.usualServings) {
      toast.error("Please complete all personal details");
      return false;
    }

    return true;
  };

  const validateHealthStep = () => {
    if (!form.heightCm || !form.weightKg) {
      toast.error("Please enter height and weight");
      return false;
    }

    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateAccountStep()) return;
    if (step === 2 && !validateKnowYouStep()) return;
    setStep((current) => Math.min(current + 1, 3));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateHealthStep()) return;

    const { firstName, lastName } = splitName(form.fullName);

    setSubmitting(true);
    try {
      await axios.post(apiUrl("/api/auth/register"), {
        firstName,
        lastName,
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        onboarding: {
          gender: form.gender,
          ethnicity: form.ethnicity,
          dietaryPreference: form.dietaryPreference,
          usualServings: Number(form.usualServings) || 2,
          healthyGoal: Number(form.healthyGoal),
          heightCm: Number(form.heightCm),
          weightKg: Number(form.weightKg),
          bmi
        }
      });

      toast.success("Account created!");
      window.location.href = "/login";
    } catch (err) {
      toast.error(err.response?.data?.msg || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-stepper" aria-label="Signup progress">
        {[1, 2, 3].map((item) => (
          <span key={item} className={step >= item ? "active" : ""} />
        ))}
      </div>

      {step === 1 && (
        <>
          <h2 className="auth-title text-center">Create Your Account</h2>
          <p className="auth-subtitle text-center">Join Tastewise today!</p>

          <form onSubmit={(e) => { e.preventDefault(); goNext(); }}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Name</label>
              <input
                className="form-control auth-input"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Phone Number</label>
              <input
                type="tel"
                className="form-control auth-input"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control auth-input"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Password</label>
              <input
                type="password"
                className="form-control auth-input"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Re-enter Password</label>
              <input
                type="password"
                className="form-control auth-input"
                value={form.confirmPass}
                onChange={(e) => updateField("confirmPass", e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-gradient">Next</button>

            <div className="text-center mt-3">
              <a href="/login" className="auth-link">
                Already Registered? Login
              </a>
            </div>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="auth-title text-center">Help Us Know You Better</h2>
          <p className="auth-subtitle text-center">This helps Tastewise personalize your recipes.</p>

          <form onSubmit={(e) => { e.preventDefault(); goNext(); }}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Your preferred gender?</label>
              <select
                className="form-select auth-input"
                value={form.gender}
                onChange={(e) => updateField("gender", e.target.value)}
                required
              >
                <option value="">Select gender</option>
                {genderOptions.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Tell us about your ethnicity</label>
              <select
                className="form-select auth-input"
                value={form.ethnicity}
                onChange={(e) => updateField("ethnicity", e.target.value)}
                required
              >
                <option value="">Select state</option>
                {indianStates.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Dietary preference</label>
              <select
                className="form-select auth-input"
                value={form.dietaryPreference}
                onChange={(e) => updateField("dietaryPreference", e.target.value)}
                required
              >
                <option value="">Select preference</option>
                {dietaryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">How many people do you usually cook for?</label>
              <select
                className="form-select auth-input"
                value={form.usualServings}
                onChange={(e) => updateField("usualServings", e.target.value)}
                required
              >
                {servingOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="auth-actions-row">
              <button type="button" className="btn-auth-secondary" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="btn-gradient">Next</button>
            </div>
          </form>
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="auth-title text-center">Would You Like To Be Healthy?</h2>
          <p className="auth-subtitle text-center">Set your health preference and body details.</p>

          <form onSubmit={handleRegister}>
            <div className="health-meter-wrap mb-4">
              <div className="health-meter-labels health-meter-icons">
                <span
                  className={`health-heart health-heart-broken ${Number(form.healthyGoal) < 30 ? "active" : ""}`}
                  aria-label="Unhealthy"
                  title="Unhealthy"
                >
                  💔
                </span>
                <strong>{form.healthyGoal}%</strong>
                <span
                  className={`health-heart health-heart-full ${Number(form.healthyGoal) > 70 ? "active" : ""}`}
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
                value={form.healthyGoal}
                onChange={(e) => updateField("healthyGoal", e.target.value)}
                className="health-meter"
              />
            </div>

            <div className="row">
              <div className="col-12 col-sm-6 mb-3">
                <label className="form-label fw-semibold">Height (cm)</label>
                <input
                  type="number"
                  min="60"
                  max="260"
                  className="form-control auth-input"
                  value={form.heightCm}
                  onChange={(e) => updateField("heightCm", e.target.value)}
                  required
                />
              </div>

              <div className="col-12 col-sm-6 mb-3">
                <label className="form-label fw-semibold">Weight (kg)</label>
                <input
                  type="number"
                  min="20"
                  max="350"
                  className="form-control auth-input"
                  value={form.weightKg}
                  onChange={(e) => updateField("weightKg", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="bmi-card mb-3">
              <span>BMI</span>
              <strong>{bmi || "--"}</strong>
              <small>{getBmiLabel(bmi)}</small>
            </div>

            <div className="auth-actions-row">
              <button type="button" className="btn-auth-secondary" onClick={() => setStep(2)}>Back</button>
              <button type="submit" className="btn-gradient" disabled={submitting}>
                {submitting ? "Creating..." : "Final Signup"}
              </button>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
