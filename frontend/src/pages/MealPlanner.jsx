import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./MealPlanner.css";

export default function MealPlanner() {
  const navigate = useNavigate();
  const [mealPlans, setMealPlans] = useState({
    breakfast: null,
    lunch: null,
    dinner: null
  });
  const [loading, setLoading] = useState(true);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);

  useEffect(() => {
    loadMealPlans();
    loadSavedRecipes();
  }, []);

  const loadMealPlans = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/meal-plans/my", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setMealPlans(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load meal plans");
    }
    setLoading(false);
  };

  const loadSavedRecipes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/recipes/my-recipes", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setSavedRecipes(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openRecipeModal = (mealType) => {
    setSelectedMealType(mealType);
    setShowRecipeModal(true);
  };

  const assignRecipe = async (recipe) => {
    try {
      const token = localStorage.getItem("token");

      // Get default time for meal type
      const defaultTimes = {
        breakfast: "08:00",
        lunch: "13:00",
        dinner: "20:00"
      };

      const res = await fetch("http://localhost:5000/api/meal-plans/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mealType: selectedMealType,
          recipe: {
            id: recipe._id,
            title: recipe.title,
            ingredients: recipe.ingredients,
            steps: recipe.steps,
            image: recipe.image || ""
          },
          time: defaultTimes[selectedMealType]
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to assign recipe");
        return;
      }

      alert("✅ Recipe assigned to " + selectedMealType + "!");
      setShowRecipeModal(false);
      loadMealPlans();
    } catch (err) {
      console.error(err);
      alert("Failed to assign recipe");
    }
  };

  const deleteMealPlan = async (mealType) => {
    const mealPlan = mealPlans[mealType];
    if (!mealPlan) return;

    if (!confirm(`Delete ${mealType} meal plan?`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/meal-plans/${mealPlan._id}`, {
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
      breakfast: "🍳",
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
      <div className="container mt-4 mb-5">
        <button 
          className="btn btn-outline-secondary mb-4"
          onClick={() => navigate("/home")}
        >
          ← Back to Home
        </button>

        <div className="meal-planner-header mb-4">
          <h2 className="fw-bold">📅 My Meal Planner</h2>
          <p className="text-muted">Plan your daily meals and manage your grocery list</p>
        </div>

        <div className="row g-4 mb-5">
          {["breakfast", "lunch", "dinner"].map((mealType) => (
            <div key={mealType} className="col-md-4">
              <div className="meal-card shadow-sm p-4 rounded">
                <div className="meal-card-header">
                  <h4 className="fw-bold text-capitalize">
                    {getMealIcon(mealType)} {mealType}
                  </h4>
                  <p className="text-muted mb-3">
                    Time: {mealPlans[mealType]?.time || "Not set"}
                  </p>
                </div>

                {mealPlans[mealType] ? (
                  <div className="meal-content">
                    <h5 className="fw-bold mb-2">{mealPlans[mealType].recipe.title}</h5>
                    <p className="text-muted small mb-3">
                      {mealPlans[mealType].recipe.ingredients.length} ingredients
                    </p>

                    <div className="d-flex flex-column gap-2">
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => navigate(`/search?q=${mealPlans[mealType].recipe.title}`)}
                      >
                        👁️ View Recipe
                      </button>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => openRecipeModal(mealType)}
                      >
                        🔄 Change Recipe
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => deleteMealPlan(mealType)}
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="meal-empty">
                    <p className="text-muted mb-3">No meal planned</p>
                    <button
                      className="btn btn-warning w-100"
                      onClick={() => openRecipeModal(mealType)}
                    >
                      + Add Recipe
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
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

        {/* Recipe Selection Modal */}
        {showRecipeModal && (
          <div className="modal-overlay" onClick={() => setShowRecipeModal(false)}>
            <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <h4 className="fw-bold mb-0">Select Recipe for {selectedMealType}</h4>
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
      </div>
    </>
  );
}
