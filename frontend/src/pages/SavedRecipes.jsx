import { API_BASE_URL, apiUrl } from "../utils/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMondayDateKey, getWeekFromDateKey, toDateKey } from "../utils/weekPlan";
import { getDisplayIngredients } from "../utils/recipeFormatting";
// Saved recipe photos are disabled for now.
// Uncomment these imports and the RecipeImage code below when you want photos again.
// import fallbackFood1 from "../assets/img1.jpg";
// import fallbackFood2 from "../assets/img2.jpg";
// import fallbackFood3 from "../assets/img3.jpg";
// import fallbackFood4 from "../assets/img4.jpg";
// import fallbackFood5 from "../assets/img5.jpg";
// import fallbackFood6 from "../assets/img6.jpg";

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

const emptyNutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0
};

/*
Saved recipe photos are disabled for now.
Uncomment this whole block and the image JSX/CSS below when you want photos again.

const fallbackRecipeImages = [
  fallbackFood1,
  fallbackFood2,
  fallbackFood3,
  fallbackFood4,
  fallbackFood6
];

const getFallbackRecipeImage = (title = "") => {
  const seed = Array.from(String(title || "recipe")).reduce((total, char) => total + char.charCodeAt(0), 0);
  return fallbackRecipeImages[seed % fallbackRecipeImages.length];
};

const commonsImage = (fileName) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=900`;

const dishImageRules = [
  { pattern: /jain.*pav\s*bhaji|pav\s*bhaji.*jain/i, image: commonsImage("Jain dosa, Pav bhaji, Chole bhature.jpg") },
  { pattern: /tiramisu|tiramisù/i, image: commonsImage("Tiramisu (44840044151).jpg") },
  { pattern: /paneer.*salad|salad.*paneer/i, image: commonsImage("Paneer masaledar and fresh veggies salad.png") },
  { pattern: /manchurian/i, image: commonsImage("Manchurian.jpg") },
  { pattern: /poha|pohe/i, image: commonsImage("poha.jpg") },
  { pattern: /chole|cholle|bhature|bhatura/i, image: commonsImage("Cholle-Bhature.jpg") },
  { pattern: /dosa/i, image: commonsImage("Masala_Dosa.JPG") },
  { pattern: /pav\s*bhaji/i, image: commonsImage("Pav_Bhaji.jpg") },
  { pattern: /paneer\s*tikka/i, image: commonsImage("Paneer_Tikka.jpg") },
  { pattern: /biryani/i, image: commonsImage("Vegetable-biryani.jpg") },
  { pattern: /pizza/i, image: fallbackFood3 },
  { pattern: /pasta|noodle|lo mein/i, image: fallbackFood2 },
  { pattern: /salad|healthy/i, image: fallbackFood1 }
];

const getDishSpecificImage = (title = "") =>
  dishImageRules.find((rule) => rule.pattern.test(String(title)))?.image || "";

const isUnreliableRecipeImage = (image = "") =>
  /image\.pollinations\.ai|source\.unsplash\.com/i.test(String(image));

const isExplicitNonVegRecipe = (title = "") =>
  /\b(chicken|mutton|lamb|fish|prawn|shrimp|egg|beef|pork|bacon|ham|seafood|keema)\b/i.test(String(title));

function RecipeImage({ recipe, className = "", detail = false }) {
  const [useFallback, setUseFallback] = useState(false);
  const title = recipe?.title || recipe?.name;
  const dishImage = getDishSpecificImage(title);
  const fallbackImage = getFallbackRecipeImage(title);
  const canUseRecipeImage = recipe?.image && !isUnreliableRecipeImage(recipe.image);
  const shouldPreferDishImage = dishImage && !isExplicitNonVegRecipe(title);
  const imageSrc = useFallback
    ? fallbackImage
    : shouldPreferDishImage
      ? dishImage
      : canUseRecipeImage
        ? recipe.image
        : dishImage || fallbackImage;

  return (
    <img
      className={className}
      src={imageSrc}
      alt={recipe?.title || recipe?.name || "Recipe"}
      onError={() => setUseFallback(true)}
      loading={detail ? "eager" : "lazy"}
    />
  );
}
*/

export default function SavedRecipes() {
  const navigate = useNavigate();
  const currentWeekStartDate = getMondayDateKey(toDateKey(new Date()));
  const weekDays = getWeekFromDateKey(currentWeekStartDate);
  const [recipes, setRecipes] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [viewRecipe, setViewRecipe] = useState(null);
  const [mealPlanChoice, setMealPlanChoice] = useState({
    mealType: "",
    dayIndex: null,
    planDate: "",
    existingMealPlanId: ""
  });

  const fetchRecipes = async () => {
    try {
      const token = localStorage.getItem("token");
      const todayKey = toDateKey(new Date());

      const [recipesRes, mealPlansRes] = await Promise.all([
        fetch(apiUrl("/api/recipes/my-recipes"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE_URL}/api/meal-plans/all?fromDate=${todayKey}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      ]);

      const recipesData = await recipesRes.json();
      const mealPlansData = await mealPlansRes.json();

      if (!recipesRes.ok) {
        throw new Error(recipesData.msg || "Failed to load recipes");
      }

      setRecipes(recipesData || []);
      if (mealPlansRes.ok) {
        setMealPlans(Array.isArray(mealPlansData)
          ? mealPlansData.filter((plan) => plan?.planDate && plan.planDate >= todayKey)
          : []);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load recipes");
    }

    setLoading(false);
  };

  const deleteRecipe = async (id) => {
    if (!confirm("Delete this recipe?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Could not delete");
        return;
      }

      alert("Recipe deleted!");
      fetchRecipes(); // refresh list
    } catch (err) {
      console.error(err);
      alert("Error deleting recipe");
    }
  };

  const getPlannedRecipe = (recipe) => {
    const todayKey = toDateKey(new Date());
    const mealPlan = mealPlans.find((plan) => {
      const planDate = plan?.planDate || "";
      if (planDate && planDate < todayKey) return false;
      return plan?.recipe?.id === recipe._id || plan?.recipe?.title === recipe.title;
    });

    if (mealPlan) {
      return {
        mealPlan,
        mealType: mealPlan.mealType,
        dayIndex: getDayIndexForDate(mealPlan.planDate || weekDays[mealPlan.dayIndex || 0]?.dateKey),
        planDate: mealPlan.planDate || weekDays[mealPlan.dayIndex || 0]?.dateKey || ""
      };
    }

    return null;
  };

  const getDayIndexForDate = (dateKey) => {
    if (!dateKey) return null;
    const week = getWeekFromDateKey(getMondayDateKey(dateKey));
    const dayIndex = week.findIndex((day) => day.dateKey === dateKey);
    return dayIndex >= 0 ? dayIndex : 0;
  };

  const getDateLabel = (dateKey) => {
    if (!dateKey) return "";
    const week = getWeekFromDateKey(getMondayDateKey(dateKey));
    return week.find((day) => day.dateKey === dateKey)?.fullLabel || dateKey;
  };

  const openMealModal = (recipe) => {
    const plannedRecipe = getPlannedRecipe(recipe);

    setSelectedRecipe(recipe);
    setMealPlanChoice({
      mealType: plannedRecipe?.mealType || "",
      dayIndex: plannedRecipe?.dayIndex ?? null,
      planDate: plannedRecipe?.planDate || "",
      existingMealPlanId: plannedRecipe?.mealPlan?._id || ""
    });
    setShowMealModal(true);
  };

  const addToMealPlan = async () => {
    const { mealType, dayIndex, planDate, existingMealPlanId } = mealPlanChoice;

    if (!mealType || dayIndex === null || !planDate) {
      alert("Please choose a meal and date first");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const mealPlanUrl = existingMealPlanId
        ? `${API_BASE_URL}/api/meal-plans/${existingMealPlanId}`
        : apiUrl("/api/meal-plans/create");

      const res = await fetch(mealPlanUrl, {
        method: existingMealPlanId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mealType,
          dayIndex,
          planDate,
          recipe: {
            id: selectedRecipe._id,
            title: selectedRecipe.title,
            ingredients: selectedRecipe.ingredients,
            steps: selectedRecipe.steps,
            image: selectedRecipe.image || ""
          },
          time: defaultTimes[mealType]
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to add to meal plan");
        return;
      }

      alert(`✅ ${existingMealPlanId ? "Updated" : "Added"} ${mealType} for ${getDateLabel(planDate)}!`);
      setShowMealModal(false);
      fetchRecipes();
    } catch (err) {
      console.error(err);
      alert("Failed to add to meal plan");
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading your saved recipes...</p>
        </div>
      </>
    );
  }

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
        <div className="saved-header mb-4">
          <h2 className="fw-bold">❤️ Your Saved Recipes</h2>
          <p className="text-muted">
            {recipes.length === 0 
              ? "No recipes saved yet. Start exploring!" 
              : `You have ${recipes.length} saved recipe${recipes.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        {/* Empty State */}
        {recipes.length === 0 && (
          <div className="empty-state text-center py-5">
            <div className="empty-icon mb-3">📚</div>
            <h4 className="fw-bold mb-2">No Saved Recipes Yet</h4>
            <p className="text-muted mb-4">Start searching for recipes and save your favorites!</p>
            <button 
              className="btn btn-warning px-4"
              onClick={() => navigate("/home")}
            >
              Explore Recipes
            </button>
          </div>
        )}

        {/* Recipe Cards */}
        <div className="row g-4">
          {recipes.map((recipe) => {
            const plannedRecipe = getPlannedRecipe(recipe);

            return (
            <div key={recipe._id} className="col-md-6 col-lg-4">
              <div className="saved-recipe-card shadow-sm p-4 rounded h-100">
                {/*
                Saved recipe card photo is disabled for now.
                Uncomment this block with the RecipeImage code at the top of this file to show photos again.
                <div className="saved-recipe-image mb-3">
                  <RecipeImage recipe={recipe} />
                </div>
                */}
                <h4 className="fw-bold mb-3">{recipe.title}</h4>

                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div className="recipe-preview mb-3">
                    <small className="text-muted">
                        {getDisplayIngredients(recipe.ingredients).length} ingredients
                    </small>
                  </div>
                )}

                {recipe.nutrition && (
                  <div className="nutrition-mini-grid mb-3">
                    <span>{recipe.nutrition.calories || 0} cal</span>
                    <span>{recipe.nutrition.protein || 0}g protein</span>
                    <span>{recipe.nutrition.carbs || 0}g carbs</span>
                    <span>{recipe.nutrition.fat || 0}g fat</span>
                  </div>
                )}

                <div className="d-flex flex-column gap-2 mt-auto">
                  <button
                    className="btn btn-warning w-100"
                    onClick={() => setViewRecipe(recipe)}
                  >
                    👁️ View Recipe
                  </button>

                  <button
                    className={`btn ${plannedRecipe ? "btn-outline-success" : "btn-success"} w-100`}
                    onClick={() => openMealModal(recipe)}
                  >
                    {plannedRecipe ? "🔁 Change Meal Plan" : "📅 Add to Meal Plan"}
                  </button>

                  {plannedRecipe && (
                    <div className="planned-badge">
                      {mealOptions.find((meal) => meal.type === plannedRecipe.mealType)?.icon}{" "}
                      {plannedRecipe.mealType} • {getDateLabel(plannedRecipe.planDate)}
                    </div>
                  )}

                  <button
                    className="btn btn-outline-danger w-100"
                    onClick={() => deleteRecipe(recipe._id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .saved-header {
          border-bottom: 3px solid #ffc107;
          padding-bottom: 16px;
        }

        .saved-recipe-card {
          background: white;
          border: 1px solid #e0e0e0;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .saved-recipe-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15) !important;
          border-color: #ffc107;
        }

        /*
        Saved recipe photo styles are disabled for now.
        Uncomment this CSS with the RecipeImage code at the top of this file to show photos again.

        .saved-recipe-image {
          align-items: center;
          aspect-ratio: 16 / 9;
          background: #f8f9fa;
          border-radius: 10px;
          display: flex;
          justify-content: center;
          overflow: hidden;
        }

        .saved-recipe-image img {
          height: 100%;
          object-fit: cover;
          width: 100%;
        }

        .saved-recipe-image span {
          font-size: 2.5rem;
        }
        */

        .recipe-preview {
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .empty-state {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 4rem;
        }

        .saved-detail-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-left: 22px;
        }

        .saved-ingredient-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .saved-ingredient-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid #e9ecef;
          border-radius: 10px;
          background: #f8f9fa;
          line-height: 1.45;
        }

        .ingredient-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #ffc107;
          flex: 0 0 auto;
          margin-top: 9px;
        }

        .planned-badge {
          border: 1px solid #badbcc;
          border-radius: 8px;
          background: #f0fff4;
          color: #146c43;
          font-size: 0.9rem;
          font-weight: 700;
          padding: 8px 10px;
          text-align: center;
        }

        .nutrition-mini-grid,
        .nutrition-grid {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .nutrition-mini-grid span,
        .nutrition-grid div {
          background: #fff9e6;
          border: 1px solid #ffe082;
          border-radius: 8px;
          padding: 8px 10px;
          text-transform: capitalize;
        }

        .nutrition-mini-grid span {
          font-size: 0.86rem;
          font-weight: 800;
          text-align: center;
        }

        .nutrition-grid strong,
        .nutrition-grid span {
          display: block;
        }

        .nutrition-grid strong {
          font-size: 1.15rem;
        }

        .nutrition-grid span {
          color: #6c757d;
          font-size: 0.86rem;
          font-weight: 700;
        }

        .recipe-detail-image {
          border-radius: 12px;
          max-height: 320px;
          object-fit: cover;
          width: 100%;
        }

        @media (max-width: 768px) {
          .saved-recipe-card {
            margin-bottom: 16px;
          }

          .empty-state {
            padding: 36px 16px;
          }
        }
      `}</style>

      {/* Saved Recipe Detail Modal */}
      {viewRecipe && (
        <div className="modal-overlay" onClick={() => setViewRecipe(null)}>
          <div className="modal-content-meal recipe-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-meal">
              <div>
                <h4 className="fw-bold mb-1">{viewRecipe.title}</h4>
                <p className="text-muted small mb-0">Saved recipe from your database</p>
              </div>
              <button className="btn-close" onClick={() => setViewRecipe(null)}></button>
            </div>

            <div className="modal-body-meal">
              {/*
              Saved recipe detail photo is disabled for now.
              Uncomment this block with the RecipeImage code at the top of this file to show photos again.
              <RecipeImage recipe={viewRecipe} className="recipe-detail-image mb-4" detail />
              */}

              <h5 className="fw-bold mb-3">Nutrition Estimate</h5>
              <div className="nutrition-grid mb-4">
                {Object.entries(viewRecipe.nutrition || emptyNutrition).map(([key, value]) => (
                  <div key={key}>
                    <strong>{value || 0}{key === "calories" ? "" : "g"}</strong>
                    <span>{key}</span>
                  </div>
                ))}
              </div>

              <h5 className="fw-bold mb-3">Ingredients</h5>
              <div className="saved-ingredient-list mb-4">
                {getDisplayIngredients(viewRecipe.ingredients).map((ingredient, index) => (
                  <div key={index} className="saved-ingredient-item">
                    <span className="ingredient-dot"></span>
                    <span>{ingredient}</span>
                  </div>
                ))}
              </div>

              <h5 className="fw-bold mb-3">Cooking Steps</h5>
              <ol className="saved-detail-list">
                {viewRecipe.steps?.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Meal Selection Modal */}
      {showMealModal && (
        <div className="modal-overlay" onClick={() => setShowMealModal(false)}>
          <div className="modal-content-meal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-meal">
              <h4 className="fw-bold mb-0">
                {mealPlanChoice.existingMealPlanId ? "Change Meal Plan" : "Add to Meal Plan"}
              </h4>
              <button className="btn-close" onClick={() => setShowMealModal(false)}></button>
            </div>

            <div className="modal-body-meal">
              <p className="text-muted mb-4">Select meal and date for "{selectedRecipe?.title}":</p>

              <h6 className="fw-bold mb-2">Meal</h6>
              <div className="meal-options">
                {mealOptions.map((meal) => (
                  <button
                    key={meal.type}
                    className={`meal-option-btn ${mealPlanChoice.mealType === meal.type ? "selected" : ""}`}
                    onClick={() => setMealPlanChoice(prev => ({ ...prev, mealType: meal.type }))}
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
                  setMealPlanChoice(prev => ({
                    ...prev,
                    dayIndex: getDayIndexForDate(planDate),
                    planDate
                  }));
                  event.currentTarget.blur();
                }}
              />
              {mealPlanChoice.planDate && (
                <p className="selected-date-label mb-0 mt-2">
                  {getDateLabel(mealPlanChoice.planDate)}
                </p>
              )}

              <button
                className="btn btn-success w-100 mt-4"
                onClick={addToMealPlan}
                disabled={!mealPlanChoice.mealType || mealPlanChoice.dayIndex === null}
              >
                {mealPlanChoice.existingMealPlanId ? "Update Meal Planner" : "Save to Meal Planner"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-in;
        }

        .modal-content-meal {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 500px;
          max-height: 82vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        .recipe-view-modal {
          max-width: 820px;
        }

        .modal-header-meal {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-body-meal {
          padding: 24px;
          overflow-y: auto;
        }

        .meal-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .meal-option-btn {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1.1rem;
        }

        .meal-option-btn:hover {
          border-color: #ffc107;
          background: #fff9e6;
          transform: translateX(5px);
        }

        .meal-option-btn.selected {
          border-color: #198754;
          background: #eaf7ef;
        }

        .meal-icon {
          font-size: 2rem;
          margin-right: 16px;
        }

        .meal-name {
          font-weight: 600;
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
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .modal-overlay {
            align-items: flex-end;
            padding: 12px;
          }

          .modal-content-meal {
            width: 100%;
            border-radius: 16px;
          }

          .modal-header-meal,
          .modal-body-meal {
            padding: 16px;
          }

          .meal-option-btn {
            padding: 14px 16px;
            font-size: 1rem;
          }
        }
      `}</style>
    </>
  );
}
