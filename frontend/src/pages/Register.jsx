import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        name,
        email,
        password
      });
      toast.success("Registration successful!");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Error!");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 400 }}>
      <h3 className="text-center">Register</h3>
      <form onSubmit={handleRegister}>

        <div className="mb-3">
          <label>Name</label>
          <input type="text" className="form-control"
            value={name} onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label>Email</label>
          <input type="email" className="form-control"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label>Password</label>
          <input type="password" className="form-control"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="btn btn-success w-100">Register</button>
      </form>
    </div>
  );
}