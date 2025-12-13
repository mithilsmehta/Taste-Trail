import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("q");

  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const MODEL = "meta-llama/llama-3.1-70b-instruct";

  useEffect(() => {
    if (query) fetchRecipe();
  }, [query]);

  async function fetchRecipe() {
    setLoading(true);
    setError("");
    setRecipe(null);

    const systemPrompt = `
STRICT RULES:
- Output ONLY pure JSON.
- No markdown, no commentary.
- Format must be:
{
  "name": "",
  "ingredients": ["", ""],
  "steps": ["", ""]
}
`;

    const userPrompt = `Generate a detailed recipe for: ${query}`;

    try {
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
        }),
      });

      const data = await res.json();

      let raw = data?.choices?.[0]?.message?.content || "";

      raw = raw.replace(/```json|```/g, "").trim();

      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned invalid JSON");

      const parsed = JSON.parse(match[0]);
      setRecipe(parsed);

    } catch (err) {
      console.error(err);
      setError("Failed to generate recipe. Please try again.");
    }

    setLoading(false);
  }

  // ⭐ SAVE TO BACKEND DATABASE
  const saveRecipe = async () => {
    if (!recipe || saving) return;

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/recipes/save", {
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
              <h3 className="fw-bold mb-3">{recipe.name}</h3>
              <button 
                className={`btn ${isSaved ? 'btn-secondary' : 'btn-success'}`}
                onClick={saveRecipe}
                disabled={saving || isSaved}
              >
                {saving ? '⏳ Saving...' : isSaved ? '✅ Saved!' : '❤️ Save Recipe'}
              </button>
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
                        {item}
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
                className="btn btn-outline-dark flex-fill"
                onClick={() => navigate("/saved")}
              >
                📚 View Saved Recipes
              </button>
            </div>
          </div>
        )}
      </div>

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
      `}</style>
    </>
  );
}