import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./Home.css";
import Navbar from "../components/Navbar";

export default function Home() {
  const { user } = useContext(AuthContext);

  return (
    
    <div className="home-container">
<Navbar />
      {/* Header Section */}
      <header className="hero-section">
        <div className="hero-text">
          <h1>Welcome, {user?.firstName} 👋</h1>
          <p>Your personalized recipe discovery starts here!</p>

          <div className="search-box">
            <input type="text" placeholder="Search for recipes..." />
            <button>Search</button>
          </div>
        </div>
      </header>

      {/* Categories */}
      <section className="categories">
        <h2>Popular Categories</h2>

        <div className="category-grid">
          <div className="category-card">🍕 Pizza</div>
          <div className="category-card">🍝 Pasta</div>
          <div className="category-card">🍔 Burgers</div>
          <div className="category-card">🥗 Salads</div>
          <div className="category-card">🍰 Desserts</div>
          <div className="category-card">🍹 Drinks</div>
        </div>
      </section>
    </div>
  );
}