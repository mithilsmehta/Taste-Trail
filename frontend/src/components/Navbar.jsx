import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar navbar-expand-lg bg-white shadow-sm px-3 py-2 taste-navbar">
      <div className="container-fluid">

        {/* LEFT SIDE - BRAND NAME */}
        <Link className="navbar-brand fw-bold fs-3" to={user ? "/home" : "/"} onClick={closeMenu}>
          <span style={{ color: "#FF6A00" }}>Taste</span>
          <span style={{ color: "#333" }}>wise</span>
        </Link>

        {/* MOBILE TOGGLE */}
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="navbarNav"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse justify-content-end ${menuOpen ? "show" : ""}`} id="navbarNav">
          {user ? (
            <div className="navbar-actions">
              <Link to="/meal-planner" className="btn btn-outline-success" onClick={closeMenu}>
                📅 Meal Planner
              </Link>

              <Link to="/grocery-list" className="btn btn-outline-info" onClick={closeMenu}>
                🛒 Grocery List
              </Link>

              <Link to="/saved" className="btn btn-outline-warning" onClick={closeMenu}>
                ❤️ Saved Recipes
              </Link>

              <Link to="/profile" className="btn btn-outline-dark" onClick={closeMenu}>
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
          ) : (
            <div className="navbar-actions">
              <a href="/#features" className="btn btn-outline-secondary" onClick={closeMenu}>
                Features
              </a>
              <a href="/#recipe-ideas" className="btn btn-outline-secondary" onClick={closeMenu}>
                Recipe Ideas
              </a>
              <Link to="/about" className="btn btn-outline-dark" onClick={closeMenu}>
                About
              </Link>
              <Link to="/contact" className="btn btn-outline-dark" onClick={closeMenu}>
                Contact
              </Link>
              <Link to="/login" className="btn btn-outline-success" onClick={closeMenu}>
                Login
              </Link>
              <Link to="/register" className="btn btn-warning fw-semibold px-4" onClick={closeMenu}>
                Create Account
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
