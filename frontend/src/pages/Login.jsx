import { useState, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import "../styles/auth.css";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        identifier,
        password,
      });

      login(res.data.user, res.data.token);

      toast.success("Login successful!");
      window.location.href = "/";
    } catch (err) {
      toast.error(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <AuthLayout>
      <h2 className="auth-title text-center">Welcome to TasteTrail</h2>
      <p className="auth-subtitle text-center">Discover recipes tailored for you</p>

      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label className="form-label fw-semibold">Email or Phone</label>
          <input
            type="text"
            className="form-control auth-input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Password</label>
          <input
            type="password"
            className="form-control auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn-gradient">Login</button>

        <div className="text-center mt-3">
          <a href="/forgot-password" className="auth-link">Forgot Password?</a>
        </div>

        <div className="text-center mt-2">
          <a href="/register" className="auth-link">Create Account</a>
        </div>
      </form>
    </AuthLayout>
  );
}