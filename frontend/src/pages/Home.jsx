import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./Home.css";
import img1 from "../assets/img1.jpg";
import img2 from "../assets/img2.jpg";
import img3 from "../assets/img3.jpg";
import img4 from "../assets/img4.jpg";
import img5 from "../assets/img5.jpg";
import img6 from "../assets/img6.jpg";
import Navbar from "../components/Navbar";

const categories = [
  {
    name: "Indian",
    icon: "🍛",
    dishes: [
      "Paneer Tikka",
      "Masala Dosa",
      "Veg Biryani",
      "Chole Bhature",
      "Pav Bhaji",
      "Rajma Chawal",
      "Palak Paneer",
      "Aloo Paratha",
      "Dhokla",
      "Dal Tadka",
      "Idli Sambar",
      "Veg Pulao",
    ],
  },
  {
    name: "Italian",
    icon: "🍝",
    dishes: [
      "Margherita Pizza",
      "Pasta Alfredo",
      "Arrabbiata Pasta",
      "Pesto Pasta",
      "Veg Lasagna",
      "Mushroom Risotto",
      "Bruschetta",
      "Minestrone Soup",
      "Caprese Salad",
      "Garlic Bread",
      "Focaccia",
      "Four Cheese Pizza",
    ],
  },
  {
    name: "Chinese",
    icon: "🥡",
    dishes: [
      "Veg Manchurian",
      "Veg Hakka Noodles",
      "Chilli Paneer",
      "Veg Fried Rice",
      "Spring Rolls",
      "Schezwan Noodles",
      "Hot and Sour Soup",
      "Honey Chilli Potato",
      "Veg Momos",
      "Crispy Corn",
      "Kung Pao Tofu",
      "Chilli Garlic Noodles",
    ],
  },
  {
    name: "Desserts",
    icon: "🍰",
    dishes: [
      "Gulab Jamun",
      "Rasgulla",
      "Kheer",
      "Jalebi",
      "Chocolate Brownie",
      "Fruit Custard",
      "Cheesecake",
      "Tiramisu",
      "Mango Mousse",
      "Carrot Halwa",
      "Ice Cream Sundae",
      "Apple Pie",
    ],
  },
  {
    name: "Breakfast",
    icon: "🥣",
    dishes: [
      "Poha",
      "Upma",
      "Masala Dosa",
      "Idli Sambar",
      "Aloo Paratha",
      "Besan Chilla",
      "Moong Dal Chilla",
      "Oats Porridge",
      "Vegetable Sandwich",
      "Thepla",
      "Avocado Toast",
      "Smoothie Bowl",
    ],
  },
  {
    name: "Healthy",
    icon: "🥗",
    dishes: [
      "Quinoa Salad",
      "Sprouts Chaat",
      "Vegetable Soup",
      "Buddha Bowl",
      "Millet Khichdi",
      "Greek Salad",
      "Paneer Salad",
      "Lentil Soup",
      "Grilled Vegetable Wrap",
      "Hummus Bowl",
      "Stuffed Bell Peppers",
      "Fruit Smoothie",
    ],
  },
];

export default function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const openRecipe = (recipeName) => {
    navigate(`/search?q=${encodeURIComponent(recipeName)}`);
    setSelectedCategory(null);
    setShowSearchModal(false);
  };

  return (
    <>
    <Navbar />
    <div className="container mt-4">

      {/* ---------------- HERO SECTION ---------------- */}
      <div className="row align-items-center hero-section">
        {/* LEFT SIDE */}
        <div className="col-md-6 text-section">
          <h1 className="fw-bold title">Welcome, {user?.firstName} </h1>
          <p className="subtitle">
            Discover delicious recipes, detect ingredients from photos, and instantly generate meals with AI.
          </p>

          <div className="mt-4 d-flex flex-column gap-3">
            <Link to="/detect" className="btn btn-warning p-3 fw-semibold shadow-sm">
              Upload Image to Detect Ingredients
            </Link>

           <button 
              onClick={() => setShowSearchModal(true)}
              className="btn btn-dark p-3 fw-semibold shadow-sm"
            >
              🔍 Search Recipes with AI
            </button>
          </div>
        </div>

        {/* RIGHT SIDE — AUTO SLIDING IMAGES */}
        <div className="col-md-6">
          <div id="foodCarousel" className="carousel slide hero-carousel" data-bs-ride="carousel">
  <div className="carousel-inner rounded shadow">
    <div className="carousel-item active">
      <img src={img1} className="d-block w-100 hero-img" />
    </div>
    <div className="carousel-item">
      <img src={img2} className="d-block w-100 hero-img" />
    </div>
    <div className="carousel-item">
      <img src={img3} className="d-block w-100 hero-img" />
    </div>
    <div className="carousel-item">
      <img src={img4} className="d-block w-100 hero-img" />
    </div>
    <div className="carousel-item">
      <img src={img5} className="d-block w-100 hero-img" />
    </div>
    <div className="carousel-item">
      <img src={img6} className="d-block w-100 hero-img" />
    </div>
  </div>
</div>
        </div>
      </div>

      {/* ---------------- CATEGORIES ---------------- */}
      <h3 className="fw-bold mt-5">Categories</h3>
      <div className="row mt-3 g-4">
        {categories.map((cat) => (
          <div className="col-6 col-md-4 col-lg-2" key={cat.name}>
            <div 
              className="category-card shadow-sm text-center"
              onClick={() => {
                setSelectedCategory(cat);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="emoji">{cat.icon}</div>
              <p className="fw-semibold">{cat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- TRENDING RECIPES ---------------- */}
      <h3 className="fw-bold mt-5">Trending Recipes</h3>
      <div className="row mt-3 g-4">
        {[
          "Butter Pav Bhaji",
          "Paneer Tikka",
          "Masala Dosa",
          "Veg Biryani",
          "Pasta Alfredo",
          "Veg Pizza",
        ].map((recipe) => (
          <div className="col-md-4" key={recipe}>
            <div className="recipe-card shadow p-3 rounded">
              <h5 className="fw-bold">{recipe}</h5>
              <p className="text-muted">
                Explore this delicious recipe in one click.
              </p>
              <button 
                className="btn btn-warning w-100"
                onClick={() => openRecipe(recipe)}
              >
                View Recipe
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- UPLOAD SECTION ---------------- */}
      <div className="upload-box mt-5 p-5 text-center shadow rounded">
        <h3 className="fw-bold mb-3">Upload an Image</h3>
        <p className="text-muted">Detect ingredients instantly and get recipe suggestions.</p>
        <Link to="/detect" className="btn btn-dark p-3 fw-semibold mt-2">
          Upload Now
        </Link>
      </div>

      {/* ---------------- SEARCH MODAL ---------------- */}
      {showSearchModal && (
        <div className="search-modal-overlay" onClick={() => setShowSearchModal(false)}>
          <div className="search-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-header">
              <h3 className="fw-bold mb-0">🔍 Search Recipes</h3>
              <button 
                className="btn-close" 
                onClick={() => setShowSearchModal(false)}
              ></button>
            </div>
            
            <div className="search-modal-body">
              <input
                type="text"
                className="form-control search-input"
                placeholder="Search any recipe (e.g., Paneer Tikka, Pasta, Dosa)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    navigate(`/search?q=${searchQuery}`);
                    setShowSearchModal(false);
                  }
                }}
                autoFocus
              />
              
              <div className="search-suggestions mt-4">
                <p className="text-muted mb-2">Popular Searches:</p>
                <div className="d-flex flex-wrap gap-2">
                  {["Paneer Tikka", "Masala Dosa", "Veg Biryani", "Margherita Pizza", "Rajma Chawal", "Veg Hakka Noodles"].map((suggestion) => (
                    <button
                      key={suggestion}
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => openRecipe(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-warning w-100 mt-4 p-3 fw-semibold"
                onClick={() => {
                  if (searchQuery.trim()) {
                    navigate(`/search?q=${searchQuery}`);
                    setShowSearchModal(false);
                  }
                }}
                disabled={!searchQuery.trim()}
              >
                Search Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- CATEGORY DISH MODAL ---------------- */}
      {selectedCategory && (
        <div className="search-modal-overlay" onClick={() => setSelectedCategory(null)}>
          <div className="search-modal-content category-dishes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-header">
              <h3 className="fw-bold mb-0">
                {selectedCategory.icon} {selectedCategory.name} Dishes
              </h3>
              <button
                className="btn-close"
                onClick={() => setSelectedCategory(null)}
              ></button>
            </div>

            <div className="search-modal-body">
              <div className="category-dish-grid">
                {selectedCategory.dishes.map((dish) => (
                  <button
                    key={dish}
                    className="category-dish-btn"
                    onClick={() => openRecipe(dish)}
                  >
                    {dish}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
