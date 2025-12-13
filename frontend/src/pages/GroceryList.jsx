import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./GroceryList.css";

export default function GroceryList() {
  const navigate = useNavigate();
  const [groceryItems, setGroceryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadGroceryList();
  }, []);

  const loadGroceryList = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/grocery/list", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setGroceryItems(data.items || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load grocery list");
    }
    setLoading(false);
  };

  const toggleMark = async (itemId, currentMarked) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/grocery/mark/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ marked: !currentMarked })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to update");
        return;
      }

      // Update local state
      setGroceryItems(items =>
        items.map(item =>
          item._id === itemId ? { ...item, marked: !currentMarked } : item
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update item");
    }
  };

  const openBlinkit = (ingredient) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const blinkitLink = `https://blinkit.com/s/?q=${encodeURIComponent(ingredient)}`;

    if (isMobile) {
      // Try to open Blinkit app first
      window.location.href = `blinkit://search?q=${encodeURIComponent(ingredient)}`;

      // Fallback to web after 2 seconds if app doesn't open
      setTimeout(() => {
        window.location.href = blinkitLink;
      }, 2000);
    } else {
      // Desktop: open in new tab
      window.open(blinkitLink, "_blank");
    }
  };

  const getFilteredItems = () => {
    if (filter === "all") return groceryItems;
    return groceryItems.filter(item => item.mealType === filter);
  };

  const getMealIcon = (mealType) => {
    const icons = {
      breakfast: "🍳",
      lunch: "🍱",
      dinner: "🍽️"
    };
    return icons[mealType];
  };

  const groupByMealType = (items) => {
    const grouped = {
      breakfast: [],
      lunch: [],
      dinner: []
    };

    items.forEach(item => {
      if (grouped[item.mealType]) {
        grouped[item.mealType].push(item);
      }
    });

    return grouped;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading your grocery list...</p>
        </div>
      </>
    );
  }

  const filteredItems = getFilteredItems();
  const groupedItems = groupByMealType(filteredItems);

  return (
    <>
      <Navbar />
      <div className="container mt-4 mb-5">
        <button 
          className="btn btn-outline-secondary mb-4"
          onClick={() => navigate("/meal-planner")}
        >
          ← Back to Meal Planner
        </button>

        <div className="grocery-header mb-4">
          <h2 className="fw-bold">🛒 Grocery List</h2>
          <p className="text-muted">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} in your list
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="filter-buttons mb-4">
          <button
            className={`btn ${filter === "all" ? "btn-warning" : "btn-outline-warning"} me-2`}
            onClick={() => setFilter("all")}
          >
            All ({groceryItems.length})
          </button>
          <button
            className={`btn ${filter === "breakfast" ? "btn-warning" : "btn-outline-warning"} me-2`}
            onClick={() => setFilter("breakfast")}
          >
            🍳 Breakfast ({groceryItems.filter(i => i.mealType === "breakfast").length})
          </button>
          <button
            className={`btn ${filter === "lunch" ? "btn-warning" : "btn-outline-warning"} me-2`}
            onClick={() => setFilter("lunch")}
          >
            🍱 Lunch ({groceryItems.filter(i => i.mealType === "lunch").length})
          </button>
          <button
            className={`btn ${filter === "dinner" ? "btn-warning" : "btn-outline-warning"}`}
            onClick={() => setFilter("dinner")}
          >
            🍽️ Dinner ({groceryItems.filter(i => i.mealType === "dinner").length})
          </button>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="empty-state text-center py-5">
            <div className="empty-icon mb-3">🛒</div>
            <h4 className="fw-bold mb-2">No Items in Grocery List</h4>
            <p className="text-muted mb-4">Add meal plans to generate your grocery list</p>
            <button 
              className="btn btn-warning px-4"
              onClick={() => navigate("/meal-planner")}
            >
              Go to Meal Planner
            </button>
          </div>
        )}

        {/* Grocery Items by Meal Type */}
        {filteredItems.length > 0 && (
          <div className="grocery-sections">
            {Object.entries(groupedItems).map(([mealType, items]) => {
              if (items.length === 0) return null;

              return (
                <div key={mealType} className="meal-section mb-4">
                  <h4 className="fw-bold mb-3 text-capitalize">
                    {getMealIcon(mealType)} {mealType}
                  </h4>

                  <div className="grocery-items">
                    {items.map((item) => (
                      <div key={item._id} className={`grocery-item ${item.marked ? 'marked' : ''}`}>
                        <div className="item-left">
                          <input
                            type="checkbox"
                            className="form-check-input me-3"
                            checked={item.marked}
                            onChange={() => toggleMark(item._id, item.marked)}
                          />
                          <span className={item.marked ? 'text-decoration-line-through text-muted' : ''}>
                            {item.name}
                          </span>
                        </div>

                        <button
                          className="btn btn-blinkit btn-sm"
                          onClick={() => openBlinkit(item.name)}
                        >
                          <img 
                            src="https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=135/assets/eta-icons/15-mins-filled.png" 
                            alt="Blinkit"
                            style={{ width: '20px', height: '20px', marginRight: '6px' }}
                          />
                          Order on Blinkit
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        {filteredItems.length > 0 && (
          <div className="quick-actions mt-5">
            <button
              className="btn btn-outline-dark btn-lg"
              onClick={() => navigate("/meal-planner")}
            >
              📅 Back to Meal Planner
            </button>
          </div>
        )}
      </div>
    </>
  );
}
