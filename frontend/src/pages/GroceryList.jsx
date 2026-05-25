import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { formatIngredientAmount, splitIngredientLine } from "../utils/recipeFormatting";
import { getMondayDateKey, getWeekFromDateKey, toDateKey } from "../utils/weekPlan";
import "./GroceryList.css";

const quantityWords = new Set([
  "a",
  "an",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten"
]);

const units = new Set([
  "cup",
  "cups",
  "teaspoon",
  "teaspoons",
  "tsp",
  "tablespoon",
  "tablespoons",
  "tbsp",
  "gram",
  "grams",
  "g",
  "kg",
  "kilogram",
  "kilograms",
  "ml",
  "liter",
  "liters",
  "litre",
  "litres",
  "pinch",
  "pinches",
  "piece",
  "pieces",
  "clove",
  "cloves",
  "slice",
  "slices",
  "small",
  "medium",
  "large"
]);

const prepWords = new Set([
  "chopped",
  "diced",
  "sliced",
  "minced",
  "grated",
  "crushed",
  "finely",
  "roughly",
  "thinly",
  "fresh",
  "optional",
  "to",
  "taste"
]);

export default function GroceryList() {
  const navigate = useNavigate();
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedRecipes, setExpandedRecipes] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  const currentWeekStartDate = getMondayDateKey(toDateKey(new Date()));
  const currentWeekDays = getWeekFromDateKey(currentWeekStartDate);

  useEffect(() => {
    loadGroceryList();
  }, []);

  const loadGroceryList = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5000/api/grocery/list?startDate=${currentWeekStartDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const res = await fetch(`http://localhost:5000/api/meal-plans/my?startDate=${currentWeekStartDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      const plans = ["breakfast", "lunch", "dinner"].flatMap((mealType) => {
        return Array.isArray(data?.[mealType])
          ? data[mealType].filter(Boolean).map((plan, dayIndex) => ({
              ...plan,
              mealType,
              displayDayIndex: dayIndex
            }))
          : [];
      });

      setMealPlans(plans);
    } catch (err) {
      console.error(err);
      alert("Failed to load grocery list");
    }
    setLoading(false);
  };

  const toggleMark = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getBlinkitSearchTerm = (ingredient) => {
    const withoutParentheses = ingredient.replace(/\([^)]*\)/g, " ");
    const normalized = withoutParentheses
      .replace(/[¼½¾⅓⅔]/g, " ")
      .replace(/\b\d+(?:\.\d+)?(?:\/\d+)?\b/g, " ")
      .replace(/[,+]/g, " ")
      .toLowerCase()
      .trim();

    const words = normalized
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !quantityWords.has(word))
      .filter((word) => !units.has(word))
      .filter((word) => !prepWords.has(word));

    const cleaned = words.join(" ").trim();

    return cleaned
      .replace(/\btomatoes\b/g, "tomato")
      .replace(/\bpotatoes\b/g, "potato")
      .replace(/\bonions\b/g, "onion")
      .replace(/\bchilies\b/g, "chilli")
      .replace(/\bchillies\b/g, "chilli")
      .replace(/\bleaves\b/g, "leaf")
      .trim() || ingredient;
  };

  const openBlinkit = (ingredient) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const searchTerm = getBlinkitSearchTerm(ingredient);
    const blinkitLink = `https://blinkit.com/s/?q=${encodeURIComponent(searchTerm)}`;

    if (isMobile) {
      // Try to open Blinkit app first
      window.location.href = `blinkit://search?q=${encodeURIComponent(searchTerm)}`;

      // Fallback to web after 2 seconds if app doesn't open
      setTimeout(() => {
        window.location.href = blinkitLink;
      }, 2000);
    } else {
      // Desktop: open in new tab
      window.open(blinkitLink, "_blank");
    }
  };

  const getDisplayItems = () => {
    return mealPlans.flatMap((mealPlan) => {
      const ingredients = mealPlan.recipe?.ingredients || [];

      return ingredients.flatMap((ingredient, ingredientIndex) => {
        return splitIngredientLine(ingredient).map((part, partIndex) => ({
          _displayId: `${mealPlan._id}-${ingredientIndex}-${partIndex}`,
          _sourceId: `${mealPlan._id}-${ingredientIndex}-${partIndex}`,
          _recipeId: String(mealPlan._id),
          _recipeTitle: mealPlan.recipe?.title || "Recipe",
          _planDate: mealPlan.planDate || currentWeekDays[mealPlan.displayDayIndex]?.dateKey,
          mealType: mealPlan.mealType,
          marked: false,
          name: part
        }));
      });
    });
  };

  const getFilteredItems = () => {
    const displayItems = getDisplayItems();
    if (filter === "all") return displayItems;
    return displayItems.filter(item => item.mealType === filter);
  };

  const getMealTypeCount = (mealType) => {
    return getDisplayItems().filter((item) => item.mealType === mealType).length;
  };

  const getMealIcon = (mealType) => {
    const icons = {
      breakfast: "🥣",
      lunch: "🍱",
      dinner: "🍽️"
    };
    return icons[mealType];
  };

  const groupByMealAndRecipe = (items) => {
    const grouped = {
      breakfast: {},
      lunch: {},
      dinner: {}
    };

    items.forEach(item => {
      if (!grouped[item.mealType]) return;

      if (!grouped[item.mealType][item._recipeId]) {
        grouped[item.mealType][item._recipeId] = {
          id: item._recipeId,
          title: item._recipeTitle,
          mealType: item.mealType,
          items: []
        };
      }

      grouped[item.mealType][item._recipeId].items.push(item);
    });

    return grouped;
  };

  const toggleRecipe = (recipeId) => {
    setExpandedRecipes(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId]
    }));
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading your grocery list...</p>
        </div>
      </>
    );
  }

  const filteredItems = getFilteredItems();
  const groupedItems = groupByMealAndRecipe(filteredItems);
  const displayItemCount = getDisplayItems().length;

  return (
    <>
      <Navbar />
      <div className="container mt-4 mb-5">
        <button 
          className="btn btn-outline-secondary mb-4"
          onClick={() => navigate("/meal-planner")}
        >
          ← Back to Meal Planner
        </button>

        <div className="grocery-header mb-4">
          <h2 className="fw-bold">🛒 Grocery List</h2>
          <p className="text-muted">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} in your list
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="filter-buttons mb-4">
          <button
            className={`btn ${filter === "all" ? "btn-warning" : "btn-outline-warning"} me-2`}
            onClick={() => setFilter("all")}
          >
            All ({displayItemCount})
          </button>
          <button
            className={`btn ${filter === "breakfast" ? "btn-warning" : "btn-outline-warning"} me-2`}
            onClick={() => setFilter("breakfast")}
          >
            🥣 Breakfast ({getMealTypeCount("breakfast")})
          </button>
          <button
            className={`btn ${filter === "lunch" ? "btn-warning" : "btn-outline-warning"} me-2`}
            onClick={() => setFilter("lunch")}
          >
            🍱 Lunch ({getMealTypeCount("lunch")})
          </button>
          <button
            className={`btn ${filter === "dinner" ? "btn-warning" : "btn-outline-warning"}`}
            onClick={() => setFilter("dinner")}
          >
            🍽️ Dinner ({getMealTypeCount("dinner")})
          </button>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="empty-state text-center py-5">
            <div className="empty-icon mb-3">🛒</div>
            <h4 className="fw-bold mb-2">No Items in Grocery List</h4>
            <p className="text-muted mb-4">Add meal plans to generate your grocery list</p>
            <button 
              className="btn btn-warning px-4"
              onClick={() => navigate("/meal-planner")}
            >
              Go to Meal Planner
            </button>
          </div>
        )}

        {/* Grocery Items by Meal Type */}
        {filteredItems.length > 0 && (
          <div className="grocery-sections">
            {Object.entries(groupedItems).map(([mealType, recipesById]) => {
              const recipeGroups = Object.values(recipesById);
              if (recipeGroups.length === 0) return null;
              const mealItemCount = recipeGroups.reduce((total, recipeGroup) => total + recipeGroup.items.length, 0);

              return (
                <div key={mealType} className="meal-section mb-4">
                  <h4 className="fw-bold mb-3 text-capitalize">
                    {getMealIcon(mealType)} {mealType}
                    <span className="meal-count">{recipeGroups.length} recipe{recipeGroups.length !== 1 ? "s" : ""} • {mealItemCount} items</span>
                  </h4>

                  <div className="recipe-grocery-list">
                    {recipeGroups.map((recipeGroup) => {
                      const expanded = expandedRecipes[recipeGroup.id] ?? false;

                      return (
                        <div key={recipeGroup.id} className="recipe-grocery-group">
                          <button
                            className="recipe-grocery-header"
                            onClick={() => toggleRecipe(recipeGroup.id)}
                          >
                            <div>
                              <span className="recipe-grocery-title">{recipeGroup.title}</span>
                              <span className="recipe-grocery-meta">
                                {recipeGroup.items.length} ingredient{recipeGroup.items.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <span className={`recipe-chevron ${expanded ? "expanded" : ""}`}>⌄</span>
                          </button>

                          {expanded && (
                            <div className="grocery-items">
                              {recipeGroup.items.map((item) => (
                                <div key={item._displayId} className={`grocery-item ${checkedItems[item._sourceId] ? 'marked' : ''}`}>
                                  <div className="item-left">
                                    <input
                                      type="checkbox"
                                      className="form-check-input me-3"
                                      checked={Boolean(checkedItems[item._sourceId])}
                                      onChange={() => toggleMark(item._sourceId)}
                                    />
                                    <span className={checkedItems[item._sourceId] ? 'text-decoration-line-through text-muted' : ''}>
                                      {formatIngredientAmount(item.name)}
                                    </span>
                                  </div>

                                  <button
                                    className="btn btn-blinkit btn-sm"
                                    onClick={() => openBlinkit(item.name)}
                                  >
                                    <img 
                                      src="https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=135/assets/eta-icons/15-mins-filled.png" 
                                      alt="Blinkit"
                                      style={{ width: '20px', height: '20px', marginRight: '6px' }}
                                    />
                                    Order on Blinkit
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        {filteredItems.length > 0 && (
          <div className="quick-actions mt-5">
            <button
              className="btn btn-outline-dark btn-lg"
              onClick={() => navigate("/meal-planner")}
            >
              📅 Back to Meal Planner
            </button>
          </div>
        )}
      </div>
    </>
  );
}
