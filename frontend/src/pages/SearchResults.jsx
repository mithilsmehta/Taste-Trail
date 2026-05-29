import { apiUrl } from "../utils/api";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMondayDateKey, getWeekFromDateKey } from "../utils/weekPlan";
import { formatIngredientAmount } from "../utils/recipeFormatting";

const defaultTimes = {
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "20:00"
};

const mealOptions = [
  { type: "breakfast", icon: "🥣", name: "Breakfast" },
  { type: "lunch", icon: "🍱", name: "Lunch" },
  { type: "dinner", icon: "🍽️", name: "Dinner" }
];

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("q");

  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [servings, setServings] = useState(2);
  const [originalRecipe, setOriginalRecipe] = useState(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [addingMealPlan, setAddingMealPlan] = useState(false);
  const [mealPlanChoice, setMealPlanChoice] = useState({
    mealType: "",
    dayIndex: null,
    planDate: ""
  });

  const MODEL = "meta-llama/llama-3.1-8b-instruct";

  useEffect(() => {
    if (query) fetchRecipe();
  }, [query]);

  const normalizeTitle = (value) => {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  };

  const getRecipeCacheKey = () => `tasteTrailRecipe:${normalizeTitle(query)}:${servings}`;

  const getRecipeLabelForDate = (dateKey) => {
    if (!dateKey) return "";
    const week = getWeekFromDateKey(getMondayDateKey(dateKey));
    return week.find((day) => day.dateKey === dateKey)?.fullLabel || dateKey;
  };

  const getDayIndexForDate = (dateKey) => {
    const week = getWeekFromDateKey(getMondayDateKey(dateKey));
    const dayIndex = week.findIndex((day) => day.dateKey === dateKey);
    return dayIndex >= 0 ? dayIndex : 0;
  };

  const parseQuantity = (value) => {
    const normalized = String(value || "").trim();

    if (/^\d+\s+\d+\/\d+$/.test(normalized)) {
      const [whole, fraction] = normalized.split(/\s+/);
      const [numerator, denominator] = fraction.split("/").map(Number);
      return Number(whole) + (denominator ? numerator / denominator : 0);
    }

    if (normalized.includes("/")) {
      const [numerator, denominator] = normalized.split("/").map(Number);
      return denominator ? numerator / denominator : Number(normalized);
    }

    return Number(normalized);
  };

  const formatScaledAmount = (amount) => {
    const rounded = Math.round(amount * 8) / 8;
    const whole = Math.floor(rounded);
    const decimal = Number((rounded - whole).toFixed(3));

    const fractionMap = {
      0.125: "⅛",
      0.25: "¼",
      0.375: "⅜",
      0.5: "½",
      0.625: "⅝",
      0.75: "¾",
      0.875: "⅞"
    };

    if (decimal === 0) return String(whole);
    const fraction = fractionMap[decimal];
    if (!fraction) return Number(amount.toFixed(2)).toString();
    return whole > 0 ? `${whole}${fraction}` : fraction;
  };

  const getSavedRecipeFromDatabase = async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await fetch(apiUrl("/api/recipes/my-recipes"), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return null;

    const recipes = await res.json();
    const queryTitle = normalizeTitle(query);
    const savedRecipe = recipes.find((item) => normalizeTitle(item.title) === queryTitle);

    if (!savedRecipe) return null;

    return {
      name: savedRecipe.title,
      ingredients: savedRecipe.ingredients || [],
      steps: savedRecipe.steps || [],
      servings
    };
  };

  async function fetchRecipe() {
    setLoading(true);
    setError("");
    setRecipe(null);
    setOriginalRecipe(null);
    setIsSaved(false);

    // Check if query contains "jain" (case insensitive)
    const isJainRecipe = /jain/i.test(query);

    const systemPrompt = `
STRICT RULES:
- Output ONLY pure JSON.
- No markdown, no commentary.
- Default to vegetarian recipes for all generic searches and suggestions.
- Do not add meat, seafood, fish, chicken, eggs, or gelatin unless the user's query explicitly asks for a non-vegetarian recipe.
- For generic dishes that often have non-veg versions, choose vegetarian versions, for example veg biryani, paneer tikka, vegetable pizza, or veg noodles.
- Format must be:
{
  "name": "",
  "ingredients": ["", ""],
  "steps": ["", ""],
  "servings": 2
}

${isJainRecipe ? `
JAIN DIETARY RESTRICTIONS:
- NEVER use root vegetables: onion, garlic, potato, carrot, radish, beetroot, turnip, ginger
- Use alternatives: raw banana (kachcha kela) for potato when appropriate, ginger powder instead of fresh ginger
- Use asafoetida (hing) for flavor instead of onion/garlic
- Only suggest raw banana when it makes sense for the dish (not in every recipe)
- For Chinese/Indo-Chinese dishes, hakka noodles, use capsicum, cabbage, spring onion greens (only green part), mushrooms
- For bhel/chaat, use puffed rice, sev, tomatoes, cucumber, raw mango, coriander
- Be creative with Jain-friendly vegetables: cauliflower, peas, beans, capsicum, tomatoes, cucumber, cabbage, spinach, etc.
` : ''}
`;

    const userPrompt = `Generate a detailed recipe for ${servings} servings: ${query}`;

    try {
      const cachedRecipe = localStorage.getItem(getRecipeCacheKey());
      if (cachedRecipe) {
        const parsedCachedRecipe = JSON.parse(cachedRecipe);
        setOriginalRecipe(parsedCachedRecipe);
        setRecipe(parsedCachedRecipe);
        setLoading(false);
        return;
      }

      const savedRecipe = await getSavedRecipeFromDatabase();
      if (savedRecipe) {
        setOriginalRecipe(savedRecipe);
        setRecipe(savedRecipe);
        setIsSaved(true);
        localStorage.setItem(getRecipeCacheKey(), JSON.stringify(savedRecipe));
        setLoading(false);
        return;
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1200,
        }),
      });

      const data = await res.json();

      let raw = data?.choices?.[0]?.message?.content || "";

      raw = raw.replace(/```json|```/g, "").trim();

      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned invalid JSON");

      const parsed = JSON.parse(match[0]);
      
      // Store original recipe for scaling
      setOriginalRecipe(parsed);
      setRecipe(parsed);
      localStorage.setItem(getRecipeCacheKey(), JSON.stringify(parsed));

    } catch (err) {
      console.error(err);
      setError("Failed to generate recipe. Please try again.");
    }

    setLoading(false);
  }

  // Scale ingredients based on servings
  const scaleIngredients = (newServings) => {
    if (!originalRecipe) return;

    const originalServings = originalRecipe.servings || 2;
    const scaleFactor = newServings / originalServings;

    const scaledIngredients = originalRecipe.ingredients.map(ingredient => {
      const numberMatch = ingredient.match(/\b(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\b/);
      
      if (numberMatch) {
        const originalAmount = parseQuantity(numberMatch[1]);
        if (!Number.isFinite(originalAmount)) return ingredient;

        const scaledAmount = originalAmount * scaleFactor;
        const formattedAmount = formatScaledAmount(scaledAmount);
        
        return ingredient.replace(numberMatch[1], formattedAmount);
      }
      
      return ingredient;
    });

    setRecipe({
      ...originalRecipe,
      ingredients: scaledIngredients,
      servings: newServings
    });
  };

  const handleServingsChange = (newServings) => {
    if (newServings < 1 || newServings > 20) return;
    setServings(newServings);
    scaleIngredients(newServings);
  };

  // ⭐ SAVE TO BACKEND DATABASE
  const saveRecipe = async () => {
    if (!recipe || saving) return;

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(apiUrl("/api/recipes/save"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: recipe.name,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          image: "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to save recipe");
        setSaving(false);
        return;
      }

      setIsSaved(true);
      alert("✅ Recipe saved successfully! View it in your Saved Recipes.");

    } catch (err) {
      console.error(err);
      alert("❌ Could not save recipe. Please try again.");
    }

    setSaving(false);
  };

  const openMealPlanModal = () => {
    setMealPlanChoice({
      mealType: "",
      dayIndex: null,
      planDate: ""
    });
    setShowMealModal(true);
  };

  const addToMealPlan = async () => {
    const { mealType, dayIndex, planDate } = mealPlanChoice;

    if (!recipe || !mealType || dayIndex === null || !planDate || addingMealPlan) {
      alert("Please choose a meal and date first");
      return;
    }

    setAddingMealPlan(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(apiUrl("/api/meal-plans/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mealType,
          dayIndex,
          planDate,
          recipe: {
            id: "",
            title: recipe.name,
            ingredients: recipe.ingredients || [],
            steps: recipe.steps || [],
            image: ""
          },
          time: defaultTimes[mealType]
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to add to meal planner");
        return;
      }

      setIsSaved(true);
      setShowMealModal(false);
      alert(`✅ Added to ${mealType} for ${getRecipeLabelForDate(planDate)}!`);
    } catch (err) {
      console.error(err);
      alert("Failed to add to meal planner");
    } finally {
      setAddingMealPlan(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-4 mb-5">
        {/* Back Button */}
        <button 
          className="btn btn-outline-secondary mb-4"
          onClick={() => navigate("/home")}
        >
          ← Back to Home
        </button>

        {/* Header */}
        <div className="search-header mb-4">
          <h2 className="fw-bold">🔍 Search Results</h2>
          <p className="text-muted">Showing recipe for: <strong>"{query}"</strong></p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-warning" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-3">Generating your recipe with AI...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Recipe Display */}
        {recipe && (
          <div className="recipe-container">
            <div className="recipe-header-card shadow-sm p-4 mb-4 rounded">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div>
                  <h3 className="fw-bold mb-3">{recipe.name}</h3>
                  
                  {/* Servings Selector */}
                  <div className="servings-selector">
                    <label className="fw-semibold me-3">👥 Servings:</label>
                    <button 
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => handleServingsChange(servings - 1)}
                      disabled={servings <= 1}
                    >
                      −
                    </button>
                    <span className="mx-3 fw-bold fs-5">{servings}</span>
                    <button 
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => handleServingsChange(servings + 1)}
                      disabled={servings >= 20}
                    >
                      +
                    </button>
                    <small className="text-muted ms-3">
                      (Ingredients auto-scaled)
                    </small>
                  </div>
                </div>

                <button 
                  className={`btn ${isSaved ? 'btn-secondary' : 'btn-success'}`}
                  onClick={saveRecipe}
                  disabled={saving || isSaved}
                >
                  {saving ? '⏳ Saving...' : isSaved ? '✅ Saved!' : '❤️ Save Recipe'}
                </button>
              </div>
            </div>

            <div className="row g-4">
              {/* Ingredients Section */}
              <div className="col-md-5">
                <div className="ingredients-card shadow-sm p-4 rounded h-100">
                  <h5 className="fw-bold mb-3">
                    <span className="badge bg-warning text-dark me-2">📝</span>
                    Ingredients
                  </h5>
                  <ul className="ingredients-list">
                    {recipe.ingredients?.map((item, i) => (
                      <li key={i} className="ingredient-item">
                        <span className="ingredient-bullet">•</span>
                        {formatIngredientAmount(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Steps Section */}
              <div className="col-md-7">
                <div className="steps-card shadow-sm p-4 rounded h-100">
                  <h5 className="fw-bold mb-3">
                    <span className="badge bg-dark me-2">👨‍🍳</span>
                    Cooking Steps
                  </h5>
                  <ol className="steps-list">
                    {recipe.steps?.map((step, i) => (
                      <li key={i} className="step-item">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons mt-4 d-flex gap-3">
              <button 
                className="btn btn-warning flex-fill"
                onClick={() => window.print()}
              >
                🖨️ Print Recipe
              </button>
              <button 
                className="btn btn-success flex-fill"
                onClick={openMealPlanModal}
              >
                📅 Add to Meal Planner
              </button>
              <button 
                className="btn btn-outline-dark flex-fill"
                onClick={() => navigate("/saved")}
              >
                📚 View Saved Recipes
              </button>
            </div>
          </div>
        )}
      </div>

      {showMealModal && recipe && (
        <div className="meal-modal-overlay" onClick={() => setShowMealModal(false)}>
          <div className="meal-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="meal-modal-header">
              <div>
                <h4 className="fw-bold mb-1">Add to Meal Planner</h4>
                <p className="text-muted mb-0">{recipe.name}</p>
              </div>
              <button className="btn-close" onClick={() => setShowMealModal(false)}></button>
            </div>

            <div className="meal-modal-body">
              <h6 className="fw-bold mb-2">Meal</h6>
              <div className="meal-options">
                {mealOptions.map((meal) => (
                  <button
                    key={meal.type}
                    className={`meal-option-btn ${mealPlanChoice.mealType === meal.type ? "selected" : ""}`}
                    onClick={() => setMealPlanChoice((prev) => ({ ...prev, mealType: meal.type }))}
                  >
                    <span className="meal-icon">{meal.icon}</span>
                    <span className="meal-name">{meal.name}</span>
                  </button>
                ))}
              </div>

              <h6 className="fw-bold mt-4 mb-2">Day & Date</h6>
              <input
                type="date"
                className="meal-date-picker"
                value={mealPlanChoice.planDate}
                onChange={(event) => {
                  const planDate = event.target.value;
                  setMealPlanChoice((prev) => ({
                    ...prev,
                    dayIndex: getDayIndexForDate(planDate),
                    planDate
                  }));
                  event.currentTarget.blur();
                }}
              />
              {mealPlanChoice.planDate && (
                <p className="selected-date-label mb-0 mt-2">
                  {getRecipeLabelForDate(mealPlanChoice.planDate)}
                </p>
              )}

              <button
                className="btn btn-success w-100 mt-4"
                onClick={addToMealPlan}
                disabled={addingMealPlan || !mealPlanChoice.mealType || mealPlanChoice.dayIndex === null}
              >
                {addingMealPlan ? "Adding..." : "Save to Meal Planner"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .search-header {
          border-bottom: 3px solid #ffc107;
          padding-bottom: 16px;
        }

        .recipe-container {
          animation: fadeIn 0.5s ease-in;
        }

        .recipe-header-card {
          background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
          border: 2px solid #ffc107;
        }

        .servings-selector {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-radius: 10px;
          border: 2px solid #ffc107;
          margin-top: 8px;
        }

        .servings-selector button {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          font-size: 1.2rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .servings-selector button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .ingredients-card, .steps-card {
          background: white;
          border: 1px solid #e0e0e0;
        }

        .ingredients-list {
          list-style: none;
          padding: 0;
        }

        .ingredient-item {
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: flex-start;
        }

        .ingredient-item:last-child {
          border-bottom: none;
        }

        .ingredient-bullet {
          color: #ffc107;
          font-size: 1.5rem;
          margin-right: 12px;
          line-height: 1;
        }

        .steps-list {
          padding-left: 20px;
        }

        .step-item {
          padding: 12px 0;
          margin-bottom: 12px;
          border-left: 3px solid #ffc107;
          padding-left: 16px;
          line-height: 1.6;
        }

        .meal-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .meal-modal-content {
          width: min(640px, 100%);
          max-height: 88vh;
          overflow: hidden;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
          display: flex;
          flex-direction: column;
        }

        .meal-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid #e9ecef;
        }

        .meal-modal-body {
          padding: 24px;
          overflow-y: auto;
        }

        .meal-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .meal-option-btn,
        .date-option-btn {
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          background: #fff;
          transition: all 0.2s ease;
        }

        .meal-option-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px;
          font-weight: 700;
        }

        .meal-option-btn.selected,
        .date-option-btn.selected {
          border-color: #198754;
          background: #eaf7ef;
        }

        .meal-icon {
          font-size: 1.8rem;
        }

        .meal-option-btn:hover,
        .date-option-btn:hover {
          border-color: #ffc107;
          background: #fff9e6;
        }

        .meal-date-picker {
          width: 100%;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          padding: 12px 14px;
          font-weight: 700;
        }

        .meal-date-picker:focus {
          outline: none;
          border-color: #ffc107;
          box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.18);
        }

        .selected-date-label {
          color: #146c43;
          font-weight: 700;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media print {
          .btn, .search-header button {
            display: none;
          }
        }

        @media (max-width: 767.98px) {
          .recipe-header-card {
            padding: 18px !important;
          }

          .recipe-header-card > .d-flex {
            flex-direction: column;
          }

          .recipe-header-card > .d-flex > div,
          .recipe-header-card .btn-success,
          .recipe-header-card .btn-secondary {
            width: 100%;
          }

          .servings-selector {
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 10px;
          }

          .servings-selector label,
          .servings-selector small {
            width: 100%;
            margin-left: 0 !important;
          }

          .ingredients-card,
          .steps-card {
            padding: 18px !important;
          }

          .action-buttons {
            flex-direction: column;
          }

          .meal-modal-overlay {
            align-items: flex-end;
            padding: 12px;
          }

          .meal-modal-content {
            border-radius: 16px;
          }

          .meal-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
