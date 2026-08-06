import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);
  const path = location.pathname;

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-white shadow-sm px-3 py-2 taste-navbar">
        <div className="container-fluid">

          {/* LEFT SIDE - BRAND NAME */}
          <Link className="navbar-brand fw-bold fs-3" to={user ? "/home" : "/"} onClick={closeMenu}>
            <span style={{ color: "#FF6A00" }}>Taste</span>
            <span style={{ color: "#333" }}>wise</span>
          </Link>

          {/* MOBILE TOGGLE (Only for logged-out public visitors) */}
          {!user && (
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
          )}

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

      {/* UNIVERSAL BOTTOM NAVIGATION FOR LOGGED IN USERS ACROSS ALL PAGES */}
      {user && (
        <nav className="app-bottom-nav" aria-label="App Navigation">
          <Link to="/home" className={path === "/home" || path === "/" ? "active" : ""}>
            <span>⌂</span>Home
          </Link>
          <Link to="/meal-planner" className={path === "/meal-planner" ? "active" : ""}>
            <span>📅</span>Meal Plan
          </Link>
          <Link to="/grocery-list" className={path === "/grocery-list" ? "active" : ""}>
            <span>🛒</span>Grocery
          </Link>
          <Link to="/profile" className={path === "/profile" ? "active" : ""}>
            <span>👤</span>Profile
          </Link>
        </nav>
      )}
    </>
  );
}
