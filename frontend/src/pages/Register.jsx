import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";

export default function Register() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [confirmPass, setConfirm] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPass) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        firstName,
        lastName,
        phone,
        email,
        password,
      });
      toast.success("Account created!");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Something went wrong");
    }
  };

  return (
    <AuthLayout>
      <h2 className="fw-bold mb-3 text-center">Create Your Account</h2>
      <p className="text-center text-muted mb-4">Join TasteTrail today!</p>

      <form onSubmit={handleRegister}>
        <div className="row">
          <div className="col-6 mb-3">
            <label className="form-label fw-semibold">First Name</label>
            <input className="form-control p-2" required onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div className="col-6 mb-3">
            <label className="form-label fw-semibold">Last Name</label>
            <input className="form-control p-2" required onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Phone</label>
          <input className="form-control p-2" required onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Email</label>
          <input className="form-control p-2" required onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Password</label>
          <input type="password" className="form-control p-2" required onChange={(e) => setPass(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Confirm Password</label>
          <input type="password" className="form-control p-2" required onChange={(e) => setConfirm(e.target.value)} />
        </div>

        <button className="btn btn-warning w-100 p-2 fw-semibold">Register</button>

        <div className="text-center mt-3">
          <a href="/login" className="fw-semibold text-decoration-none">
            Already Registered? Login
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}