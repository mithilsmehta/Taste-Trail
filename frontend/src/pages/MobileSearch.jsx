import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./MobileSearch.css";

const suggestedRecipes = [
  "Paneer Tikka",
  "Masala Dosa",
  "Veg Biryani",
  "Rajma Chawal",
  "Chole Bhature",
  "Palak Paneer",
  "Veg Hakka Noodles",
  "Margherita Pizza",
  "Dhokla",
  "Pav Bhaji",
  "Upma",
  "Vegetable Pasta"
];

const quickGroups = [
  { label: "Breakfast", query: "healthy breakfast", icon: "🥣" },
  { label: "Indian", query: "Indian dinner", icon: "🍛" },
  { label: "Quick", query: "quick vegetarian recipe", icon: "⚡" },
  { label: "Dessert", query: "eggless dessert", icon: "🍰" }
];

export default function MobileSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const openRecipe = (value) => {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return;
    navigate(`/search?q=${encodeURIComponent(cleanValue)}`);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    openRecipe(query);
  };

  return (
    <main className="mobile-search-page">
      <div className="mobile-search-topbar">
        <Link to="/home" aria-label="Back to Home">‹</Link>
        <span>Search</span>
      </div>

      <section className="mobile-search-hero">
        <p>Find a recipe</p>
        <h1>What are you craving?</h1>
      </section>

      <form className="mobile-search-card" onSubmit={submitSearch}>
        <span className="mobile-search-icon">⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search recipes..."
          autoFocus
          aria-label="Search recipes"
        />
        <button type="submit" aria-label="Search">
          <span></span>
        </button>
      </form>

      <section className="mobile-search-groups" aria-label="Quick search categories">
        {quickGroups.map((group) => (
          <button type="button" key={group.label} onClick={() => openRecipe(group.query)}>
            <span>{group.icon}</span>
            {group.label}
          </button>
        ))}
      </section>

      <section className="mobile-suggestions">
        <div className="mobile-section-heading">
          <h2>Suggested Recipes</h2>
        </div>
        <div className="mobile-suggestion-list">
          {suggestedRecipes.map((recipe) => (
            <button type="button" key={recipe} onClick={() => openRecipe(recipe)}>
              <span>{recipe}</span>
              <b>›</b>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
