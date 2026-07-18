import { API_BASE_URL, apiUrl } from "../utils/api";
import { useEffect, useRef, useState } from "react";
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

const mobileTapRemoveMs = 700;
const mobileDragReadyMs = 2000;
const mobileOpenRecipeMs = 3000;
const mobileTapMoveTolerance = 10;
const mobileHoldMoveTolerance = 28;
const mobileDragMoveTolerance = 16;

const plannerViewPreferenceKey = "tastewisePlannerView";
const mobilePlannerNotesKeyPrefix = "tastewisePlannerNotes";
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
  breakfast: Array.from({ length: 7 }, () => []),
  lunch: Array.from({ length: 7 }, () => []),
  dinner: Array.from({ length: 7 }, () => [])
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
  const [mobileDragPlan, setMobileDragPlan] = useState(null);
  const [mobileDragOverSlot, setMobileDragOverSlot] = useState(null);
  const [mobileDragPosition, setMobileDragPosition] = useState(null);
  const [mobileNotes, setMobileNotes] = useState({});
  const [activeMobileCommentDay, setActiveMobileCommentDay] = useState("");
  const [addingRecipeIds, setAddingRecipeIds] = useState([]);
  const mobilePressRef = useRef(null);
  const tempMealPlanCounterRef = useRef(0);
  const suppressNextAddOpenRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(plannerViewPreferenceKey, plannerView);
  }, [plannerView]);

  useEffect(() => {
    const notesTimer = window.setTimeout(() => {
      try {
        const storedNotes = localStorage.getItem(`${mobilePlannerNotesKeyPrefix}:${weekStartDate}`);
        setMobileNotes(storedNotes ? JSON.parse(storedNotes) : {});
      } catch (err) {
        console.error(err);
        setMobileNotes({});
      }
    }, 0);

    return () => window.clearTimeout(notesTimer);
  }, [weekStartDate]);

  const normalizeMealPlans = (data) => {
    const normalized = {
      breakfast: Array.from({ length: 7 }, () => []),
      lunch: Array.from({ length: 7 }, () => []),
      dinner: Array.from({ length: 7 }, () => [])
    };

    mealTypes.forEach((mealType) => {
      if (Array.isArray(data?.[mealType])) {
        normalized[mealType] = [...data[mealType], ...Array(7).fill([])].slice(0, 7).map((slot) => {
          if (Array.isArray(slot)) return slot.filter(Boolean);
          return slot ? [slot] : [];
        });
      } else if (data?.[mealType]) {
        normalized[mealType][0] = [data[mealType]];
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

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadMealPlans();
      loadAllMealPlans();
      loadSavedRecipes();
    }, 0);

    return () => window.clearTimeout(loadTimer);
    // Reload when the selected week changes; loader functions own their own request state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDate]);

  const openRecipeModal = (mealType, dayIndex, planDate) => {
    if (suppressNextAddOpenRef.current) return;
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
      assignRecipe(exactSavedRecipe, selectedSlot, { keepModalOpen: true });
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
      assignRecipe(exactSavedRecipe, slot, { keepModalOpen: true });
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

  const assignRecipe = async (recipe, slotOverride = selectedSlot, options = {}) => {
    if (!slotOverride) return;

    tempMealPlanCounterRef.current += 1;
    const tempMealPlanId = `temp-${recipe._id || "recipe"}-${slotOverride.mealType}-${slotOverride.planDate}-${tempMealPlanCounterRef.current}`;
    try {
      const token = localStorage.getItem("token");
      const { mealType, dayIndex, planDate } = slotOverride;
      const tempMealPlan = {
        _id: tempMealPlanId,
        mealType,
        dayIndex,
        planDate,
        recipe: {
          id: recipe._id,
          title: recipe.title,
          description: recipe.description || "",
          ingredients: recipe.ingredients || [],
          steps: recipe.steps || [],
          image: recipe.image || "",
          nutrition: recipe.nutrition
        },
        time: defaultTimes[mealType]
      };

      setAddingRecipeIds((currentIds) => [...currentIds, recipe._id || tempMealPlanId]);
      addPlanToLocalState(tempMealPlan);

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
        removePlanFromLocalState(tempMealPlanId);
        alert(data.msg || "Failed to assign recipe");
        return;
      }

      removePlanFromLocalState(tempMealPlanId);
      addPlanToLocalState(data.mealPlan);

      if (!options.keepModalOpen) {
        setShowRecipeModal(false);
        setShowCalendarDayModal(false);
        setSelectedSlot(null);
        setRecipeSearch("");
      }
    } catch (err) {
      removePlanFromLocalState(tempMealPlanId);
      console.error(err);
      alert("Failed to assign recipe");
    } finally {
      setAddingRecipeIds((currentIds) => currentIds.filter((id) => id !== (recipe._id || tempMealPlanId)));
    }
  };

  const deleteMealPlan = async (mealPlan) => {
    if (!mealPlan) return;

    if (!confirm(`Remove "${mealPlan.recipe.title}" from your meal plan?`)) return;

    removePlanFromLocalState(mealPlan._id);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/${mealPlan._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        addPlanToLocalState(mealPlan);
        alert(data.msg || "Failed to delete");
        return;
      }
    } catch (err) {
      addPlanToLocalState(mealPlan);
      console.error(err);
      alert("Failed to delete meal plan");
    }
  };

  const deleteMealPlanQuietly = async (mealPlan) => {
    if (!mealPlan) return;

    suppressNextAddOpenRef.current = true;
    window.setTimeout(() => {
      suppressNextAddOpenRef.current = false;
    }, 350);
    removePlanFromLocalState(mealPlan._id);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/${mealPlan._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        addPlanToLocalState(mealPlan);
        alert(data.msg || "Failed to delete");
        return;
      }
    } catch (err) {
      addPlanToLocalState(mealPlan);
      console.error(err);
      alert("Failed to delete meal plan");
    }
  };

  const isMobilePlannerInteraction = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 991.98px)").matches;

  const getMobileSlotKey = (mealType, dayIndex) => `${mealType}-${dayIndex}`;

  const getSlotPlans = (mealType, dayIndex) => {
    const slot = mealPlans[mealType]?.[dayIndex];
    if (Array.isArray(slot)) return slot.filter(Boolean);
    return slot ? [slot] : [];
  };

  const addPlanToLocalState = (mealPlan) => {
    if (!mealPlan?.mealType || !Number.isInteger(mealPlan.dayIndex)) return;

    setMealPlans((currentPlans) => ({
      ...currentPlans,
      [mealPlan.mealType]: currentPlans[mealPlan.mealType].map((slotPlans, index) => {
        if (index !== mealPlan.dayIndex) return slotPlans;
        const plans = Array.isArray(slotPlans) ? slotPlans : slotPlans ? [slotPlans] : [];
        if (plans.some((plan) => plan._id === mealPlan._id)) {
          return plans.map((plan) => plan._id === mealPlan._id ? mealPlan : plan);
        }
        return [...plans, mealPlan];
      })
    }));

    setAllMealPlans((currentPlans) => {
      if (currentPlans.some((plan) => plan._id === mealPlan._id)) {
        return currentPlans.map((plan) => plan._id === mealPlan._id ? mealPlan : plan);
      }
      return [...currentPlans, mealPlan];
    });
  };

  const removePlanFromLocalState = (mealPlanId) => {
    setMealPlans((currentPlans) => mealTypes.reduce((nextPlans, mealType) => {
      nextPlans[mealType] = currentPlans[mealType].map((slotPlans) => {
        const plans = Array.isArray(slotPlans) ? slotPlans : slotPlans ? [slotPlans] : [];
        return plans.filter((plan) => plan._id !== mealPlanId);
      });
      return nextPlans;
    }, {}));

    setAllMealPlans((currentPlans) => currentPlans.filter((plan) => plan._id !== mealPlanId));
  };

  const movePlanInLocalState = (mealPlan, target) => {
    if (!mealPlan || !target) return;
    const movedPlan = {
      ...mealPlan,
      mealType: target.mealType,
      dayIndex: target.dayIndex,
      planDate: target.planDate,
      time: defaultTimes[target.mealType]
    };

    setMealPlans((currentPlans) => {
      const withoutMovedPlan = mealTypes.reduce((nextPlans, mealType) => {
        nextPlans[mealType] = currentPlans[mealType].map((slotPlans) => {
          const plans = Array.isArray(slotPlans) ? slotPlans : slotPlans ? [slotPlans] : [];
          return plans.filter((plan) => plan._id !== mealPlan._id);
        });
        return nextPlans;
      }, {});

      withoutMovedPlan[target.mealType] = withoutMovedPlan[target.mealType].map((slotPlans, index) => (
        index === target.dayIndex ? [...slotPlans, movedPlan] : slotPlans
      ));

      return withoutMovedPlan;
    });

    setAllMealPlans((currentPlans) => currentPlans.map((plan) => plan._id === mealPlan._id ? movedPlan : plan));
  };

  const updateMobileNote = (dateKey, value) => {
    setMobileNotes((currentNotes) => {
      const nextNotes = { ...currentNotes, [dateKey]: value };
      localStorage.setItem(`${mobilePlannerNotesKeyPrefix}:${weekStartDate}`, JSON.stringify(nextNotes));
      return nextNotes;
    });
  };

  const clearMobilePressTimers = () => {
    const pressState = mobilePressRef.current;
    if (!pressState) return;
    window.clearTimeout(pressState.dragTimer);
    window.clearTimeout(pressState.viewTimer);
  };

  const finishMobilePress = () => {
    clearMobilePressTimers();
    mobilePressRef.current = null;
    setMobileDragPlan(null);
    setMobileDragOverSlot(null);
    setMobileDragPosition(null);
  };

  const getDropSlotFromPoint = (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    return element?.closest("[data-mobile-drop-slot]") || null;
  };

  const moveMealPlan = async (mealPlan, target) => {
    if (!mealPlan || !target) return;
    if (mealPlan.mealType === target.mealType && mealPlan.dayIndex === target.dayIndex && mealPlan.planDate === target.planDate) {
      return;
    }

    movePlanInLocalState(mealPlan, target);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/${mealPlan._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mealType: target.mealType,
          dayIndex: target.dayIndex,
          planDate: target.planDate,
          time: defaultTimes[target.mealType]
        })
      });

      const data = await res.json();
      if (!res.ok) {
        movePlanInLocalState({ ...mealPlan, ...target }, {
          mealType: mealPlan.mealType,
          dayIndex: mealPlan.dayIndex,
          planDate: mealPlan.planDate
        });
        alert(data.msg || "Failed to move meal plan");
        return;
      }

      addPlanToLocalState(data.mealPlan);
    } catch (err) {
      movePlanInLocalState({ ...mealPlan, ...target }, {
        mealType: mealPlan.mealType,
        dayIndex: mealPlan.dayIndex,
        planDate: mealPlan.planDate
      });
      console.error(err);
      alert("Failed to move meal plan");
    }
  };

  const handleMobileRecipePointerDown = (event, mealPlan, mealType, dayIndex, planDate) => {
    if (!isMobilePlannerInteraction() || !mealPlan) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearMobilePressTimers();

    const pressState = {
      mealPlan,
      mealType,
      dayIndex,
      planDate,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAt: event.timeStamp,
      dragReady: false,
      dragging: false,
      moved: false,
      opened: false,
      dragTimer: 0,
      viewTimer: 0
    };

    pressState.dragTimer = window.setTimeout(() => {
      pressState.dragReady = true;
      setMobileDragPlan(mealPlan);
      setMobileDragPosition({
        x: pressState.startX,
        y: pressState.startY,
        title: mealPlan.recipe.title,
        mealType
      });
    }, mobileDragReadyMs);

    pressState.viewTimer = window.setTimeout(() => {
      if (!pressState.dragging) {
        pressState.opened = true;
        setSelectedPlan({ ...mealPlan, displayDayIndex: dayIndex });
        finishMobilePress();
      }
    }, mobileOpenRecipeMs);

    mobilePressRef.current = pressState;
  };

  const handleMobileRecipePointerMove = (event) => {
    const pressState = mobilePressRef.current;
    if (!pressState || pressState.pointerId !== event.pointerId || !isMobilePlannerInteraction()) return;

    const movement = Math.hypot(event.clientX - pressState.startX, event.clientY - pressState.startY);
    if (movement > mobileTapMoveTolerance) {
      pressState.moved = true;
    }

    if (!pressState.dragReady && movement > mobileHoldMoveTolerance) {
      window.clearTimeout(pressState.viewTimer);
    }

    if (!pressState.dragReady) return;
    if (movement < mobileDragMoveTolerance) return;

    event.preventDefault();
    pressState.dragging = true;
    window.clearTimeout(pressState.viewTimer);
    setMobileDragPosition({
      x: event.clientX,
      y: event.clientY,
      title: pressState.mealPlan.recipe.title,
      mealType: pressState.mealType
    });

    const slot = getDropSlotFromPoint(event.clientX, event.clientY);
    if (!slot) {
      setMobileDragOverSlot(null);
      return;
    }

    setMobileDragOverSlot(getMobileSlotKey(slot.dataset.mealType, Number(slot.dataset.dayIndex)));
  };

  const handleMobileRecipePointerUp = (event) => {
    const pressState = mobilePressRef.current;
    if (!pressState || pressState.pointerId !== event.pointerId || !isMobilePlannerInteraction()) return;

    event.preventDefault();
    const elapsed = event.timeStamp - pressState.startAt;

    if (pressState.dragging) {
      const slot = getDropSlotFromPoint(event.clientX, event.clientY);
      if (slot) {
        moveMealPlan(pressState.mealPlan, {
          mealType: slot.dataset.mealType,
          dayIndex: Number(slot.dataset.dayIndex),
          planDate: slot.dataset.planDate
        });
      }
      finishMobilePress();
      return;
    }

    if (!pressState.opened && !pressState.moved && elapsed < mobileTapRemoveMs) {
      deleteMealPlanQuietly(pressState.mealPlan);
    }

    finishMobilePress();
  };

  const handleMobileRecipePointerCancel = (event) => {
    const pressState = mobilePressRef.current;
    if (!pressState || pressState.pointerId !== event.pointerId) return;
    finishMobilePress();
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
                  const slotPlans = getSlotPlans(mealType, dayIndex);

                  return (
                    <div
                      key={`${mealType}-${day.dateKey}`}
                      className={`planner-slot ${mobileDragOverSlot === getMobileSlotKey(mealType, dayIndex) ? "mobile-drop-target" : ""}`}
                      data-mobile-drop-slot="true"
                      data-meal-type={mealType}
                      data-day-index={dayIndex}
                      data-plan-date={day.dateKey}
                    >
                      <span className="mobile-slot-date">{day.dayName} • {day.dateLabel}</span>
                      {slotPlans.length > 0 ? (
                        <div className="planned-recipes-stack">
                          {slotPlans.map((mealPlan) => (
                            <div
                              key={mealPlan._id}
                              className={`planned-recipe ${mobileDragPlan?._id === mealPlan._id ? "mobile-drag-source" : ""}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onPointerDown={(event) => handleMobileRecipePointerDown(event, mealPlan, mealType, dayIndex, day.dateKey)}
                              onPointerMove={handleMobileRecipePointerMove}
                              onPointerUp={handleMobileRecipePointerUp}
                              onPointerCancel={handleMobileRecipePointerCancel}
                            >
                              <h6 className="fw-bold mb-2">{mealPlan.recipe.title}</h6>
                              <p className="text-muted small mb-3">
                                {getDisplayIngredients(mealPlan.recipe.ingredients).length} ingredients
                              </p>
                              <p className="mobile-recipe-hint">Tap removes • hold 3s opens • hold 2s + drag moves</p>

                              <div className="slot-actions">
                                <button
                                  className="btn btn-warning btn-sm"
                                  onClick={() => setSelectedPlan({ ...mealPlan, displayDayIndex: dayIndex })}
                                >
                                  View
                                </button>
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => deleteMealPlan(mealPlan)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            className="empty-slot-btn compact"
                            onClick={() => openRecipeModal(mealType, dayIndex, day.dateKey)}
                          >
                            + Add another
                          </button>
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

          <div className="mobile-week-board" aria-label="7 day meal planner">
            {weekDays.map((day, dayIndex) => (
              <section key={day.dateKey} className="mobile-day-line">
                <button
                  type="button"
                  className={`mobile-date-pill ${selectedDate === day.dateKey ? "active" : ""}`}
                  onClick={() => setSelectedDate(day.dateKey)}
                  aria-label={`Choose ${day.fullLabel}`}
                >
                  <strong>{parseDateKey(day.dateKey).getDate()}</strong>
                  <span>{day.shortDayName}</span>
                </button>

                <div className="mobile-day-panel">
                  <div className="mobile-day-meals">
                    {mealTypes.map((mealType) => {
                      const slotPlans = getSlotPlans(mealType, dayIndex);
                      const slotKey = getMobileSlotKey(mealType, dayIndex);

                      return (
                        <div
                          key={`${day.dateKey}-${mealType}`}
                          className={`mobile-meal-column ${mobileDragOverSlot === slotKey ? "mobile-drop-target" : ""}`}
                          data-mobile-drop-slot="true"
                          data-meal-type={mealType}
                          data-day-index={dayIndex}
                          data-plan-date={day.dateKey}
                        >
                          <h3>{mealType}</h3>
                          <div className="mobile-meal-list">
                            {slotPlans.map((mealPlan) => (
                              <div
                                key={mealPlan._id}
                                className={`mobile-meal-recipe ${mealType} ${mobileDragPlan?._id === mealPlan._id ? "mobile-drag-source" : ""}`}
                                role="button"
                                tabIndex={0}
                                aria-label={`${mealPlan.recipe.title}. Tap to remove, hold to open, or hold and drag to move.`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                                onPointerDown={(event) => handleMobileRecipePointerDown(event, mealPlan, mealType, dayIndex, day.dateKey)}
                                onPointerMove={handleMobileRecipePointerMove}
                                onPointerUp={handleMobileRecipePointerUp}
                                onPointerCancel={handleMobileRecipePointerCancel}
                              >
                                <span>{mealPlan.recipe.title}</span>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="mobile-empty-meal"
                              onClick={() => openRecipeModal(mealType, dayIndex, day.dateKey)}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mobile-day-actions">
                    <button
                      type="button"
                      className={`mobile-comment-btn ${mobileNotes[day.dateKey] ? "has-comment" : ""}`}
                      onClick={() => setActiveMobileCommentDay((currentDay) => currentDay === day.dateKey ? "" : day.dateKey)}
                      aria-label={`Add comment for ${day.fullLabel}`}
                    >
                      ◌
                    </button>
                  </div>

                  {activeMobileCommentDay === day.dateKey && (
                    <textarea
                      className="mobile-day-note"
                      value={mobileNotes[day.dateKey] || ""}
                      onChange={(event) => updateMobileNote(day.dateKey, event.target.value)}
                      placeholder="Add comment for this day..."
                      rows={2}
                    />
                  )}
                </div>
              </section>
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
                <div className="recipe-modal-actions">
                  <button className="btn-close" onClick={() => setShowRecipeModal(false)}></button>
                </div>
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
                    disabled={Boolean(exactSavedRecipe && addingRecipeIds.includes(exactSavedRecipe._id))}
                  >
                    {exactSavedRecipe && addingRecipeIds.includes(exactSavedRecipe._id) ? "Adding..." : exactSavedRecipe ? "Add Saved" : "Generate"}
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
                    {searchedRecipes.map((recipe) => {
                      const isAddingRecipe = addingRecipeIds.includes(recipe._id);
                      const isAlreadyInSlot = getSlotPlans(selectedSlot.mealType, selectedSlot.dayIndex).some((plan) => plan.recipe?.id === recipe._id);
                      return (
                      <div
                        key={recipe._id}
                        className={`recipe-item ${isAddingRecipe ? "is-adding" : ""} ${isAlreadyInSlot ? "is-planned" : ""}`}
                        onClick={() => {
                          if (isAddingRecipe) return;
                          assignRecipe(recipe, selectedSlot, { keepModalOpen: true });
                        }}
                      >
                        <div className="recipe-card-icon">{getMealIcon(selectedSlot.mealType)}</div>
                        <h5 className="fw-bold mb-1">{recipe.title}</h5>
                        <p className="text-muted small mb-0">
                          {isAddingRecipe ? "Adding..." : isAlreadyInSlot ? "Added to this slot" : `${recipe.ingredients?.length || 0} ingredients`}
                        </p>
                      </div>
                    );
                    })}
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

        {mobileDragPosition && (
          <div
            className={`mobile-drag-ghost ${mobileDragPosition.mealType}`}
            style={{
              left: `${mobileDragPosition.x}px`,
              top: `${mobileDragPosition.y}px`
            }}
          >
            {mobileDragPosition.title}
          </div>
        )}
      </div>
    </>
  );
}
