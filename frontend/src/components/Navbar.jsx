import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white shadow-sm px-3 py-2">
      <div className="container-fluid">

        {/* LEFT SIDE - BRAND NAME */}
        <Link className="navbar-brand fw-bold fs-3" to="/home">
          <span style={{ color: "#FF6A00" }}>Taste</span>
          <span style={{ color: "#333" }}>Trail</span>
        </Link>

        {/* MOBILE TOGGLE */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

     <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
  {user && (
    <>
      <Link to="/saved" className="btn btn-outline-warning me-2">
        ❤️ Saved Recipes
      </Link>

      <Link to="/profile" className="btn btn-outline-dark me-2">
        👤 Profile
      </Link>

      <button
        className="btn btn-warning fw-semibold px-4"
        onClick={handleLogout}
      >
        Logout
      </button>
    </>
  )}
</div>

      </div>
    </nav>
  );
}