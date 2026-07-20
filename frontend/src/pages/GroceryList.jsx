import { API_BASE_URL } from "../utils/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { mergeIngredientParts, splitIngredientLine } from "../utils/recipeFormatting";
import { parseDateKey } from "../utils/weekPlan";
import "./GroceryList.css";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const validPlanDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const groceryCustomItemsKey = "tastewiseCustomGroceryItems";

/*
  Provider search cleanup words.
  This block supports the disabled Blinkit/Zepto/BigBasket/Instamart order buttons below.
  Re-enable it when grocery ordering/search links are needed again.

const quantityWords = new Set([
  "a", "an", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"
]);

const units = new Set([
  "cup", "cups", "teaspoon", "teaspoons", "tsp", "tablespoon", "tablespoons", "tbsp",
  "gram", "grams", "g", "kg", "kilogram", "kilograms", "ml", "liter", "liters",
  "litre", "litres", "oz", "ounce", "ounces", "pinch", "pinches", "piece", "pieces",
  "clove", "cloves", "slice", "slices", "small", "medium", "sized", "large"
]);

const prepWords = new Set([
  "chopped", "diced", "sliced", "minced", "grated", "crushed", "finely", "roughly",
  "thinly", "fresh", "peeled", "optional", "and", "of", "brewed", "strong", "ground",
  "powdered", "for", "serving", "serve", "served", "servings", "garnish", "to", "taste"
]);

const nonOrderableWords = new Set([
  "chopped", "sliced", "diced", "minced", "grated", "crushed", "peeled", "serving",
  "serve", "served", "servings", "garnish", "optional", "taste", "water", "salt"
]);
*/

const standaloneInstructionPattern = /^(?:to taste|for garnish|for serving|garnish|serving|optional|chopped|sliced|diced|minced|grated|crushed|peeled|peeled and diced|peeled and chopped|peeled and cubed|peeled and grated|thinly sliced|finely chopped|roughly chopped)$/i;

/*
  Shopping provider configuration.
  This was used to open ingredient searches in Blinkit, Zepto, BigBasket, and Instamart.
  It is disabled for now as requested, but kept here for easy reactivation later.

const shoppingProviders = [
  {
    id: "blinkit",
    name: "Blinkit",
    icon: "⚡",
    colorClass: "provider-blinkit",
    getUrl: (query) => `https://blinkit.com/s/?q=${encodeURIComponent(query)}`,
    getAppUrl: (query) => `blinkit://search?q=${encodeURIComponent(query)}`
  },
  {
    id: "zepto",
    name: "Zepto",
    icon: "🛵",
    colorClass: "provider-zepto",
    getUrl: (query) => `https://www.zeptonow.com/search?query=${encodeURIComponent(query)}`
  },
  {
    id: "bigbasket",
    name: "BigBasket",
    icon: "🧺",
    colorClass: "provider-bigbasket",
    getUrl: (query) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(query)}`
  },
  {
    id: "instamart",
    name: "Instamart",
    icon: "🛒",
    colorClass: "provider-instamart",
    getUrl: (query) => `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(query)}`
  }
];
*/

const categoryTabs = [
  { id: "all", label: "All" },
  { id: "vegetables", label: "Vegetables" },
  { id: "grains", label: "Grains and Pulses" },
  { id: "snacks", label: "Snacks" }
];

const categoryPatterns = {
  vegetables: /\b(cabbage|capsicum|bell pepper|broccoli|lettuce|tomato|cucumber|coriander|cilantro|spinach|palak|methi|cauliflower|peas|beans|gourd|lauki|pumpkin|fruit|chilli|chili|leaves|vegetable|carrot|potato|onion|garlic)\b/i,
  grains: /\b(flour|wheat|rice|basmati|atta|dal|lentil|moong|chana|rajma|beans|pulses|oats|quinoa|millet|jowar|bajra|ragi|semolina|suji|noodles|pasta)\b/i,
  snacks: /\b(butter|cheese|paneer|pesto|pepper|masala|snack|chips|bread|buns|dry fruits|nuts|almond|cashew|raisins|sauce|chutney)\b/i
};

const categoryLabels = {
  vegetables: "One Dish - Healthy",
  grains: "Carbs/Roti, Paratha...",
  snacks: "Kitchen Staples"
};

const categoryColorClass = {
  vegetables: "category-healthy",
  grains: "category-carbs",
  snacks: "category-protein"
};

const reminderOptions = ["Don't repeat", "Every day", "Every week", "Every month", "Every year", "Custom"];
const earlyAlertOptions = ["No early alert", "10 minutes before", "30 minutes before", "1 hour before"];
const timeHours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const timeMinutes = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
const customRepeatOptions = ["Every 2 days", "Every 3 days", "Every weekday", "Every weekend"];
const cleanIngredientUnitsPattern = /\b(cup|cups|teaspoon|teaspoons|tsp|tablespoon|tablespoons|tbsp|gram|grams|g|kg|kilogram|kilograms|ml|liter|liters|litre|litres|oz|ounce|ounces|pinch|pinches|piece|pieces|clove|cloves|slice|slices|small|medium|large|bunch|bunches|sprig|sprigs|can|cans|jar|jars|pint|pints)\b/gi;
const cleanIngredientPrepPattern = /\b(finely|roughly|thinly|fresh|chopped|diced|sliced|minced|grated|crushed|peeled|cubed|ground|powdered|brewed|strong|granulated|optional|of|and|or|other|for garnish|for serving|to taste|as needed)\b/gi;

const getStoredCustomItems = () => {
  try {
    return JSON.parse(localStorage.getItem(groceryCustomItemsKey) || "[]");
  } catch {
    return [];
  }
};

export default function GroceryList() {
  const navigate = useNavigate();
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  // Provider selection state is disabled with the grocery ordering feature for now.
  // const [selectedProvider, setSelectedProvider] = useState("blinkit");
  const [checkedItems, setCheckedItems] = useState({});
  const [customItems, setCustomItems] = useState(getStoredCustomItems);
  const [customItemName, setCustomItemName] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [sortMode, setSortMode] = useState("new");
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showDateList, setShowDateList] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [showDateSheet, setShowDateSheet] = useState(false);
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [showRepeatMenu, setShowRepeatMenu] = useState(false);
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);
  const [reminderDraft, setReminderDraft] = useState({
    title: "Grocery reminder",
    checked: [],
    allDay: true,
    dateKey: "",
    time: "23:00",
    repeat: "Don't repeat",
    customRepeat: "Every 2 days",
    earlyAlert: "No early alert"
  });
  // Provider picker sheet is disabled with Blinkit/Zepto/etc ordering for now.
  // const [showProviderPanel, setShowProviderPanel] = useState(false);

  const loadGroceryList = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      const plans = Array.isArray(data)
        ? data.filter((plan) => plan?.recipe?.title && validPlanDatePattern.test(plan.planDate || ""))
        : [];

      setMealPlans(plans);
    } catch (err) {
      console.error(err);
      alert("Failed to load grocery list");
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(loadGroceryList, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  const toggleMark = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const toggleManyItems = (items, nextValue = true) => {
    setCheckedItems(prev => {
      const updated = { ...prev };
      items.forEach((item) => {
        updated[item._sourceId] = nextValue;
      });
      return updated;
    });
  };

  const saveCustomItems = (items) => {
    setCustomItems(items);
    localStorage.setItem(groceryCustomItemsKey, JSON.stringify(items));
  };

  const addCustomItem = () => {
    const name = customItemName.trim();
    if (!name) return;

    saveCustomItems([
      {
        _id: `custom-${Date.now()}`,
        name,
        createdAt: new Date().toISOString()
      },
      ...customItems
    ]);
    setCustomItemName("");
    setShowAddPanel(false);
  };

  /*
    Turns an ingredient like "1 cup chopped tomatoes" into "tomato" for provider search URLs.
    Disabled together with the grocery ordering provider flow.

  const getShoppingSearchTerm = (ingredient) => {
    const withoutParentheses = ingredient.replace(/\([^)]*\)/g, " ");
    const normalized = withoutParentheses
      .replace(/[¼½¾⅓⅔]/g, " ")
      .replace(/\b\d+\s*-\s*\d+\b/g, " ")
      .replace(/\b\d+(?:\.\d+)?(?:\/\d+)?\b/g, " ")
      .replace(/[-]+/g, " ")
      .replace(/[,+]/g, " ")
      .toLowerCase()
      .trim();

    const words = normalized
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !quantityWords.has(word))
      .filter((word) => !units.has(word))
      .filter((word) => !prepWords.has(word));

    const cleaned = words.join(" ").trim();

    return cleaned
      .replace(/\btomatoes\b/g, "tomato")
      .replace(/\bpotatoes\b/g, "potato")
      .replace(/\bonions\b/g, "onion")
      .replace(/\bchilies\b/g, "chilli")
      .replace(/\bchillies\b/g, "chilli")
      .replace(/\bleaves\b/g, "leaves")
      .trim();
  };

  const isOrderableIngredient = (ingredient) => {
    const searchTerm = getShoppingSearchTerm(ingredient);
    const normalizedIngredient = String(ingredient || "").toLowerCase();
    const normalizedSearch = searchTerm.toLowerCase();

    if (!normalizedSearch || normalizedSearch.length < 3) return false;
    if (/\b(to taste|for garnish|for serving|garnish|serving|optional)\b/i.test(normalizedIngredient)) return false;
    if (nonOrderableWords.has(normalizedSearch)) return false;
    if (normalizedSearch.split(/\s+/).every((word) => nonOrderableWords.has(word))) return false;

    return true;
  };

  const shouldDisplayIngredient = (ingredient) => {
    const normalizedIngredient = String(ingredient || "").trim();
    if (!normalizedIngredient) return false;
    return !standaloneInstructionPattern.test(normalizedIngredient);
  };

  const openShoppingProvider = (ingredient) => {
    if (!isOrderableIngredient(ingredient)) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const searchTerm = getShoppingSearchTerm(ingredient);
    const provider = shoppingProviders.find((item) => item.id === selectedProvider) || shoppingProviders[0];
    const webLink = provider.getUrl(searchTerm);

    if (isMobile && provider.getAppUrl) {
      window.location.href = provider.getAppUrl(searchTerm);

      setTimeout(() => {
        window.location.href = webLink;
      }, 2000);
    } else {
      window.open(webLink, "_blank");
    }
  };
  */

  const shouldDisplayIngredient = (ingredient) => {
    const normalizedIngredient = String(ingredient || "").trim();
    if (!normalizedIngredient) return false;
    return !standaloneInstructionPattern.test(normalizedIngredient);
  };

  /*
    Old grocery display kept quantities such as "1/2 teaspoon" and "2 cups".
    To restore that later, replace cleanIngredientName(item.name) in the JSX with:
    formatIngredientAmount(item.name)
  */
  const cleanIngredientName = (ingredient) => {
    const cleaned = String(ingredient || "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[¼½¾⅓⅔]/g, " ")
      .replace(/\b\d+\s*-\s*\d+\b/g, " ")
      .replace(/\b\d+(?:\.\d+)?(?:\/\d+)?\b/g, " ")
      .replace(cleanIngredientUnitsPattern, " ")
      .replace(cleanIngredientPrepPattern, " ")
      .replace(/[,+]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\btomatoes\b/gi, "tomato")
      .replace(/\bonions\b/gi, "onion")
      .replace(/\bpotatoes\b/gi, "potato")
      .replace(/\bbananas\b/gi, "banana")
      .replace(/\bchilies\b/gi, "chilli")
      .replace(/\bchillies\b/gi, "chilli");

    if (!cleaned) return String(ingredient || "").trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const getDisplayItems = () => {
    const planItems = mealPlans.flatMap((mealPlan) => {
      const ingredients = mealPlan.recipe?.ingredients || [];
      const parts = mergeIngredientParts(ingredients.flatMap(splitIngredientLine));

      return parts.filter(shouldDisplayIngredient).map((part, partIndex) => ({
          _displayId: `${mealPlan._id}-${partIndex}`,
          _sourceId: `${mealPlan._id}-${partIndex}`,
          _recipeId: String(mealPlan._id),
          _recipeTitle: mealPlan.recipe?.title || "Recipe",
          _planDate: mealPlan.planDate || "",
          mealType: mealPlan.mealType,
          marked: false,
          name: part,
          displayName: cleanIngredientName(part)
        }));
    });

    const manualItems = customItems.map((item, index) => ({
      _displayId: item._id,
      _sourceId: item._id,
      _recipeId: "manual",
      _recipeTitle: "Added manually",
      _planDate: "",
      mealType: "manual",
      marked: false,
      name: item.name,
      displayName: cleanIngredientName(item.name),
      manualIndex: index
    }));

    return [...manualItems, ...planItems];
  };

  const getItemCategory = (item) => {
    const name = String(item.displayName || item.name || "");
    if (categoryPatterns.vegetables.test(name)) return "vegetables";
    if (categoryPatterns.grains.test(name)) return "grains";
    if (categoryPatterns.snacks.test(name)) return "snacks";
    return "snacks";
  };

  const getFilteredItems = () => {
    const displayItems = getDisplayItems();
    if (filter === "all") return displayItems;
    return displayItems.filter((item) => getItemCategory(item) === filter);
  };

  const getMealTypeCount = (mealType) => {
    return getDisplayItems().filter((item) => getItemCategory(item) === mealType).length;
  };

  const formatPlanDate = (dateKey) => {
    if (!dateKey || dateKey === "manual") return "";
    const date = parseDateKey(dateKey);
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayKey = toDateKey(new Date());

  const formatShortDate = (dateKey) => {
    if (!dateKey || dateKey === "manual") return "Added manually";
    const date = parseDateKey(dateKey);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  };

  const getCalendarDays = () => {
    const baseDate = reminderDraft.dateKey ? parseDateKey(reminderDraft.dateKey) : new Date();
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const firstDay = start.getDay();
    const days = [];

    for (let index = 0; index < firstDay; index += 1) {
      days.push(null);
    }

    const totalDays = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= totalDays; day += 1) {
      days.push(new Date(baseDate.getFullYear(), baseDate.getMonth(), day));
    }

    return {
      label: baseDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      days
    };
  };

  const groupItemsByDate = (items) => {
    const groups = {};

    items.forEach((item) => {
      const dateKey = item._planDate || "manual";
      if (!groups[dateKey]) groups[dateKey] = {};

      const category = getItemCategory(item);
      const recipeKey = groupByCategory ? `${dateKey}-${category}` : `${item._recipeId}-${item._recipeTitle}`;
      if (!groups[dateKey][recipeKey]) {
        groups[dateKey][recipeKey] = {
          id: recipeKey,
          title: groupByCategory ? categoryTabs.find((tab) => tab.id === category)?.label || "Other" : item._recipeTitle,
          category,
          items: []
        };
      }

      groups[dateKey][recipeKey].items.push(item);
    });

    return Object.entries(groups)
      .sort(([dateA], [dateB]) => {
        if (dateA === "manual") return -1;
        if (dateB === "manual") return 1;
        return dateA.localeCompare(dateB);
      })
      .map(([dateKey, recipes]) => ({
        dateKey,
        recipes: Object.values(recipes)
      }));
  };

  const getDateRows = () => {
    const keys = [...new Set(mealPlans.map((plan) => plan.planDate).filter(Boolean))].sort();

    if (keys.length > 0) {
      return keys.map((dateKey) => ({
        dateKey,
        count: mealPlans.filter((plan) => plan.planDate === dateKey).length
      }));
    }

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      return { dateKey: toDateKey(date), count: 0 };
    });
  };

  const updateReminderDate = (offsetDays) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    setReminderDraft(prev => ({ ...prev, dateKey: toDateKey(date), allDay: true }));
  };

  const shiftReminderMonth = (offset) => {
    const baseDate = reminderDraft.dateKey ? parseDateKey(reminderDraft.dateKey) : new Date();
    baseDate.setMonth(baseDate.getMonth() + offset);
    setReminderDraft(prev => ({ ...prev, dateKey: toDateKey(baseDate) }));
  };

  const toggleReminderChecklist = (index) => {
    setReminderDraft(prev => ({
      ...prev,
      checked: prev.checked.includes(index)
        ? prev.checked.filter((item) => item !== index)
        : [...prev.checked, index]
    }));
  };

  const setReminderTimePart = (part, value) => {
    const [hour, minute] = reminderDraft.time.split(":");
    setReminderDraft(prev => ({
      ...prev,
      allDay: false,
      time: part === "hour" ? `${value}:${minute || "00"}` : `${hour || "23"}:${value}`
    }));
  };

  const getReminderTasks = (items) => {
    const pendingNames = [...new Set(items.map((item) => item.displayName || item.name).filter(Boolean))];
    const pantryItems = pendingNames.filter((name) => getItemCategory({ displayName: name }) !== "vegetables").slice(0, 4);
    const freshItems = pendingNames.filter((name) => getItemCategory({ displayName: name }) === "vegetables").slice(0, 4);

    return [
      {
        title: "Ingredients",
        detail: pendingNames.length ? `${pendingNames.length} items to review` : "Nothing pending"
      },
      {
        title: "Pantry",
        detail: pantryItems.length ? pantryItems.join(", ") : "Check basics before shopping"
      },
      {
        title: "Missing items",
        detail: freshItems.length ? freshItems.join(", ") : "Add items from your recipes"
      }
    ];
  };

  if (loading) {
    return (
      <div className="grocery-app-shell loading">
        <div className="grocery-loading">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading your grocery list...</p>
        </div>
      </div>
    );
  }

  const filteredItems = getFilteredItems();
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortMode === "name") return String(a.name).localeCompare(String(b.name));
    return (a.manualIndex ?? 9999) - (b.manualIndex ?? 9999);
  });
  const activeItems = sortedItems.filter((item) => !checkedItems[item._sourceId]);
  const completedItems = sortedItems.filter((item) => checkedItems[item._sourceId]);
  const dateGroups = groupItemsByDate(activeItems);
  const dateRows = getDateRows();
  const calendar = getCalendarDays();
  const reminderTasks = getReminderTasks(activeItems);
  const [selectedHour, selectedMinute] = reminderDraft.time.split(":");
  const reminderDateLabel = reminderDraft.dateKey === todayKey
    ? "Today"
    : reminderDraft.dateKey
      ? formatShortDate(reminderDraft.dateKey)
      : "Today";
  // Active provider lookup is disabled with the grocery ordering feature for now.
  // const activeProvider = shoppingProviders.find((provider) => provider.id === selectedProvider) || shoppingProviders[0];

  return (
    <>
      <Navbar />
      <div className="grocery-app-shell">
        <header className="grocery-topbar">
          <button type="button" className="grocery-icon-btn back" onClick={() => navigate("/home")} aria-label="Back to home">
            ‹
          </button>
          <div>
            <h1>Grocery list</h1>
            <p>{activeItems.length} open • {completedItems.length} completed</p>
          </div>
          <div className="grocery-header-actions">
            <button type="button" className="grocery-icon-btn" onClick={() => setShowDateList(true)} aria-label="Open date ingredient list">
              ☰
            </button>
            <button type="button" className="grocery-icon-btn" onClick={() => setShowReminderSheet(true)} aria-label="Open grocery reminder">
              ⏰
            </button>
            {/*
              Provider picker button.
              This opened the Blinkit/Zepto/BigBasket/Instamart selection sheet.
              Disabled for now as requested.

            <button type="button" className="grocery-icon-btn" onClick={() => setShowProviderPanel(true)} aria-label="Choose order provider">
              ▰
            </button>
            */}
            <button type="button" className="grocery-icon-btn" onClick={() => setShowSettings(true)} aria-label="Open grocery settings">
              ⚙︎
            </button>
          </div>
        </header>

      <main className="grocery-mobile-screen">
        <nav className="grocery-category-tabs" aria-label="Grocery categories">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={filter === tab.id ? "active" : ""}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}{tab.id !== "all" ? ` ${getMealTypeCount(tab.id)}` : ""}
            </button>
          ))}
        </nav>

        {activeItems.length === 0 ? (
          <section className="grocery-empty-state">
            <strong>No grocery items yet</strong>
            <span>Add recipes to your meal planner or use the plus button to add an item.</span>
          </section>
        ) : (
          <section className="grocery-date-list">
            {dateGroups.map((dateGroup) => (
              <article key={dateGroup.dateKey} className="grocery-date-section">
                <div className="grocery-date-heading">
                  <h2>{formatShortDate(dateGroup.dateKey)}</h2>
                  {dateGroup.dateKey === todayKey && <span>Today</span>}
                  <button type="button" onClick={() => setShowReminderSheet(true)} aria-label={`Reminder for ${formatShortDate(dateGroup.dateKey)}`}>
                    ⋮
                  </button>
                </div>

                <div className="grocery-task-card date-card">
                  {dateGroup.recipes.map((recipeGroup) => (
                    <article key={recipeGroup.id} className="grocery-recipe-chip-block">
                      <div className="grocery-recipe-chip-heading">
                        <span className={`grocery-category-pill ${categoryColorClass[recipeGroup.category]}`}>
                          {categoryLabels[recipeGroup.category]}
                        </span>
                        <strong>{recipeGroup.title}</strong>
                        <button
                          type="button"
                          onClick={() => toggleManyItems(recipeGroup.items, true)}
                          aria-label={`Mark all ${recipeGroup.title} ingredients complete`}
                        >
                          ✓ All
                        </button>
                      </div>
                      <div className="grocery-ingredient-chips">
                        {recipeGroup.items.map((item) => (
                          <button
                            key={item._displayId}
                          type="button"
                          className="grocery-chip"
                          onClick={() => toggleMark(item._sourceId)}
                        >
                            {item.displayName}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        {showCompleted && completedItems.length > 0 && (
          <section className="grocery-completed">
            <span className="completed-pill">Completed tasks</span>
            <h2>{formatPlanDate(completedItems[0]._planDate) || "Checked items"}</h2>
            <div className="grocery-task-card completed-card">
              {completedItems.map((item) => (
                <button
                  key={item._displayId}
                  type="button"
                  className="completed-item"
                  onClick={() => toggleMark(item._sourceId)}
                >
                  <span>✓</span>
                  <del>{item.displayName}</del>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <button type="button" className="grocery-fab" onClick={() => setShowAddPanel(true)} aria-label="Add grocery item">
        +
      </button>

      {showSettings && (
        <div className="grocery-sheet-backdrop" onClick={() => setShowSettings(false)}>
          <section className="grocery-settings-sheet" onClick={(event) => event.stopPropagation()}>
            <label className="grocery-toggle-row">
              <span>Show completed tasks</span>
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(event) => setShowCompleted(event.target.checked)}
              />
            </label>

            <h2>Order of tasks</h2>
            <div className="settings-list">
              <button type="button" onClick={() => setSortMode("new")}>
                <span>New</span>
                {sortMode === "new" && <strong>✓</strong>}
              </button>
              <button type="button" onClick={() => setSortMode("name")}>
                <span>Name</span>
                {sortMode === "name" && <strong>✓</strong>}
              </button>
              <label>
                <span>Group by category</span>
                <input
                  type="checkbox"
                  checked={groupByCategory}
                  onChange={(event) => setGroupByCategory(event.target.checked)}
                />
              </label>
            </div>
          </section>
        </div>
      )}

      {showAddPanel && (
        <div className="grocery-sheet-backdrop" onClick={() => setShowAddPanel(false)}>
          <section className="grocery-settings-sheet add-sheet" onClick={(event) => event.stopPropagation()}>
            <h2>Add grocery item</h2>
            <input
              value={customItemName}
              onChange={(event) => setCustomItemName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addCustomItem();
              }}
              placeholder="Ingredient name"
              autoFocus
            />
            <button type="button" className="sheet-primary-btn" onClick={addCustomItem}>Add item</button>
          </section>
        </div>
      )}

      {showDateList && (
        <div className="grocery-sheet-backdrop align-top" onClick={() => setShowDateList(false)}>
          <section className="grocery-date-sheet" onClick={(event) => event.stopPropagation()}>
            <header className="grocery-sheet-titlebar">
              <button type="button" onClick={() => setShowDateList(false)} aria-label="Close select ingredients">‹</button>
              <h2>Select Ingredients</h2>
            </header>

            <div className="grocery-simple-date-list">
              {dateRows.map((row) => (
                <button
                  key={row.dateKey}
                  type="button"
                  className="grocery-simple-date-row"
                  onClick={() => setShowDateList(false)}
                >
                  <span>{formatShortDate(row.dateKey)}</span>
                  {row.dateKey === todayKey && <strong>Today</strong>}
                  <small>{row.count ? `${row.count} recipes` : "No recipes"}</small>
                  <em>⋮</em>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {showReminderSheet && (
        <div className="grocery-sheet-backdrop" onClick={() => setShowReminderSheet(false)}>
          <section className="grocery-reminder-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <input
              className="reminder-title-input"
              value={reminderDraft.title}
              onChange={(event) => setReminderDraft(prev => ({ ...prev, title: event.target.value }))}
              placeholder="Reminder title"
            />

            <div className="reminder-checklist">
              {reminderTasks.map((item, index) => (
                <button key={item.title} type="button" onClick={() => toggleReminderChecklist(index)}>
                  <span className={reminderDraft.checked.includes(index) ? "checked" : ""}>✓</span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </button>
              ))}
            </div>

            <div className="reminder-selected-chip">
              <span>{reminderDateLabel}{!reminderDraft.allDay ? `, ${reminderDraft.time}` : ""}</span>
              <button
                type="button"
                onClick={() => setReminderDraft(prev => ({ ...prev, dateKey: "", time: "23:00" }))}
                aria-label="Clear reminder schedule"
              >
                −
              </button>
            </div>

            <button type="button" className="reminder-save-btn" onClick={() => setShowReminderSheet(false)} aria-label="Save reminder">
              ✓
            </button>

            <div className="reminder-icon-row" aria-label="Reminder tools">
              <button type="button" className="active" aria-label="Checklist">✓</button>
              <button type="button" onClick={() => setShowDateSheet(true)} aria-label="Set date">▦</button>
              <button type="button" onClick={() => setReminderDraft(prev => ({ ...prev, earlyAlert: earlyAlertOptions[1] }))} aria-label="Early alert">◉</button>
              <button type="button" onClick={() => setShowTimeSheet(true)} aria-label="Set time">◷</button>
              <button type="button" onClick={() => setShowRepeatMenu(true)} aria-label="Repeat">↻</button>
            </div>

            <div className="reminder-options">
              <label className="reminder-option-row">
                <span>◷</span>
                <strong>All day</strong>
                <input
                  type="checkbox"
                  checked={reminderDraft.allDay}
                  onChange={(event) => setReminderDraft(prev => ({ ...prev, allDay: event.target.checked }))}
                />
              </label>

              <div className="reminder-chip-row">
                <button type="button" onClick={() => updateReminderDate(0)}>Today</button>
                <button type="button" onClick={() => updateReminderDate(1)}>Tomorrow</button>
                <button type="button" onClick={() => updateReminderDate(3)}>3 days from now</button>
                <button type="button" onClick={() => updateReminderDate(7)}>1 week</button>
              </div>

              <div className="reminder-chip-row">
                <button type="button" onClick={() => setShowDateSheet(true)}>Set date</button>
                <button
                  type="button"
                  onClick={() => {
                    setReminderDraft(prev => ({ ...prev, allDay: false }));
                    setShowTimeSheet(true);
                  }}
                >
                  Set time
                </button>
                {["07:00", "15:00", "23:00"].map((time) => (
                  <button key={time} type="button" onClick={() => setReminderDraft(prev => ({ ...prev, time, allDay: false }))}>
                    {time}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="reminder-option-row muted"
                onClick={() => {
                  const currentIndex = earlyAlertOptions.indexOf(reminderDraft.earlyAlert);
                  const nextIndex = (currentIndex + 1) % earlyAlertOptions.length;
                  setReminderDraft(prev => ({ ...prev, earlyAlert: earlyAlertOptions[nextIndex] }));
                }}
              >
                <span>◉</span>
                <strong>{reminderDraft.earlyAlert}</strong>
              </button>

              <button type="button" className="reminder-option-row muted" onClick={() => setShowRepeatMenu(true)}>
                <span>↻</span>
                <strong>{reminderDraft.repeat === "Custom" ? reminderDraft.customRepeat : reminderDraft.repeat}</strong>
              </button>
            </div>
          </section>
        </div>
      )}

      {showDateSheet && (
        <div className="grocery-sheet-backdrop nested" onClick={() => setShowDateSheet(false)}>
          <section className="grocery-picker-sheet" onClick={(event) => event.stopPropagation()}>
            <h2>Set date</h2>
            <div className="calendar-heading">
              <button type="button" onClick={() => shiftReminderMonth(-1)}>‹</button>
              <strong>{calendar.label}</strong>
              <button type="button" onClick={() => shiftReminderMonth(1)}>›</button>
            </div>
            <div className="calendar-grid">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <span key={day}>{day}</span>)}
              {calendar.days.map((day, index) => {
                const key = day ? toDateKey(day) : `empty-${index}`;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!day}
                    className={day && reminderDraft.dateKey === toDateKey(day) ? "selected" : ""}
                    onClick={() => day && setReminderDraft(prev => ({ ...prev, dateKey: toDateKey(day) }))}
                  >
                    {day ? day.getDate() : ""}
                  </button>
                );
              })}
            </div>
            <div className="picker-actions">
              <button type="button" onClick={() => setShowDateSheet(false)}>Cancel</button>
              <button type="button" onClick={() => setShowDateSheet(false)}>Done</button>
            </div>
          </section>
        </div>
      )}

      {showTimeSheet && (
        <div className="grocery-sheet-backdrop nested" onClick={() => setShowTimeSheet(false)}>
          <section className="grocery-picker-sheet" onClick={(event) => event.stopPropagation()}>
            <h2>Set time</h2>
            <div className="time-scroll-picker" aria-label="Set reminder time">
              <div className="time-scroll-column">
                {timeHours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className={selectedHour === hour ? "selected" : ""}
                    onClick={() => setReminderTimePart("hour", hour)}
                  >
                    {hour}
                  </button>
                ))}
              </div>
              <strong>:</strong>
              <div className="time-scroll-column">
                {timeMinutes.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={selectedMinute === minute ? "selected" : ""}
                    onClick={() => setReminderTimePart("minute", minute)}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>
            <div className="picker-actions">
              <button type="button" onClick={() => setShowTimeSheet(false)}>Cancel</button>
              <button type="button" onClick={() => setShowTimeSheet(false)}>Done</button>
            </div>
          </section>
        </div>
      )}

      {showRepeatMenu && (
        <div className="grocery-sheet-backdrop nested" onClick={() => setShowRepeatMenu(false)}>
          <section className="grocery-repeat-menu" onClick={(event) => event.stopPropagation()}>
            {reminderOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setReminderDraft(prev => ({ ...prev, repeat: option }));
                  if (option === "Custom") {
                    setShowRepeatMenu(false);
                    setShowCustomRepeat(true);
                  } else {
                    setShowRepeatMenu(false);
                  }
                }}
              >
                <span>{option}</span>
                {reminderDraft.repeat === option && <strong>✓</strong>}
              </button>
            ))}
          </section>
        </div>
      )}

      {showCustomRepeat && (
        <div className="grocery-sheet-backdrop nested" onClick={() => setShowCustomRepeat(false)}>
          <section className="grocery-repeat-menu custom-repeat-menu" onClick={(event) => event.stopPropagation()}>
            <h2>Custom repeat</h2>
            {customRepeatOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setReminderDraft(prev => ({ ...prev, repeat: "Custom", customRepeat: option }));
                  setShowCustomRepeat(false);
                }}
              >
                <span>{option}</span>
                {reminderDraft.customRepeat === option && <strong>✓</strong>}
              </button>
            ))}
          </section>
        </div>
      )}

      {/*
        Shopping provider selection sheet.
        This rendered Blinkit, Zepto, BigBasket, and Instamart choices.
        Disabled for now as requested.

      {showProviderPanel && (
        <div className="grocery-sheet-backdrop" onClick={() => setShowProviderPanel(false)}>
          <section className="grocery-settings-sheet add-sheet" onClick={(event) => event.stopPropagation()}>
            <h2>Order ingredients on</h2>
            <div className="provider-options">
              {shoppingProviders.map((provider) => (
                <button
                  key={provider.id}
                  className={`provider-option ${provider.colorClass} ${selectedProvider === provider.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedProvider(provider.id);
                    setShowProviderPanel(false);
                  }}
                >
                  <span>{provider.icon}</span>
                  {provider.name}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      */}
      </div>
    </>
  );
}
