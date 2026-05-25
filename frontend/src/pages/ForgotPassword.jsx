import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import AnimatedWrapper from "../components/AnimatedWrapper";
import FormInput from "../components/FormInput";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/api/auth/forgot-password", {
        email
      });

      toast.success("Reset link sent to your email!");
      setEmailSent(true);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Error sending reset link");
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
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)"
        }}
      >
        <h3 className="text-center text-white fw-bold mb-4">Forgot Password</h3>

        {!emailSent ? (
          <form onSubmit={handleSubmit}>
            <FormInput 
              label="Enter your Email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />

            <button 
              className="btn btn-light w-100 py-2 fw-semibold rounded-pill mt-2"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="mb-3" style={{ fontSize: "3rem" }}>✅</div>
            <h5 className="mb-3" style={{ color: "#333", fontWeight: "bold" }}>
              Email Sent Successfully!
            </h5>
            <p className="mb-3" style={{ color: "#333" }}>
              We've sent a password reset link to:<br />
              <strong style={{ color: "#000" }}>{email}</strong>
            </p>
            <p className="small mb-3" style={{ color: "#555" }}>
              Please check your email and click the link to reset your password.
              The link will expire in 15 minutes.
            </p>
            <button 
              className="btn btn-warning w-100 py-2 fw-semibold rounded-pill mt-2"
              onClick={() => setEmailSent(false)}
            >
              Send Another Link
            </button>
          </div>
        )}

        <div className="text-center mt-3">
          <a href="/login" className="text-white">Back to Login</a>
        </div>
      </motion.div>
    </AnimatedWrapper>
  );
}