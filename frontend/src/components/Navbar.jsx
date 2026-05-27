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
    <nav className="navbar navbar-expand-lg bg-white shadow-sm px-3 py-2 taste-navbar">
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
    <div className="navbar-actions">
      <Link to="/meal-planner" className="btn btn-outline-success">
        📅 Meal Planner
      </Link>

      <Link to="/grocery-list" className="btn btn-outline-info">
        🛒 Grocery List
      </Link>

      <Link to="/saved" className="btn btn-outline-warning">
        ❤️ Saved Recipes
      </Link>

      <Link to="/profile" className="btn btn-outline-dark">
        👤 Profile
      </Link>

      {/*
      Admin dashboard is disabled for now.
      Uncomment this link when the admin route is enabled again.
      {user.role === "admin" && (
        <Link to="/admin" className="btn btn-outline-danger">
          📊 Admin
        </Link>
      )}
      */}

      <button
        className="btn btn-warning fw-semibold px-4"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  )}
</div>

      </div>
    </nav>
  );
}
