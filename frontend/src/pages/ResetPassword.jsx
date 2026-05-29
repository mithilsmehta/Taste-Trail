import { apiUrl } from "../utils/api";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import AnimatedWrapper from "../components/AnimatedWrapper";
import FormInput from "../components/FormInput";
import { motion } from "framer-motion";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pass1 !== pass2) {
      toast.error("Passwords do not match!");
      return;
    }

    if (pass1.length < 6) {
      toast.error("Password must be at least 6 characters!");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(apiUrl("/api/auth/reset-password"), {
        token,
        newPassword: pass1
      });

      toast.success("Password reset successfully!");
      setResetSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Reset error:", err);
      toast.error(err.response?.data?.msg || "Invalid or expired link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedWrapper>
      <motion.div
        initial={{ scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="p-4"
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)"
        }}
      >
        <h3 className="text-center fw-bold mb-4" style={{ color: "#333" }}>
          Reset Password
        </h3>

        {!resetSuccess ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ color: "#555" }}>
                New Password
              </label>
              <input
                type="password"
                className="form-control p-3"
                value={pass1}
                onChange={(e) => setPass1(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
                style={{
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px"
                }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ color: "#555" }}>
                Confirm Password
              </label>
              <input
                type="password"
                className="form-control p-3"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                style={{
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px"
                }}
              />
            </div>

            <button 
              className="btn btn-warning w-100 py-3 fw-semibold rounded-pill mt-3"
              disabled={loading}
              style={{ fontSize: "1.1rem" }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        ) : (
          <div className="text-center" style={{ color: "#333" }}>
            <div className="mb-3" style={{ fontSize: "4rem" }}>✅</div>
            <h4 className="fw-bold mb-3">Password Reset Successful!</h4>
            <p className="mb-3">
              Your password has been updated successfully.
            </p>
            <p className="text-muted">
              Redirecting to login page...
            </p>
          </div>
        )}

        <div className="text-center mt-3">
          <a href="/login" style={{ color: "#FFC107", textDecoration: "none", fontWeight: "600" }}>
            Back to Login
          </a>
        </div>
      </motion.div>
    </AnimatedWrapper>
  );
}