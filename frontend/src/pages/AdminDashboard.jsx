import { apiUrl } from "../utils/api";
/*
Admin dashboard page is disabled for now.
Uncomment this file, its import/route in App.jsx, and the navbar link when needed.

import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(apiUrl("/api/admin/dashboard"), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.msg || "Failed to load admin dashboard");
        }

        setDashboard(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load admin dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (user?.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-warning" role="status"></div>
          <p className="text-muted mt-3">Loading admin dashboard...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container admin-page">
        <button className="btn btn-outline-secondary mb-4" onClick={() => navigate("/home")}>
          ← Back to Home
        </button>

        <section className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>Track users, recipes, scans, and meal planner activity.</p>
        </section>

        {error && (
          <div className="alert alert-danger">
            <strong>Admin error:</strong> {error}
          </div>
        )}

        {dashboard && (
          <>
            <section className="admin-stat-grid">
              {Object.entries(dashboard.totals || {}).map(([key, value]) => (
                <div key={key} className="admin-stat-card">
                  <span>{key.replace(/([A-Z])/g, " $1")}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>

            <section className="admin-grid">
              <AdminList title="Popular Saved Recipes" items={dashboard.popularSavedRecipes} />
              <AdminList title="Popular Meal Plans" items={dashboard.popularMealPlans} />
              <AdminList title="Scanned Ingredients" items={dashboard.popularScannedIngredients} />

              <div className="admin-panel">
                <h3>Recent Users</h3>
                <div className="admin-user-list">
                  {(dashboard.recentUsers || []).map((recentUser) => (
                    <div key={recentUser._id}>
                      <strong>{recentUser.firstName} {recentUser.lastName}</strong>
                      <span>{recentUser.email}</span>
                      <small>{recentUser.role}</small>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
*/

function AdminList({ title, items = [] }) {
  return (
    <div className="admin-panel">
      <h3>{title}</h3>
      <div className="admin-list">
        {items.length === 0 && <p className="text-muted mb-0">No data yet.</p>}
        {items.map((item) => (
          <div key={item._id || "Unknown"}>
            <span>{item._id || "Unknown"}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
