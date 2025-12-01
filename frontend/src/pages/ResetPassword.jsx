import { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import AnimatedWrapper from "../components/AnimatedWrapper";
import FormInput from "../components/FormInput";
import { motion } from "framer-motion";

export default function ResetPassword() {
  const { token } = useParams();
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pass1 !== pass2) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/reset-password", {
        token,
        newPassword: pass1
      });

      toast.success("Password reset successfully!");
    } catch (err) {
      toast.error("Invalid or expired link");
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
        <h3 className="text-center text-white fw-bold mb-4">Reset Password</h3>

        <form onSubmit={handleSubmit}>
          <FormInput label="New Password" type="password" value={pass1} onChange={(e) => setPass1(e.target.value)} />
          <FormInput label="Confirm Password" type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} />

          <button className="btn btn-light w-100 py-2 fw-semibold rounded-pill mt-2">
            Reset Password
          </button>
        </form>
      </motion.div>
    </AnimatedWrapper>
  );
}