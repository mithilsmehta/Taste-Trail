import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMondayDateKey, getWeekFromDateKey } from "../utils/weekPlan";
import "./DetectIngredients.css";

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

const scanHistoryKey = "tasteTrailIngredientScans";

export default function DetectIngredients() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imagePayload, setImagePayload] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [manualIngredient, setManualIngredient] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [rejectedItems, setRejectedItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingMealPlan, setAddingMealPlan] = useState(false);
  const [error, setError] = useState("");
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealPlanChoice, setMealPlanChoice] = useState({
    mealType: "",
    dayIndex: null,
    planDate: ""
  });

  const token = localStorage.getItem("token");
  const ingredientNames = useMemo(() => ingredients.map((item) => item.name), [ingredients]);

  useEffect(() => {
    try {
      setScanHistory(JSON.parse(localStorage.getItem(scanHistoryKey) || "[]"));
    } catch {
      setScanHistory([]);
    }
  }, []);

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

  const resizeImageFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          const maxSize = 1280;
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);

          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.86));
        };

        image.onerror = reject;
        image.src = String(reader.result || "");
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    try {
      const value = await resizeImageFile(file);
      setImagePreview(value);
      setImagePayload(value);
      setIngredients([]);
      setSuggestions([]);
      setSelectedSuggestion(null);
      setGeneratedRecipe(null);
      setRejectedItems([]);
      setNotes("");
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not read this image. Please try another photo.");
    }
  };

  const addScanHistory = (nextIngredients) => {
    const entry = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ingredients: nextIngredients,
      imagePreview
    };
    const nextHistory = [entry, ...scanHistory].slice(0, 5);
    setScanHistory(nextHistory);
    localStorage.setItem(scanHistoryKey, JSON.stringify(nextHistory));
  };

  const clearCurrentScan = () => {
    setImagePreview("");
    setImagePayload("");
    setIngredients([]);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setGeneratedRecipe(null);
    setRejectedItems([]);
    setNotes("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const clearRecentScans = () => {
    setScanHistory([]);
    localStorage.removeItem(scanHistoryKey);
    clearCurrentScan();
  };

  const detectIngredients = async () => {
    if (!imagePayload) {
      setError("Upload or capture an image first.");
      return;
    }

    setLoadingDetect(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/vision/detect-ingredients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ image: imagePayload })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to detect ingredients");
      }

      setIngredients(data.ingredients || []);
      setRejectedItems(data.rejectedItems || []);
      setNotes(data.notes || "");
      addScanHistory(data.ingredients || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to detect ingredients");
    } finally {
      setLoadingDetect(false);
    }
  };

  const addManualIngredient = () => {
    const name = manualIngredient.trim();
    if (!name) return;

    setIngredients((prev) => {
      const exists = prev.some((item) => item.name.toLowerCase() === name.toLowerCase());
      if (exists) return prev;
      return [...prev, { name, confidence: "Manual" }];
    });
    setManualIngredient("");
  };

  const removeIngredient = (name) => {
    setIngredients((prev) => prev.filter((item) => item.name !== name));
    setSuggestions([]);
    setGeneratedRecipe(null);
  };

  const suggestRecipes = async () => {
    if (ingredients.length === 0) {
      setError("Add at least one ingredient first.");
      return;
    }

    setLoadingSuggestions(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/vision/suggest-recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ingredients })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to suggest recipes");
      }

      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to suggest recipes");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const generateRecipe = async (suggestion) => {
    setSelectedSuggestion(suggestion);
    setLoadingRecipe(true);
    setGeneratedRecipe(null);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/vision/generate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipeName: suggestion.name,
          ingredients
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to generate recipe");
      }

      setGeneratedRecipe(data.recipe);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate recipe");
    } finally {
      setLoadingRecipe(false);
    }
  };

  const saveRecipe = async () => {
    if (!generatedRecipe || saving) return;
    setSaving(true);

    try {
      const res = await fetch("http://localhost:5000/api/recipes/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: generatedRecipe.name,
          ingredients: generatedRecipe.ingredients,
          steps: generatedRecipe.steps,
          image: imagePreview
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to save recipe");
      }

      alert("Recipe saved!");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save recipe");
    } finally {
      setSaving(false);
    }
  };

  const addToMealPlan = async () => {
    const { mealType, dayIndex, planDate } = mealPlanChoice;

    if (!generatedRecipe || !mealType || dayIndex === null || !planDate) {
      alert("Choose meal and date first.");
      return;
    }

    setAddingMealPlan(true);

    try {
      const res = await fetch("http://localhost:5000/api/meal-plans/create", {
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
            title: generatedRecipe.name,
            ingredients: generatedRecipe.ingredients || [],
            steps: generatedRecipe.steps || [],
            image: imagePreview
          },
          time: defaultTimes[mealType]
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to add to meal planner");
      }

      setShowMealModal(false);
      alert(`Added to ${mealType} for ${getRecipeLabelForDate(planDate)}!`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to add to meal planner");
    } finally {
      setAddingMealPlan(false);
    }
  };

  const loadHistoryEntry = (entry) => {
    setImagePreview(entry.imagePreview || "");
    setImagePayload(entry.imagePreview || "");
    setIngredients(entry.ingredients || []);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setGeneratedRecipe(null);
    setError("");
  };

  return (
    <>
      <Navbar />
      <main className="container detect-page">
        <button className="btn btn-outline-secondary mb-4" onClick={() => navigate("/home")}>
          ← Back to Home
        </button>

        <section className="detect-header">
          <div>
            <h1>Ingredient Scanner</h1>
            <p>Upload a food photo, review detected vegetarian ingredients, and generate recipe ideas.</p>
          </div>
          {/* <button className="btn btn-dark" onClick={() => navigate("/grocery-list")}>
            🛒 Grocery List
          </button> */}
        </section>

        {error && (
          <div className="alert alert-danger">
            <strong>Heads up:</strong> {error}
          </div>
        )}

        <div className="detect-layout">
          <section className="detect-panel">
            <div
              className={`image-dropzone ${imagePreview ? "has-image" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                readFile(event.dataTransfer.files?.[0]);
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Uploaded food" />
              ) : (
                <div>
                  <div className="dropzone-icon">📷</div>
                  <h3>Upload or drop a food image</h3>
                  <p>Clear photos with visible ingredients work best.</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="d-none"
              onChange={(event) => readFile(event.target.files?.[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="d-none"
              onChange={(event) => readFile(event.target.files?.[0])}
            />

            <div className="detect-actions">
              <button className="btn btn-outline-dark" onClick={() => fileInputRef.current?.click()}>
                Upload Photo
              </button>
              <button className="btn btn-outline-dark" onClick={() => cameraInputRef.current?.click()}>
                Use Camera
              </button>
              <button className="btn btn-warning" onClick={detectIngredients} disabled={!imagePreview || loadingDetect}>
                {loadingDetect ? "Scanning..." : "Detect Ingredients"}
              </button>
              <button className="btn btn-outline-danger" onClick={clearCurrentScan} disabled={!imagePreview && ingredients.length === 0}>
                Clear Picture
              </button>
            </div>

            {scanHistory.length > 0 && (
              <div className="scan-history">
                <div className="scan-history-header">
                  <h5>Recent Scans</h5>
                  <button className="btn btn-outline-danger btn-sm" onClick={clearRecentScans}>
                    Clear
                  </button>
                </div>
                <div className="scan-history-list">
                  {scanHistory.map((entry) => (
                    <button key={entry.id} onClick={() => loadHistoryEntry(entry)}>
                      {entry.imagePreview && <img src={entry.imagePreview} alt="" />}
                      <span>{entry.ingredients?.slice(0, 3).map((item) => item.name).join(", ") || "Scan"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="detect-panel">
            <div className="panel-heading">
              <h3>Detected Ingredients</h3>
              <span>{ingredients.length} items</span>
            </div>

            {rejectedItems.length > 0 && (
              <div className="veg-warning">
                Non-veg items were ignored: {rejectedItems.join(", ")}
              </div>
            )}

            {notes && <p className="text-muted small">{notes}</p>}

            <div className="ingredient-chip-list">
              {ingredients.map((ingredient) => (
                <button key={ingredient.name} className="ingredient-chip" onClick={() => removeIngredient(ingredient.name)}>
                  <span>{ingredient.name}</span>
                  <small>{ingredient.confidence}</small>
                  <b>×</b>
                </button>
              ))}
              {ingredients.length === 0 && (
                <p className="empty-copy">Detected ingredients will appear here. You can also add them manually.</p>
              )}
            </div>

            <div className="manual-ingredient-row">
              <input
                className="form-control"
                value={manualIngredient}
                onChange={(event) => setManualIngredient(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addManualIngredient();
                }}
                placeholder="Add ingredient manually"
              />
              <button className="btn btn-dark" onClick={addManualIngredient}>
                Add
              </button>
            </div>

            <button className="btn btn-success w-100 mt-3" onClick={suggestRecipes} disabled={ingredients.length === 0 || loadingSuggestions}>
              {loadingSuggestions ? "Finding recipes..." : "Suggest Vegetarian Recipes"}
            </button>
          </section>
        </div>

        {suggestions.length > 0 && (
          <section className="suggestions-section">
            <div className="panel-heading">
              <h3>Recipe Suggestions</h3>
              <span>Based on {ingredientNames.slice(0, 4).join(", ")}</span>
            </div>
            <div className="suggestion-grid">
              {suggestions.map((suggestion) => (
                <article key={suggestion.name} className={`suggestion-card ${selectedSuggestion?.name === suggestion.name ? "selected" : ""}`}>
                  <h4>{suggestion.name}</h4>
                  <p>{suggestion.description}</p>
                  {suggestion.matchedIngredients?.length > 0 && (
                    <div className="matched-row">
                      {suggestion.matchedIngredients.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  )}
                  <button className="btn btn-warning w-100" onClick={() => generateRecipe(suggestion)}>
                    Generate Recipe
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {loadingRecipe && (
          <div className="text-center py-5">
            <div className="spinner-border text-warning" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-3">Generating full recipe...</p>
          </div>
        )}

        {generatedRecipe && (
          <section className="generated-recipe">
            <div className="recipe-title-row">
              <div>
                <h2>{generatedRecipe.name}</h2>
                <p>{generatedRecipe.servings || 2} servings • Generated from your ingredients</p>
              </div>
              <div className="recipe-actions">
                <button className="btn btn-outline-dark" onClick={() => window.print()}>
                  Print
                </button>
                <button className="btn btn-success" onClick={saveRecipe} disabled={saving}>
                  {saving ? "Saving..." : "Save Recipe"}
                </button>
                <button className="btn btn-warning" onClick={() => setShowMealModal(true)}>
                  Add to Meal Planner
                </button>
              </div>
            </div>

            <div className="recipe-detail-grid">
              <div>
                <h4>Ingredients</h4>
                <ul>
                  {generatedRecipe.ingredients?.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Cooking Steps</h4>
                <ol>
                  {generatedRecipe.steps?.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        )}
      </main>

      {showMealModal && generatedRecipe && (
        <div className="detect-modal-overlay" onClick={() => setShowMealModal(false)}>
          <div className="detect-modal" onClick={(event) => event.stopPropagation()}>
            <div className="detect-modal-header">
              <div>
                <h4>Add to Meal Planner</h4>
                <p>{generatedRecipe.name}</p>
              </div>
              <button className="btn-close" onClick={() => setShowMealModal(false)}></button>
            </div>

            <div className="detect-modal-body">
              <h6>Meal</h6>
              <div className="meal-options">
                {mealOptions.map((meal) => (
                  <button
                    key={meal.type}
                    className={`meal-option-btn ${mealPlanChoice.mealType === meal.type ? "selected" : ""}`}
                    onClick={() => setMealPlanChoice((prev) => ({ ...prev, mealType: meal.type }))}
                  >
                    <span>{meal.icon}</span>
                    <strong>{meal.name}</strong>
                  </button>
                ))}
              </div>

              <h6 className="mt-4">Date</h6>
              <input
                type="date"
                className="meal-date-picker"
                value={mealPlanChoice.planDate}
                onChange={(event) => {
                  const planDate = event.target.value;
                  setMealPlanChoice((prev) => ({
                    ...prev,
                    planDate,
                    dayIndex: getDayIndexForDate(planDate)
                  }));
                  event.currentTarget.blur();
                }}
              />
              {mealPlanChoice.planDate && (
                <p className="selected-date-label mt-2">{getRecipeLabelForDate(mealPlanChoice.planDate)}</p>
              )}

              <button
                className="btn btn-success w-100 mt-3"
                onClick={addToMealPlan}
                disabled={addingMealPlan || !mealPlanChoice.mealType || !mealPlanChoice.planDate}
              >
                {addingMealPlan ? "Adding..." : "Save to Meal Planner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
