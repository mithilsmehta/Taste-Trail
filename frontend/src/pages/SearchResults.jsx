import { apiUrl } from "../utils/api";
import { useEffect, useRef, useState } from "react";
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

const nonVegetarianPattern = /\b(chicken|mutton|beef|pork|fish|seafood|prawn|shrimp|eggs?|gelatin|bacon|ham|turkey|lamb|keema)\b/i;
const jainRestrictedPattern = /\b(onions?|garlic|potatoes?|aloo|carrots?|radish|beetroot|beet|turnip|ginger|sweet potato|yam|tapioca|cassava|arbi|colocasia|spring onion|green onion|scallion|leek|shallot)\b/i;

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("q");

  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customIngredient, setCustomIngredient] = useState("");
  const [hasIngredientChanges, setHasIngredientChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [servings, setServings] = useState(2);
  const [originalRecipe, setOriginalRecipe] = useState(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [addingMealPlan, setAddingMealPlan] = useState(false);
  const [mealPlanChoice, setMealPlanChoice] = useState({
    mealType: "",
    dayIndex: null,
    planDate: ""
  });
  const historyGuardActiveRef = useRef(false);

  useEffect(() => {
    if (query) fetchRecipe();
  }, [query]);

  useEffect(() => {
    if (!hasIngredientChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasIngredientChanges]);

  useEffect(() => {
    if (!hasIngredientChanges || historyGuardActiveRef.current) return undefined;

    historyGuardActiveRef.current = true;
    window.history.pushState({ recipeUnsavedGuard: true }, "");

    const handlePopState = () => {
      if (!hasIngredientChanges) return;
      setPendingNavigation("/home");
      setShowUnsavedModal(true);
      window.history.pushState({ recipeUnsavedGuard: true }, "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      historyGuardActiveRef.current = false;
    };
  }, [hasIngredientChanges]);

  const normalizeTitle = (value) => {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  };

  const getDietMode = () => {
    return localStorage.getItem("tastewiseDietMode") === "jain" ? "jain" : "veg";
  };

  const isJainSafeRecipe = (value) => {
    const text = [
      value?.name,
      value?.title,
      ...(Array.isArray(value?.ingredients) ? value.ingredients : [])
    ].join(" ");
    return !jainRestrictedPattern.test(text);
  };

  const isRecipeSafeForDietMode = (value) => {
    const text = [
      value?.name,
      value?.title,
      ...(Array.isArray(value?.ingredients) ? value.ingredients : []),
      ...(Array.isArray(value?.steps) ? value.steps : [])
    ].join(" ");
    if (nonVegetarianPattern.test(text)) return false;
    return getDietMode() !== "jain" || isJainSafeRecipe(value);
  };

  const getModeBlockedText = () => {
    return getDietMode() === "jain"
      ? "Jain mode blocks onion, garlic, ginger, potato, carrot, and root vegetables."
      : "Veg mode blocks non-vegetarian ingredients.";
  };

  const getRecipeCacheKey = () => `tastewiseRecipe:${getDietMode()}:${normalizeTitle(query)}:${servings}`;

  const getRecipeText = () => {
    if (!recipe) return "";

    const ingredients = getCleanIngredients(recipe.ingredients)
      .map((item, index) => `${index + 1}. ${formatIngredientAmount(item)}`)
      .join("\n");
    const steps = (recipe.steps || [])
      .map((step, index) => `${index + 1}. ${step}`)
      .join("\n");

    return `${recipe.name}\n\nIngredients:\n${ingredients}\n\nCooking Steps:\n${steps}`;
  };

  const getCleanIngredients = (ingredients = []) => {
    return ingredients
      .map((ingredient) => String(ingredient || "").trim())
      .filter(Boolean);
  };

  const getRecipeForSaving = () => {
    if (!recipe) return null;
    return {
      ...recipe,
      ingredients: getCleanIngredients(recipe.ingredients)
    };
  };

  const markRecipeCustomized = () => {
    setHasIngredientChanges(true);
    setIsSaved(false);
  };

  const requestNavigation = (target) => {
    if (!hasIngredientChanges) {
      navigate(target);
      return;
    }

    setPendingNavigation(target);
    setShowUnsavedModal(true);
  };

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
    if (!isRecipeSafeForDietMode(savedRecipe)) return null;

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
    setHasIngredientChanges(false);
    setCustomIngredient("");

    try {
      const cachedRecipe = localStorage.getItem(getRecipeCacheKey());
      if (cachedRecipe) {
        const parsedCachedRecipe = JSON.parse(cachedRecipe);
        if (!isRecipeSafeForDietMode(parsedCachedRecipe)) {
          localStorage.removeItem(getRecipeCacheKey());
        } else {
          setOriginalRecipe(parsedCachedRecipe);
          setRecipe(parsedCachedRecipe);
          setHasIngredientChanges(false);
          setLoading(false);
          return;
        }
      }

      const savedRecipe = await getSavedRecipeFromDatabase();
      if (savedRecipe) {
        setOriginalRecipe(savedRecipe);
        setRecipe(savedRecipe);
        setIsSaved(true);
        setHasIngredientChanges(false);
        localStorage.setItem(getRecipeCacheKey(), JSON.stringify(savedRecipe));
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/api/recipes/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query,
          servings,
          dietMode: getDietMode()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to generate recipe");
      }

      const parsed = data.recipe;

      if (!isRecipeSafeForDietMode(parsed)) {
        localStorage.removeItem(getRecipeCacheKey());
        throw new Error(`Generated recipe did not match ${getDietMode() === "jain" ? "Jain" : "Veg"} mode. ${getModeBlockedText()} Please generate again.`);
      }
      
      // Store original recipe for scaling
      setOriginalRecipe(parsed);
      setRecipe(parsed);
      setHasIngredientChanges(false);
      localStorage.setItem(getRecipeCacheKey(), JSON.stringify(parsed));

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate recipe. Please try again.");
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

  const updateIngredient = (index, value) => {
    setRecipe((prev) => {
      if (!prev) return prev;
      const nextIngredients = [...(prev.ingredients || [])];
      nextIngredients[index] = value;
      return { ...prev, ingredients: nextIngredients };
    });
    markRecipeCustomized();
  };

  const removeIngredient = (index) => {
    setRecipe((prev) => {
      if (!prev) return prev;
      const nextIngredients = (prev.ingredients || []).filter((_, itemIndex) => itemIndex !== index);
      return { ...prev, ingredients: nextIngredients };
    });
    markRecipeCustomized();
  };

  const addCustomIngredient = () => {
    const ingredient = customIngredient.trim();
    if (!ingredient) return;
    if (nonVegetarianPattern.test(ingredient)) {
      alert("Veg mode is strict, so non-veg ingredients cannot be added.");
      return;
    }
    if (getDietMode() === "jain" && jainRestrictedPattern.test(ingredient)) {
      alert("Jain mode is on, so this ingredient cannot be added.");
      return;
    }

    setRecipe((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ingredients: [...(prev.ingredients || []), ingredient]
      };
    });
    setCustomIngredient("");
    markRecipeCustomized();
  };

  // ⭐ SAVE TO BACKEND DATABASE
  const saveRecipe = async ({ silent = false } = {}) => {
    if (!recipe || saving) return false;
    if (!isRecipeSafeForDietMode(recipe)) {
      if (!silent) alert(`${getDietMode() === "jain" ? "Jain" : "Veg"} mode is on, so remove blocked ingredients before saving.`);
      return false;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      const recipeForSaving = getRecipeForSaving();

      const res = await fetch(apiUrl("/api/recipes/save"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: recipeForSaving.name,
          ingredients: recipeForSaving.ingredients,
          steps: recipeForSaving.steps,
          image: "",
          dietMode: getDietMode()
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (!silent) alert(data.msg || "Failed to save recipe");
        setSaving(false);
        return false;
      }

      setIsSaved(true);
      setHasIngredientChanges(false);
      const savedRecipe = {
        ...recipeForSaving,
        steps: recipeForSaving.steps || []
      };
      setRecipe(savedRecipe);
      setOriginalRecipe(savedRecipe);
      localStorage.setItem(getRecipeCacheKey(), JSON.stringify(savedRecipe));
      if (!silent) alert("✅ Recipe saved successfully! View it in your Saved Recipes.");
      setSaving(false);
      return true;

    } catch (err) {
      console.error(err);
      if (!silent) alert("❌ Could not save recipe. Please try again.");
    }

    setSaving(false);
    return false;
  };

  const continueAfterUnsavedChoice = (target = pendingNavigation) => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
    setHasIngredientChanges(false);
    if (target) navigate(target);
  };

  const saveAndContinue = async () => {
    const target = pendingNavigation;
    const saved = await saveRecipe({ silent: true });
    if (!saved) {
      alert("❌ Could not save recipe. Please try again.");
      return;
    }
    setShowUnsavedModal(false);
    setPendingNavigation(null);
    if (target) navigate(target);
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

      const recipeForSaving = getRecipeForSaving();
      if (!isRecipeSafeForDietMode(recipeForSaving)) {
        alert(`${getDietMode() === "jain" ? "Jain" : "Veg"} mode is on, so remove blocked ingredients before adding this recipe.`);
        return;
      }

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
            title: recipeForSaving.name,
            ingredients: recipeForSaving.ingredients || [],
            steps: recipeForSaving.steps || [],
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

  const copyRecipe = async () => {
    const recipeText = getRecipeText();
    if (!recipeText) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(recipeText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = recipeText;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      alert("✅ Recipe copied!");
    } catch (err) {
      console.error(err);
      alert("❌ Could not copy recipe. Please try again.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-4 mb-5">
        {/* Back Button */}
        <button 
          className="btn btn-outline-secondary mb-4"
          onClick={() => requestNavigation("/home")}
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

                <div className="d-flex flex-column gap-2">
                  <button 
                    className={`btn ${isSaved ? 'btn-secondary' : 'btn-success'}`}
                    onClick={saveRecipe}
                    disabled={saving || isSaved}
                  >
                    {saving ? '⏳ Saving...' : isSaved ? '✅ Saved!' : '❤️ Save Recipe'}
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={openMealPlanModal}
                  >
                    📅 Add to Meal Planner
                  </button>
                </div>
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
                      <li key={i} className="ingredient-item editable-ingredient-item">
                        <span className="ingredient-bullet">•</span>
                        <input
                          type="text"
                          className="ingredient-edit-input"
                          value={item}
                          onChange={(event) => updateIngredient(i, event.target.value)}
                          aria-label={`Edit ingredient ${i + 1}`}
                        />
                        <button
                          type="button"
                          className="ingredient-remove-btn"
                          onClick={() => removeIngredient(i)}
                          aria-label={`Remove ${item}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="add-ingredient-row mt-3">
                    <input
                      type="text"
                      className="form-control"
                      value={customIngredient}
                      onChange={(event) => setCustomIngredient(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomIngredient();
                        }
                      }}
                      placeholder="Add ingredient manually"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-warning"
                      onClick={addCustomIngredient}
                    >
                      Add
                    </button>
                  </div>
                  {hasIngredientChanges && (
                    <p className="customized-recipe-note mt-3 mb-0">
                      Custom changes will be saved with this recipe.
                    </p>
                  )}
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
                className="btn btn-outline-success flex-fill"
                onClick={copyRecipe}
              >
                📋 Copy Recipe
              </button>
              <button 
                className="btn btn-outline-dark flex-fill"
                onClick={() => requestNavigation("/saved")}
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

      {showUnsavedModal && (
        <div className="meal-modal-overlay" onClick={() => setShowUnsavedModal(false)}>
          <div className="unsaved-recipe-modal" onClick={(event) => event.stopPropagation()}>
            <div className="meal-modal-header">
              <div>
                <h4 className="fw-bold mb-1">Save Your Customized Recipe?</h4>
                <p className="text-muted mb-0">
                  You changed the ingredients but have not saved them yet.
                </p>
              </div>
              <button className="btn-close" onClick={() => setShowUnsavedModal(false)}></button>
            </div>
            <div className="meal-modal-body">
              <p className="mb-4">
                Save this customized recipe to your Saved Recipes before leaving?
              </p>
              <div className="unsaved-actions">
                <button className="btn btn-success" onClick={saveAndContinue} disabled={saving}>
                  {saving ? "Saving..." : "Yes, Save"}
                </button>
                <button className="btn btn-outline-danger" onClick={() => continueAfterUnsavedChoice()}>
                  Leave Without Saving
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setShowUnsavedModal(false)}>
                  Keep Editing
                </button>
              </div>
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

        .editable-ingredient-item {
          align-items: center;
          gap: 10px;
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

        .ingredient-edit-input {
          flex: 1;
          min-width: 0;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 9px 10px;
          font: inherit;
          background: #fff;
        }

        .ingredient-edit-input:focus {
          outline: none;
          border-color: #ffc107;
          box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.16);
        }

        .ingredient-remove-btn {
          width: 34px;
          height: 34px;
          border: 1px solid #dc3545;
          border-radius: 8px;
          background: #fff;
          color: #dc3545;
          font-size: 1.3rem;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .ingredient-remove-btn:hover {
          background: #dc3545;
          color: #fff;
        }

        .add-ingredient-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
        }

        .customized-recipe-note {
          color: #146c43;
          font-weight: 700;
          background: #eaf7ef;
          border: 1px solid #badbcc;
          border-radius: 10px;
          padding: 10px 12px;
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

        .unsaved-recipe-modal {
          width: min(560px, 100%);
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
          overflow: hidden;
        }

        .unsaved-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
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

          .add-ingredient-row,
          .unsaved-actions {
            grid-template-columns: 1fr;
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
