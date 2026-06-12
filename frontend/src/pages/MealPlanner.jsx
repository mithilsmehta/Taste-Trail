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

const plannerViewPreferenceKey = "tastewisePlannerView";
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const shortWeekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [allMealPlans, setAllMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plannerView, setPlannerView] = useState(() => localStorage.getItem(plannerViewPreferenceKey) || "week");
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showCalendarDayModal, setShowCalendarDayModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [calendarDate, setCalendarDate] = useState(selectedDate);
  const [calendarMealType, setCalendarMealType] = useState("breakfast");
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [recipeSearch, setRecipeSearch] = useState("");

  useEffect(() => {
    loadMealPlans();
    loadAllMealPlans();
    loadSavedRecipes();
  }, [weekStartDate]);

  useEffect(() => {
    localStorage.setItem(plannerViewPreferenceKey, plannerView);
  }, [plannerView]);

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

  const loadAllMealPlans = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/api/meal-plans/all"), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setAllMealPlans(Array.isArray(data) ? data.filter((plan) => plan?.planDate && plan?.recipe?.title) : []);
    } catch (err) {
      console.error(err);
    }
  };

  const openRecipeModal = (mealType, dayIndex, planDate) => {
    setSelectedSlot({ mealType, dayIndex, planDate });
    setRecipeSearch("");
    setShowRecipeModal(true);
  };

  const normalizeTitle = (value) => {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  };

  const searchedRecipes = savedRecipes.filter((recipe) => {
    const search = normalizeTitle(recipeSearch);
    if (!search) return true;
    return normalizeTitle(recipe.title).includes(search);
  });

  const exactSavedRecipe = savedRecipes.find((recipe) => {
    const search = normalizeTitle(recipeSearch);
    return search && normalizeTitle(recipe.title) === search;
  });

  const handleSearchAction = () => {
    const search = recipeSearch.trim();
    if (!search) {
      alert("Please type a recipe name first");
      return;
    }

    if (exactSavedRecipe) {
      assignRecipe(exactSavedRecipe);
      return;
    }

    setShowRecipeModal(false);
    setSelectedSlot(null);
    navigate(`/search?q=${encodeURIComponent(search)}`);
  };

  const handleCalendarSearchAction = () => {
    const search = recipeSearch.trim();
    if (!search) {
      alert("Please type a recipe name first");
      return;
    }

    const slot = {
      mealType: calendarMealType,
      dayIndex: getDayIndexForDate(calendarDate),
      planDate: calendarDate
    };

    if (exactSavedRecipe) {
      assignRecipe(exactSavedRecipe, slot);
      return;
    }

    setShowCalendarDayModal(false);
    navigate(`/search?q=${encodeURIComponent(search)}`);
  };

  const shiftWeek = (amount) => {
    const date = parseDateKey(weekStartDate);
    date.setDate(date.getDate() + amount);
    setSelectedDate(toDateKey(date));
  };

  const assignRecipe = async (recipe, slotOverride = selectedSlot) => {
    if (!slotOverride) return;

    try {
      const token = localStorage.getItem("token");
      const { mealType, dayIndex, planDate } = slotOverride;

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

      alert(`✅ Recipe assigned to ${mealType} for ${getRecipeLabelForDate(planDate)}!`);
      setShowRecipeModal(false);
      setShowCalendarDayModal(false);
      setSelectedSlot(null);
      setRecipeSearch("");
      loadMealPlans();
      loadAllMealPlans();
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
      loadAllMealPlans();
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

  const getDayIndexForDate = (dateKey) => {
    const week = getWeekFromDateKey(getMondayDateKey(dateKey));
    const dayIndex = week.findIndex((day) => day.dateKey === dateKey);
    return dayIndex >= 0 ? dayIndex : 0;
  };

  const getRecipeLabelForDate = (dateKey) => {
    if (!dateKey) return "";
    const week = getWeekFromDateKey(getMondayDateKey(dateKey));
    return week.find((day) => day.dateKey === dateKey)?.fullLabel || dateKey;
  };

  const getMonthDays = () => {
    const selected = parseDateKey(calendarDate);
    const firstOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const firstGridDay = new Date(firstOfMonth);
    firstGridDay.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstGridDay);
      date.setDate(firstGridDay.getDate() + index);
      return {
        date,
        dateKey: toDateKey(date),
        dayNumber: date.getDate(),
        inMonth: date.getMonth() === selected.getMonth()
      };
    });
  };

  const shiftMonth = (amount) => {
    const date = parseDateKey(calendarDate);
    date.setMonth(date.getMonth() + amount);
    setCalendarDate(toDateKey(date));
  };

  const openCalendarDay = (dateKey, mealType = "breakfast") => {
    setCalendarDate(dateKey);
    setCalendarMealType(mealType);
    setRecipeSearch("");
    setShowCalendarDayModal(true);
  };

  const getMealPlansForDate = (dateKey) => {
    return mealTypes.reduce((plans, mealType) => {
      plans[mealType] = allMealPlans.find((plan) => plan.planDate === dateKey && plan.mealType === mealType) || null;
      return plans;
    }, {});
  };

  const getCalendarMealPlan = (mealType = calendarMealType, dateKey = calendarDate) => {
    return allMealPlans.find((plan) => plan.planDate === dateKey && plan.mealType === mealType) || null;
  };

  const getCalendarTitle = () => {
    const date = parseDateKey(calendarDate);
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
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
            <h2 className="fw-bold">📅 My Meal Planner</h2>
            <p className="text-muted mb-0">Save recipes for breakfast, lunch, and dinner across your schedule</p>
          </div>

          {/* Planner view switch kept for later use.
          <div className="planner-view-switch" aria-label="Planner view">
            <button
              className={plannerView === "week" ? "active" : ""}
              onClick={() => setPlannerView("week")}
            >
              7-Day
            </button>
            <button
              className={plannerView === "calendar" ? "active" : ""}
              onClick={() => setPlannerView("calendar")}
            >
              Calendar
            </button>
          </div>
          */}

          {plannerView === "week" && (
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
          )}
        </div>

        {plannerView === "week" ? (
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
        ) : (
          <div className="calendar-planner">
            <div className="calendar-toolbar">
              <div>
                <h3>
                  <span className="calendar-month-name">{monthNames[parseDateKey(calendarDate).getMonth()]}</span>
                  <span className="calendar-year-number"> {parseDateKey(calendarDate).getFullYear()}</span>
                </h3>
                <p>Click any date to add or manage breakfast, lunch, and dinner.</p>
              </div>
              <div className="calendar-toolbar-actions">
                <button className="week-arrow-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
                <button className="btn btn-outline-dark" onClick={() => setCalendarDate(toDateKey(new Date()))}>Today</button>
                <button className="week-arrow-btn" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
              </div>
            </div>

            <div className="calendar-grid">
              {shortWeekDays.map((day) => (
                <div key={day} className="calendar-weekday">{day}</div>
              ))}
              {getMonthDays().map((day) => {
                const plans = getMealPlansForDate(day.dateKey);

                return (
                  <button
                    key={day.dateKey}
                    className={`calendar-day ${day.inMonth ? "" : "muted"} ${day.dateKey === toDateKey(new Date()) ? "today" : ""}`}
                    onClick={() => openCalendarDay(day.dateKey)}
                  >
                    <span className="calendar-day-number">{day.dayNumber}</span>
                    <div className="calendar-meal-stack">
                      {mealTypes.map((mealType) => (
                        plans[mealType] ? (
                          <span key={mealType} className={`calendar-meal-pill ${mealType}`}>
                            <span className="calendar-meal-pill-icon">{getMealIcon(mealType)}</span>
                            <span className="calendar-meal-pill-title">{plans[mealType].recipe.title}</span>
                          </span>
                        ) : null
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                <div className="recipe-search-row">
                  <input
                    type="search"
                    className="form-control recipe-search-input"
                    value={recipeSearch}
                    onChange={(event) => setRecipeSearch(event.target.value)}
                    placeholder="Search saved recipes or type a new recipe"
                    autoFocus
                  />
                  <button
                    className="btn btn-success recipe-search-action"
                    onClick={handleSearchAction}
                  >
                    {exactSavedRecipe ? "Add Saved" : "Generate"}
                  </button>
                </div>

                {savedRecipes.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No saved recipes yet. Type a recipe name and generate it.</p>
                    <button
                      className="btn btn-warning mt-2"
                      onClick={() => navigate("/home")}
                    >
                      Search Recipes
                    </button>
                  </div>
                ) : searchedRecipes.length === 0 ? (
                  <div className="recipe-empty-state">
                    <p className="fw-semibold mb-1">No saved recipe found</p>
                    <p className="text-muted mb-0">
                      ₹ "{recipeSearch.trim()}" and add it after the recipe opens.
                    </p>
                  </div>
                ) : (
                  <div className="recipe-list">
                    {searchedRecipes.map((recipe) => (
                      <div key={recipe._id} className="recipe-item" onClick={() => assignRecipe(recipe)}>
                        <div className="recipe-card-icon">{getMealIcon(selectedSlot.mealType)}</div>
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

        {showCalendarDayModal && (
          <div className="modal-overlay" onClick={() => setShowCalendarDayModal(false)}>
            <div className="modal-content-custom calendar-day-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <div>
                  <h4 className="fw-bold mb-1">{getRecipeLabelForDate(calendarDate)}</h4>
                  <p className="text-muted mb-0">Choose a meal, then add or manage a recipe.</p>
                </div>
                <button className="btn-close" onClick={() => setShowCalendarDayModal(false)}></button>
              </div>

              <div className="modal-body-custom">
                <div className="calendar-meal-tabs">
                  {mealTypes.map((mealType) => {
                    const plan = getCalendarMealPlan(mealType, calendarDate);
                    return (
                      <button
                        key={mealType}
                        className={calendarMealType === mealType ? "active" : ""}
                        onClick={() => setCalendarMealType(mealType)}
                      >
                        <span>{getMealIcon(mealType)}</span>
                        <strong>{mealType}</strong>
                        {plan && <small>{plan.recipe.title}</small>}
                      </button>
                    );
                  })}
                </div>

                {getCalendarMealPlan() && (
                  <div className="calendar-selected-plan">
                    <div>
                      <strong>{getCalendarMealPlan().recipe.title}</strong>
                      <span>{getDisplayIngredients(getCalendarMealPlan().recipe.ingredients).length} ingredients</span>
                    </div>
                    <div className="calendar-selected-actions">
                      <button className="btn btn-warning btn-sm" onClick={() => setSelectedPlan({ ...getCalendarMealPlan(), displayDate: calendarDate })}>
                        View
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => deleteMealPlan(getCalendarMealPlan())}>
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <div className="recipe-search-row">
                  <input
                    type="search"
                    className="form-control recipe-search-input"
                    value={recipeSearch}
                    onChange={(event) => setRecipeSearch(event.target.value)}
                    placeholder={`Search saved recipes or type a new ${calendarMealType} recipe`}
                    autoFocus
                  />
                  <button className="btn btn-success recipe-search-action" onClick={handleCalendarSearchAction}>
                    {exactSavedRecipe ? "Add Saved" : "Generate"}
                  </button>
                </div>

                {searchedRecipes.length === 0 ? (
                  <div className="recipe-empty-state">
                    <p className="fw-semibold mb-1">No saved recipe found</p>
                    <p className="text-muted mb-0">
                      Type a recipe name and click Generate to create it.
                    </p>
                  </div>
                ) : (
                  <div className="recipe-list">
                    {searchedRecipes.map((recipe) => (
                      <div
                        key={recipe._id}
                        className="recipe-item"
                        onClick={() => assignRecipe(recipe, {
                          mealType: calendarMealType,
                          dayIndex: getDayIndexForDate(calendarDate),
                          planDate: calendarDate
                        })}
                      >
                        <div className="recipe-card-icon">{getMealIcon(calendarMealType)}</div>
                        <h5 className="fw-bold mb-1">{recipe.title}</h5>
                        <p className="text-muted small mb-0">{recipe.ingredients?.length || 0} ingredients</p>
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
                    {getMealIcon(selectedPlan.mealType)} {selectedPlan.mealType} - {selectedPlan.displayDate ? getRecipeLabelForDate(selectedPlan.displayDate) : weekDays[selectedPlan.displayDayIndex ?? selectedPlan.dayIndex ?? 0].fullLabel}
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
