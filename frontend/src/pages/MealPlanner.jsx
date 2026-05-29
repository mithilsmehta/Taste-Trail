import { API_BASE_URL, apiUrl } from "../utils/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMondayDateKey, getTomorrowDateKey, getWeekFromDateKey, parseDateKey, toDateKey } from "../utils/weekPlan";
import { getDisplayIngredients } from "../utils/recipeFormatting";
import "./MealPlanner.css";

const mealTypes = ["breakfast", "lunch", "dinner"];

const defaultTimes = {
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "20:00"
};

const emptyMealPlans = {
  breakfast: Array(7).fill(null),
  lunch: Array(7).fill(null),
  dinner: Array(7).fill(null)
};

export default function MealPlanner() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(getTomorrowDateKey());
  const weekStartDate = getMondayDateKey(selectedDate);
  const weekDays = getWeekFromDateKey(weekStartDate);
  const weekRangeLabel = `${weekDays[0].dateLabel} - ${weekDays[6].dateLabel}`;
  const [mealPlans, setMealPlans] = useState(emptyMealPlans);
  const [loading, setLoading] = useState(true);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);

  useEffect(() => {
    loadMealPlans();
    loadSavedRecipes();
  }, [weekStartDate]);

  const normalizeMealPlans = (data) => {
    const normalized = {
      breakfast: Array(7).fill(null),
      lunch: Array(7).fill(null),
      dinner: Array(7).fill(null)
    };

    mealTypes.forEach((mealType) => {
      if (Array.isArray(data?.[mealType])) {
        normalized[mealType] = [...data[mealType], ...Array(7).fill(null)].slice(0, 7);
      } else if (data?.[mealType]) {
        normalized[mealType][0] = data[mealType];
      }
    });

    return normalized;
  };

  const loadMealPlans = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/my?startDate=${weekDays[0].dateKey}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setMealPlans(normalizeMealPlans(data));
    } catch (err) {
      console.error(err);
      alert("Failed to load meal plans");
    }
    setLoading(false);
  };

  const loadSavedRecipes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/api/recipes/my-recipes"), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setSavedRecipes(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openRecipeModal = (mealType, dayIndex, planDate) => {
    setSelectedSlot({ mealType, dayIndex, planDate });
    setShowRecipeModal(true);
  };

  const shiftWeek = (amount) => {
    const date = parseDateKey(weekStartDate);
    date.setDate(date.getDate() + amount);
    setSelectedDate(toDateKey(date));
  };

  const assignRecipe = async (recipe) => {
    if (!selectedSlot) return;

    try {
      const token = localStorage.getItem("token");
      const { mealType, dayIndex, planDate } = selectedSlot;

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
            id: recipe._id,
            title: recipe.title,
            ingredients: recipe.ingredients,
            steps: recipe.steps,
            image: recipe.image || ""
          },
          time: defaultTimes[mealType]
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to assign recipe");
        return;
      }

      alert(`✅ Recipe assigned to ${mealType} for ${weekDays[dayIndex].fullLabel}!`);
      setShowRecipeModal(false);
      setSelectedSlot(null);
      loadMealPlans();
    } catch (err) {
      console.error(err);
      alert("Failed to assign recipe");
    }
  };

  const deleteMealPlan = async (mealPlan) => {
    if (!mealPlan) return;

    if (!confirm(`Remove "${mealPlan.recipe.title}" from your meal plan?`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/${mealPlan._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to delete");
        return;
      }

      alert("Meal plan deleted!");
      loadMealPlans();
    } catch (err) {
      console.error(err);
      alert("Failed to delete meal plan");
    }
  };

  const getMealIcon = (mealType) => {
    const icons = {
      breakfast: "🥣",
      lunch: "🍱",
      dinner: "🍽️"
    };
    return icons[mealType];
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading your meal plans...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container-fluid px-4 mt-4 mb-5">
        <button 
          className="btn btn-outline-secondary mb-4"
          onClick={() => navigate("/home")}
        >
          ← Back to Home
        </button>

        <div className="meal-planner-header mb-4">
          <div>
            <h2 className="fw-bold">📅 My 7-Day Meal Planner</h2>
            <p className="text-muted mb-0">Save recipes for breakfast, lunch, and dinner across the week</p>
          </div>

          <div className="week-navigation">
            <button
              className="week-arrow-btn"
              onClick={() => shiftWeek(-7)}
              aria-label="Previous 7 days"
            >
              ‹
            </button>
            <div className="week-range">
              <span>7 days</span>
              <strong>{weekRangeLabel}</strong>
              <input
                type="date"
                className="week-date-picker"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  event.currentTarget.blur();
                }}
                aria-label="Choose week date"
              />
            </div>
            <button
              className="week-arrow-btn"
              onClick={() => shiftWeek(7)}
              aria-label="Next 7 days"
            >
              ›
            </button>
          </div>
        </div>

        <div className="weekly-planner">
          <div className="planner-grid">
            <div className="planner-corner">Meal</div>
            {weekDays.map((day) => (
              <div key={day.dateKey} className="planner-day-header">
                <span className="planner-day-name">{day.dayName}</span>
                <span className="planner-date-label">{day.dateLabel}</span>
              </div>
            ))}

            {mealTypes.map((mealType) => (
              <div key={mealType} className="planner-row">
                <div className="planner-meal-label text-capitalize">
                  <span>{getMealIcon(mealType)}</span>
                  <strong>{mealType}</strong>
                  <small>{defaultTimes[mealType]}</small>
                </div>

                {weekDays.map((day, dayIndex) => {
                  const mealPlan = mealPlans[mealType]?.[dayIndex];

                  return (
                    <div key={`${mealType}-${day.dateKey}`} className="planner-slot">
                      {mealPlan ? (
                        <div className="planned-recipe">
                          <h6 className="fw-bold mb-2">{mealPlan.recipe.title}</h6>
                          <p className="text-muted small mb-3">
                            {getDisplayIngredients(mealPlan.recipe.ingredients).length} ingredients
                          </p>

                          <div className="slot-actions">
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => setSelectedPlan({ ...mealPlan, displayDayIndex: dayIndex })}
                            >
                              View
                            </button>
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => openRecipeModal(mealType, dayIndex, day.dateKey)}
                            >
                              Change
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => deleteMealPlan(mealPlan)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="empty-slot-btn"
                          onClick={() => openRecipeModal(mealType, dayIndex, day.dateKey)}
                        >
                          + Add Recipe
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="quick-actions">
          <button
            className="btn btn-success btn-lg me-3"
            onClick={() => navigate("/grocery-list")}
          >
            🛒 View Grocery List
          </button>
          <button
            className="btn btn-outline-dark btn-lg"
            onClick={() => navigate("/meal-settings")}
          >
            ⚙️ Meal Settings
          </button>
        </div>

        {showRecipeModal && selectedSlot && (
          <div className="modal-overlay" onClick={() => setShowRecipeModal(false)}>
            <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <h4 className="fw-bold mb-0">
                  Select Recipe for {getMealIcon(selectedSlot.mealType)} {selectedSlot.mealType} - {weekDays[selectedSlot.dayIndex].fullLabel}
                </h4>
                <button className="btn-close" onClick={() => setShowRecipeModal(false)}></button>
              </div>

              <div className="modal-body-custom">
                {savedRecipes.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No saved recipes yet.</p>
                    <button
                      className="btn btn-warning mt-2"
                      onClick={() => navigate("/home")}
                    >
                      Search Recipes
                    </button>
                  </div>
                ) : (
                  <div className="recipe-list">
                    {savedRecipes.map((recipe) => (
                      <div key={recipe._id} className="recipe-item" onClick={() => assignRecipe(recipe)}>
                        <h5 className="fw-bold mb-1">{recipe.title}</h5>
                        <p className="text-muted small mb-0">
                          {recipe.ingredients?.length || 0} ingredients
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedPlan && (
          <div className="modal-overlay" onClick={() => setSelectedPlan(null)}>
            <div className="modal-content-custom recipe-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <div>
                  <h4 className="fw-bold mb-1">{selectedPlan.recipe.title}</h4>
                  <p className="text-muted mb-0 text-capitalize">
                    {getMealIcon(selectedPlan.mealType)} {selectedPlan.mealType} - {weekDays[selectedPlan.displayDayIndex ?? selectedPlan.dayIndex ?? 0].fullLabel}
                  </p>
                </div>
                <button className="btn-close" onClick={() => setSelectedPlan(null)}></button>
              </div>

              <div className="modal-body-custom">
                <h5 className="fw-bold mb-3">Ingredients</h5>
                <div className="recipe-ingredient-list mb-4">
                  {getDisplayIngredients(selectedPlan.recipe.ingredients).map((ingredient, index) => (
                    <div key={index} className="recipe-ingredient-item">
                      <span className="ingredient-dot"></span>
                      <span>{ingredient}</span>
                    </div>
                  ))}
                </div>

                <h5 className="fw-bold mb-3">Cooking Steps</h5>
                <ol className="recipe-detail-list">
                  {selectedPlan.recipe.steps?.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
