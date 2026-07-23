import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../utils/api";
import { getMondayDateKey, getWeekFromDateKey, toDateKey } from "../utils/weekPlan";
import "./Home.css";
import Navbar from "../components/Navbar";
import AdSlot from "../components/AdSlot";
import fridgeIdeaOne from "../assets/img1.webp";
import fridgeIdeaTwo from "../assets/img2.webp";
import fridgeIdeaThree from "../assets/img3.webp";
import fridgeIdeaFour from "../assets/img4.webp";

const popularSearches = [
  "Paneer Tikka",
  "Masala Dosa",
  "Veg Biryani",
  "Margherita Pizza",
  "Rajma Chawal",
  "Veg Hakka Noodles",
  "Chole Bhature",
  "Palak Paneer"
];

const fridgeIdeas = [
  { title: "Fresh bowls", image: fridgeIdeaOne },
  { title: "Spaghetti", image: fridgeIdeaTwo },
  { title: "Pizza", image: fridgeIdeaThree },
  { title: "Pasta", image: fridgeIdeaFour }
];

const quickCategories = [
  { name: "Indian", icon: "🍛", query: "Indian dinner" },
  { name: "Breakfast", icon: "🥣", query: "healthy breakfast" },
  { name: "Italian", icon: "🍝", query: "Italian pasta" },
  { name: "Dessert", icon: "🍰", query: "eggless dessert" }
];

const emptyNutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0
};

const nutritionMeta = [
  { key: "carbs", label: "Carbs", unit: "g", color: "#f1b84b", softColor: "#fff2cf" },
  { key: "fat", label: "Fat", unit: "g", color: "#dd6b78", softColor: "#ffe3e7" },
  { key: "protein", label: "Protein", unit: "g", color: "#5f9467", softColor: "#e1f2e5" },
  { key: "fiber", label: "Fiber", unit: "g", color: "#5aa8d6", softColor: "#e0f2fb" }
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dashboard, setDashboard] = useState({
    mealsPlanned: 0,
    groceryItems: [],
    savedRecipes: [],
    nutrition: emptyNutrition
  });
  const [updatingGroceryId, setUpdatingGroceryId] = useState("");
  const [activeFridgeIdea, setActiveFridgeIdea] = useState(0);
  const [showMobileNutrition, setShowMobileNutrition] = useState(false);

  const token = localStorage.getItem("token");
  const firstName = user?.onboarding?.displayName || user?.firstName || "chef";
  const groceryItems = dashboard.groceryItems.slice(0, 4);
  const checkedGroceryCount = dashboard.groceryItems.filter((item) => item.marked).length;
  const groceryCount = dashboard.groceryItems.length;
  const moreGroceryCount = Math.max(0, groceryCount - 4);
  const savedRecipes = dashboard.savedRecipes.slice(0, 3);
  const hasWeeklyNutrition = Object.values(dashboard.nutrition).some((value) => Number(value) > 0);

  const savedRecipeText = useMemo(() => {
    if (!dashboard.savedRecipes.length) return "No recipes saved yet";
    return `${dashboard.savedRecipes.length} saved favorite${dashboard.savedRecipes.length === 1 ? "" : "s"}`;
  }, [dashboard.savedRecipes.length]);

  useEffect(() => {
    const sliderTimer = window.setInterval(() => {
      setActiveFridgeIdea((current) => (current + 1) % fridgeIdeas.length);
    }, 2500);

    return () => window.clearInterval(sliderTimer);
  }, []);

  useEffect(() => {
    if (!token) return;

    const loadDashboard = async () => {
      try {
        const monday = getMondayDateKey(toDateKey(new Date()));
        const weekKeys = getWeekFromDateKey(monday).map((day) => day.dateKey);
        const [mealRes, groceryRes, savedRes] = await Promise.all([
          fetch(apiUrl(`/api/meal-plans/all?fromDate=${monday}`), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl(`/api/grocery/list?startDate=${monday}`), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl("/api/recipes/my-recipes"), {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const [mealData, groceryData, savedData] = await Promise.all([
          mealRes.ok ? mealRes.json() : [],
          groceryRes.ok ? groceryRes.json() : { items: [] },
          savedRes.ok ? savedRes.json() : []
        ]);

        const weekMealPlans = Array.isArray(mealData)
          ? mealData.filter((plan) => weekKeys.includes(plan?.planDate))
          : [];
        const nutrition = weekMealPlans.reduce((totals, plan) => {
          const planNutrition = plan?.recipe?.nutrition || {};
          return {
            calories: totals.calories + (Number(planNutrition.calories) || 0),
            protein: totals.protein + (Number(planNutrition.protein) || 0),
            carbs: totals.carbs + (Number(planNutrition.carbs) || 0),
            fat: totals.fat + (Number(planNutrition.fat) || 0),
            fiber: totals.fiber + (Number(planNutrition.fiber) || 0)
          };
        }, emptyNutrition);

        setDashboard({
          mealsPlanned: weekMealPlans.length,
          groceryItems: Array.isArray(groceryData.items) ? groceryData.items : [],
          savedRecipes: Array.isArray(savedData) ? savedData : [],
          nutrition: {
            calories: Math.round(nutrition.calories),
            protein: Math.round(nutrition.protein),
            carbs: Math.round(nutrition.carbs),
            fat: Math.round(nutrition.fat),
            fiber: Math.round(nutrition.fiber)
          }
        });
      } catch (err) {
        console.error("Failed to load home dashboard", err);
      }
    };

    loadDashboard();
  }, [token]);

  const getNutritionSegments = () => {
    const macroTotal = nutritionMeta.reduce((total, item) => total + (Number(dashboard.nutrition[item.key]) || 0), 0);

    return nutritionMeta.map((item) => {
      const value = Number(dashboard.nutrition[item.key]) || 0;
      const percentage = macroTotal > 0 ? Math.max(4, Math.round((value / macroTotal) * 100)) : 0;
      return {
        ...item,
        value,
        percentage
      };
    });
  };

  const openRecipe = (recipeName) => {
    navigate(`/search?q=${encodeURIComponent(recipeName)}`);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query) openRecipe(query);
  };

  const toggleGroceryItem = async (event, item) => {
    event.preventDefault();
    event.stopPropagation();

    if (!item?._id || updatingGroceryId) return;

    const nextMarked = !item.marked;
    setUpdatingGroceryId(item._id);
    setDashboard((prev) => ({
      ...prev,
      groceryItems: prev.groceryItems.map((current) =>
        current._id === item._id ? { ...current, marked: nextMarked } : current
      )
    }));

    try {
      const res = await fetch(apiUrl(`/api/grocery/mark/${item._id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ marked: nextMarked })
      });

      if (!res.ok) {
        throw new Error("Failed to update grocery item");
      }
    } catch (err) {
      console.error(err);
      setDashboard((prev) => ({
        ...prev,
        groceryItems: prev.groceryItems.map((current) =>
          current._id === item._id ? { ...current, marked: !nextMarked } : current
        )
      }));
    } finally {
      setUpdatingGroceryId("");
    }
  };

  return (
    <div className="home-shell">
      <Navbar />

      <main className="home-page">
        <section className="home-hero-grid">
          <div className="home-primary">
            <div className="home-greeting-row">
              <div>
                <p className="home-kicker">{getGreeting()}</p>
                <h1 className="home-title">
                  What shall we <em>cook</em><br />
                  today, {firstName}?
                </h1>
              </div>
            </div>

            <form className="home-search-card" onSubmit={submitSearch}>
              <span className="home-search-icon">⌕</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search 12,000+ recipes..."
                aria-label="Search recipes"
              />
              <button type="submit" aria-label="Search">
                <span></span>
              </button>
            </form>

            <div className="home-chip-row" aria-label="Popular searches">
              {popularSearches.map((item) => (
                <button type="button" key={item} onClick={() => openRecipe(item)}>
                  {item}
                </button>
              ))}
            </div>

            <section className="fridge-card">
              <div className="fridge-card-bg fridge-card-bg-one"></div>
              <div className="fridge-card-bg fridge-card-bg-two"></div>
              <div className="ai-pill"><span></span>AI powered</div>
              <h2>
                Generate a recipe from<br />
                your <em>fridge</em>
              </h2>
              <p>Snap a photo of your ingredients and we’ll create a recipe just for you.</p>
              <div className="fridge-actions">
                <Link to="/detect" className="fridge-primary-action">
                  <span>📷</span>
                  Take Photo
                </Link>
              </div>
              <div className="fridge-image-slider" aria-label="Recipe inspiration">
                <div className="fridge-slide-card">
                  {fridgeIdeas.map((idea, index) => (
                    <span
                      className={`fridge-slide ${index === activeFridgeIdea ? "active" : ""}`}
                      key={idea.title}
                    >
                      <img src={idea.image} alt="" loading="lazy" decoding="async" fetchPriority="low" />
                      <strong>{idea.title}</strong>
                    </span>
                  ))}
                </div>
                <div className="fridge-slide-dots" aria-hidden="true">
                  {fridgeIdeas.map((idea, index) => (
                    <span className={index === activeFridgeIdea ? "active" : ""} key={idea.title}></span>
                  ))}
                </div>
              </div>
            </section>
          </div>

        </section>

        <section className="browse-section">
          <div className="section-heading-row">
            <h2>Browse & Save</h2>
            <Link to="/saved">See all →</Link>
          </div>
          {savedRecipes.length > 0 ? (
            <div className="browse-scroll">
              {savedRecipes.map((recipe, index) => (
                <button
                  key={recipe._id || recipe.title}
                  type="button"
                  className="browse-card"
                  onClick={() => navigate(`/search?savedId=${encodeURIComponent(recipe._id)}`)}
                >
                  <div className={`browse-art ${["peach", "mint", "sage"][index % 3]}`}>
                    <span>{["🍛", "🥗", "🍲"][index % 3]}</span>
                    <i>♡</i>
                  </div>
                  <div className="browse-copy">
                    <p>Saved recipe</p>
                    <h3>{recipe.title || recipe.name}</h3>
                    {recipe.description && <small>{recipe.description}</small>}
                    <div>
                      <span>{recipe.ingredients?.length || 0} ingredients</span>
                      <strong>{recipe.healthLabel || "Saved"}</strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="home-empty-card">
              <strong>No recipes saved yet</strong>
              <p>Search a recipe, save it, and your cookbook will start appearing here.</p>
              <button type="button" onClick={() => openRecipe("Paneer Tikka")}>Find a recipe</button>
            </div>
          )}
        </section>

        <section className="mobile-home-tools" aria-label="Planning shortcuts">
          <div className="mobile-tool-card mobile-tool-card-planner">
            <button
              type="button"
              className="mobile-tool-logo-btn"
              onClick={() => hasWeeklyNutrition && setShowMobileNutrition((value) => !value)}
              aria-expanded={showMobileNutrition}
              aria-label="Show weekly nutrition spectrum"
              disabled={!hasWeeklyNutrition}
            >
              <span className="mobile-tool-icon planner">▣</span>
            </button>
            <div>
              <p>Plan ahead</p>
              <h2>Meal Planner</h2>
              <small>{dashboard.mealsPlanned} meal{dashboard.mealsPlanned === 1 ? "" : "s"} this week</small>
            </div>
            <Link to="/meal-planner" aria-label="Open meal planner">›</Link>
          </div>

          <Link to="/grocery-list" className="mobile-tool-card mobile-tool-card-link">
            <span className="mobile-tool-icon grocery">🛒</span>
            <div>
              <p>Shopping</p>
              <h2>Grocery List</h2>
              <small>{groceryCount} item{groceryCount === 1 ? "" : "s"}</small>
            </div>
            <b>›</b>
          </Link>
        </section>

        {hasWeeklyNutrition && showMobileNutrition && (
          <div
            className="mobile-nutrition-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Weekly nutrition spectrum"
            onClick={() => setShowMobileNutrition(false)}
          >
            <div className="mobile-nutrition-dialog" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="mobile-nutrition-close"
                onClick={() => setShowMobileNutrition(false)}
                aria-label="Close nutrition spectrum"
              >
                ×
              </button>
              <p>Weekly total</p>
              <h2>Nutrition Spectrum</h2>
              <div className="home-nutrition-orb" aria-label="Weekly nutrition spectrum">
                {getNutritionSegments().map((segment, index) => (
                  <span
                    key={segment.key}
                    className={`home-nutrition-dot home-nutrition-dot-${index}`}
                    style={{
                      "--macro-color": segment.color,
                      "--macro-soft-color": segment.softColor,
                      "--macro-percent": `${segment.percentage}%`
                    }}
                  >
                    <small>{segment.label}</small>
                    <strong>{segment.value}{segment.unit}</strong>
                  </span>
                ))}
                <div className="home-nutrition-center">
                  <strong>{dashboard.nutrition.calories}</strong>
                  <span>Cal</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="home-lower-grid">
          <Link to="/meal-planner" className="planner-card">
            <div className="planner-icon">▣</div>
            <div>
              <p>Plan ahead</p>
              <h2>Meal Planner</h2>
              <span>{dashboard.mealsPlanned} meal{dashboard.mealsPlanned === 1 ? "" : "s"} planned this week</span>
            </div>
            <b>›</b>
            <span className="pasta-mark">🍝</span>
          </Link>

          <section className="grocery-card">
            <div className="grocery-title-row">
              <div className="grocery-icon">🛒</div>
              <div>
                <p>Shopping</p>
                <h2>Grocery List</h2>
              </div>
              <strong>{groceryCount} items</strong>
            </div>

            {groceryItems.length > 0 ? (
              <div className="grocery-preview-list">
                {groceryItems.map((item, index) => (
                  <div key={`${item._id || item.name}-${index}`} className={item.marked ? "checked" : ""}>
                    <button
                      type="button"
                      disabled={updatingGroceryId === item._id}
                      onClick={(event) => toggleGroceryItem(event, item)}
                      aria-label={`${item.marked ? "Uncheck" : "Check"} ${item.name}`}
                    >
                      {item.marked ? "✓" : ""}
                    </button>
                    <em>{item.name}</em>
                    <small>{item.mealType || ""}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="home-empty-card grocery-empty">
                <strong>No grocery items yet</strong>
                <p>Add recipes to your meal planner and ingredients will appear here.</p>
              </div>
            )}

            <div className="grocery-more">
              {moreGroceryCount > 0
                ? `+ ${moreGroceryCount} more item${moreGroceryCount === 1 ? "" : "s"}`
                : `${checkedGroceryCount} checked so far`}
            </div>
            <Link to="/grocery-list" className="grocery-open-link">Open full list</Link>
          </section>
        </section>

        <section className="quick-category-row" aria-label="Quick categories">
          {quickCategories.map((category) => (
            <button type="button" key={category.name} onClick={() => openRecipe(category.query)}>
              <span>{category.icon}</span>
              {category.name}
            </button>
          ))}
        </section>

        <section className="saved-strip">
          <div>
            <p>Saved recipes</p>
            <h2>{savedRecipeText}</h2>
          </div>
          <Link to="/saved">Open cookbook</Link>
        </section>

        <AdSlot placement="home-bottom" label="Sponsored" />
      </main>

      <nav className="home-mobile-nav" aria-label="Home shortcuts">
        <Link to="/home" className="active"><span>⌂</span>Home</Link>
        <Link to="/mobile-search"><span>⌕</span>Search</Link>
        <Link to="/meal-planner"><span>▣</span>Meal Plan</Link>
        <Link to="/profile"><span>♙</span>Profile</Link>
      </nav>
    </div>
  );
}
