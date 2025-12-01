import { useState, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password
      });

      login(res.data.user, res.data.token);
      toast.success("Login successful!");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 400 }}>
      <h3 className="text-center">Login</h3>
      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label>Email</label>
          <input 
            type="email" className="form-control"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label>Password</label>
          <input 
            type="password" className="form-control"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="btn btn-primary w-100">Login</button>
      </form>
    </div>
  );
}