import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function SavedRecipes() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const fetchRecipes = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/recipes/my-recipes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setRecipes(data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load recipes");
    }

    setLoading(false);
  };

  const deleteRecipe = async (id) => {
    if (!confirm("Delete this recipe?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:5000/api/recipes/${id}`, {
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

  const openMealModal = (recipe) => {
    setSelectedRecipe(recipe);
    setShowMealModal(true);
  };

  const addToMealPlan = async (mealType) => {
    try {
      const token = localStorage.getItem("token");

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
          mealType,
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

      alert(`✅ Added to ${mealType} meal plan!`);
      setShowMealModal(false);
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
          {recipes.map((recipe) => (
            <div key={recipe._id} className="col-md-6 col-lg-4">
              <div className="saved-recipe-card shadow-sm p-4 rounded h-100">
                <div className="recipe-icon mb-3">🍽️</div>
                <h4 className="fw-bold mb-3">{recipe.title}</h4>

                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div className="recipe-preview mb-3">
                    <small className="text-muted">
                      {recipe.ingredients.length} ingredients
                    </small>
                  </div>
                )}

                <div className="d-flex flex-column gap-2 mt-auto">
                  <button
                    className="btn btn-warning w-100"
                    onClick={() => navigate(`/search?q=${recipe.title}`)}
                  >
                    👁️ View Recipe
                  </button>

                  <button
                    className="btn btn-success w-100"
                    onClick={() => openMealModal(recipe)}
                  >
                    📅 Add to Meal Plan
                  </button>

                  <button
                    className="btn btn-outline-danger w-100"
                    onClick={() => deleteRecipe(recipe._id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
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

        .recipe-icon {
          font-size: 2.5rem;
          text-align: center;
        }

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

        @media (max-width: 768px) {
          .saved-recipe-card {
            margin-bottom: 16px;
          }
        }
      `}</style>

      {/* Meal Selection Modal */}
      {showMealModal && (
        <div className="modal-overlay" onClick={() => setShowMealModal(false)}>
          <div className="modal-content-meal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-meal">
              <h4 className="fw-bold mb-0">Add to Meal Plan</h4>
              <button className="btn-close" onClick={() => setShowMealModal(false)}></button>
            </div>

            <div className="modal-body-meal">
              <p className="text-muted mb-4">Select which meal to add "{selectedRecipe?.title}" to:</p>

              <div className="meal-options">
                <button
                  className="meal-option-btn"
                  onClick={() => addToMealPlan("breakfast")}
                >
                  <span className="meal-icon">🍳</span>
                  <span className="meal-name">Breakfast</span>
                </button>

                <button
                  className="meal-option-btn"
                  onClick={() => addToMealPlan("lunch")}
                >
                  <span className="meal-icon">🍱</span>
                  <span className="meal-name">Lunch</span>
                </button>

                <button
                  className="meal-option-btn"
                  onClick={() => addToMealPlan("dinner")}
                >
                  <span className="meal-icon">🍽️</span>
                  <span className="meal-name">Dinner</span>
                </button>
              </div>
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
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
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

        .meal-icon {
          font-size: 2rem;
          margin-right: 16px;
        }

        .meal-name {
          font-weight: 600;
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
      `}</style>
    </>
  );
}