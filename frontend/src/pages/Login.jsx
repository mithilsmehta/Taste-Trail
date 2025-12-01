import { useState, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";
import { AuthContext } from "../context/AuthContext";

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
    } catch (err) {
      toast.error(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <AuthLayout>
      <h2 className="fw-bold mb-3 text-center">Welcome to TasteTrail</h2>
      <p className="text-center text-muted mb-4">Discover recipes tailored for you</p>

      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label className="form-label fw-semibold">Email or Phone</label>
          <input
            type="text"
            className="form-control p-2 rounded"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            style={{ border: "1px solid #bbb" }}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Password</label>
          <input
            type="password"
            className="form-control p-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ border: "1px solid #bbb" }}
          />
        </div>

        <button className="btn btn-warning w-100 mt-2 p-2 fw-semibold">
          Login
        </button>

        <div className="text-center mt-3">
          <a href="/forgot-password" className="text-decoration-none fw-semibold">Forgot Password?</a>
        </div>

        <div className="text-center mt-2">
          <a href="/register" className="text-decoration-none fw-semibold">
            Create Account
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}