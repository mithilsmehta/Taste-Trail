import { apiUrl } from "../utils/api";
import { useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AdSlot from "../components/AdSlot";
import Navbar from "../components/Navbar";
import { getMondayDateKey, getWeekFromDateKey } from "../utils/weekPlan";
import { formatIngredientAmount } from "../utils/recipeFormatting";
import { estimateNutrition } from "../utils/nutritionEstimator";
import { getUserFoodPreference } from "../utils/foodPreference";

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

const nonVegetarianPattern = /\b(chicken|mutton|beef|pork|fish|seafood|prawn|shrimp|eggs?|gelatin|bacon|ham|turkey|lamb|keema)\b/i;
const jainRestrictedPattern = /\b(onions?|garlic|potatoes?|aloo|carrots?|radish|beetroot|beet|turnip|ginger|sweet potato|yam|tapioca|cassava|arbi|colocasia|spring onion|green onion|scallion|leek|shallot)\b/i;
const veganRestrictedPattern = /\b(milk|curd|yogurt|yoghurt|dahi|paneer|cheese|cream|butter|ghee|honey|mayonnaise|mayo|mozzarella|parmesan|ricotta|mascarpone|malai|buttermilk|whey|casein|milk powder|condensed milk|khoya|mawa|eggs?)\b/i;
const getPreferredServings = (user) => {
  const servings = Number(user?.onboarding?.usualServings);
  if (!Number.isFinite(servings)) return 2;
  return Math.min(10, Math.max(1, Math.round(servings)));
};

const getRegionalStyle = (user) => {
  return String(user?.onboarding?.ethnicity || "")
    .trim()
    .replace(/\s+/g, " ");
};

const clampHealthScore = (value) => Math.min(100, Math.max(0, Math.round(value)));

const estimateRecipeHealth = (recipe = {}) => {
  const title = String(recipe.name || recipe.title || "").toLowerCase();
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const text = [title, ...ingredients, ...steps].join(" ").toLowerCase();
  let score = 55;

  const addIf = (pattern, points) => {
    if (pattern.test(text)) score += points;
  };

  const titleAddIf = (pattern, points) => {
    if (pattern.test(title)) score += points;
  };

  titleAddIf(/\b(bhakri|jowar|bajra|ragi|millet|sprout|salad|soup|steamed|idli|dhokla|khaman|dal|sabji|shaak)\b/i, 16);
  titleAddIf(/\b(bhakri\s*pizza|millet\s*pizza|jowar\s*pizza|bajra\s*pizza)\b/i, 24);
  titleAddIf(/\bpaneer\s+(tikka|sabji|subji|sabzi|curry|masala|bhurji)\b/i, 18);
  titleAddIf(/\b(pizza|pav\s*bhaji|burger|fries|bhature|puri|pakora|tiramisu|cake|dessert|ice\s*cream)\b/i, -26);

  addIf(/\b(vegetable|vegetables|spinach|palak|methi|cabbage|cauliflower|capsicum|tomato|cucumber|beans|peas|lauki|bottle gourd|pumpkin|sprouts?|lentils?|dal|chana|chickpeas?|rajma|tofu|paneer|curd|yogurt|dahi|besan|gram flour)\b/i, 10);
  addIf(/\b(whole wheat|atta|jowar|bajra|ragi|millet|oats|brown rice|quinoa|steamed|boiled|baked|grilled|roasted|tikka|saute|sauté)\b/i, 12);
  addIf(/\b(deep[-\s]?fried|fried|butter|ghee|cream|cheese|mayonnaise|maida|all[-\s]?purpose flour|refined flour|sugar|syrup|condensed milk|whipping cream)\b/i, -16);

  const isPaneerTikka = /\bpaneer\s+tikka\b/i.test(title);
  const isPaneerDish = /\bpaneer\s+(sabji|subji|sabzi|curry|masala|bhurji)\b/i.test(title);
  const highFatCount = ingredients.filter((ingredient) => /\b(butter|ghee|oil|cream|cheese|mayonnaise)\b/i.test(String(ingredient))).length;
  const vegetableCount = ingredients.filter((ingredient) => /\b(vegetable|spinach|palak|methi|cabbage|cauliflower|capsicum|tomato|cucumber|beans|peas|lauki|pumpkin|sprouts?|dal|lentil|chana|chickpea|tofu)\b/i.test(String(ingredient))).length;

  score -= Math.min(isPaneerTikka ? 8 : 18, highFatCount * (isPaneerTikka ? 2 : 4));
  score += Math.min(16, vegetableCount * 3);

  if (isPaneerTikka) score = Math.min(88, Math.max(score, 78));
  if (isPaneerDish) score = Math.max(score, 70);

  return clampHealthScore(score);
};

const getHealthLabel = (score) => {
  if (score >= 70) return "Healthy";
  if (score <= 40) return "Unhealthy";
  return "Moderate";
};

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get("q");
  const savedRecipeId = searchParams.get("savedId");
  const preferredServings = getPreferredServings(user);
  const regionalStyle = getRegionalStyle(user);
  const foodPreference = getUserFoodPreference(user);

  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [recipeSource, setRecipeSource] = useState("");
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customIngredient, setCustomIngredient] = useState("");
  const [hasIngredientChanges, setHasIngredientChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [servings, setServings] = useState(preferredServings);
  const [originalRecipe, setOriginalRecipe] = useState(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [addingMealPlan, setAddingMealPlan] = useState(false);
  const [mealPlanChoice, setMealPlanChoice] = useState({
    mealType: "",
    dayIndex: null,
    planDate: ""
  });
  const historyGuardActiveRef = useRef(false);

  useEffect(() => {
    if (!hasIngredientChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasIngredientChanges]);

  useEffect(() => {
    if (!hasIngredientChanges || historyGuardActiveRef.current) return undefined;

    historyGuardActiveRef.current = true;
    window.history.pushState({ recipeUnsavedGuard: true }, "");

    const handlePopState = () => {
      if (!hasIngredientChanges) return;
      setPendingNavigation("/home");
      setShowUnsavedModal(true);
      window.history.pushState({ recipeUnsavedGuard: true }, "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      historyGuardActiveRef.current = false;
    };
  }, [hasIngredientChanges]);

  const normalizeTitle = (value) => {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  };

  const getDietMode = () => {
    return foodPreference;
  };

  const getDietModeLabel = () => {
    const mode = getDietMode();
    if (mode === "jain") return "Jain";
    if (mode === "vegan") return "Vegan";
    return "Veg";
  };

  const getRecipeSafetyText = (value) => {
    return [
      value?.name,
      value?.title,
      ...(Array.isArray(value?.ingredients) ? value.ingredients : []),
      ...(Array.isArray(value?.steps) ? value.steps : [])
    ].join(" ");
  };

  const isRecipeSafeForDietMode = (value) => {
    const text = getRecipeSafetyText(value);
    if (nonVegetarianPattern.test(text)) return false;
    if (getDietMode() === "jain" && jainRestrictedPattern.test(text)) return false;
    if (getDietMode() === "vegan" && veganRestrictedPattern.test(text)) return false;
    return true;
  };

  const getModeBlockedText = () => {
    if (getDietMode() === "jain") return "Jain search blocks non-veg items, onion, garlic, ginger, potato, carrot, and root vegetables. Potato-based dishes should use Jain-safe substitutes like raw banana.";
    if (getDietMode() === "vegan") return "Vegan search blocks non-veg items, dairy, honey, eggs, and animal products.";
    return "Veg recipes block non-veg items.";
  };

  const clearRecipeBrowserCache = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("tastewiseRecipe:"))
      .forEach((key) => localStorage.removeItem(key));
  };

  const getRecipeText = () => {
    if (!recipe) return "";

    const ingredients = getCleanIngredients(recipe.ingredients)
      .map((item, index) => `${index + 1}. ${formatIngredientAmount(item)}`)
      .join("\n");
    const steps = (recipe.steps || [])
      .map((step, index) => `${index + 1}. ${step}`)
      .join("\n");

    return `${recipe.name}\n${recipe.description || ""}\n\nIngredients:\n${ingredients}\n\nCooking Steps:\n${steps}`;
  };

  const getCleanIngredients = (ingredients = []) => {
    return ingredients
      .map((ingredient) => String(ingredient || "").trim())
      .filter(Boolean);
  };

  const getRecipeForSaving = () => {
    if (!recipe) return null;
    return {
      ...recipe,
      healthScore: getCurrentHealthScore(),
      healthLabel: getCurrentHealthLabel(),
      nutrition: getCurrentNutrition(),
      ingredients: getCleanIngredients(recipe.ingredients)
    };
  };

  const getCurrentHealthScore = () => {
    if (!recipe) return 50;
    const score = Number(recipe.healthScore);
    if (hasIngredientChanges) return estimateRecipeHealth(recipe);
    return Number.isFinite(score) ? clampHealthScore(score) : estimateRecipeHealth(recipe);
  };

  const getCurrentHealthLabel = () => {
    if (!recipe) return "Moderate";
    return recipe.healthLabel || getHealthLabel(getCurrentHealthScore());
  };

  const getCurrentNutrition = () => {
    const nutrition = recipe?.nutrition || {};
    const ingredients = getCleanIngredients(recipe?.ingredients || []);
    const estimatedTotalNutrition = estimateNutrition(ingredients, 1);
    const currentServings = Math.max(1, Number(servings) || Number(recipe?.servings) || 1);

    const readNutritionValue = (key) => {
      const estimated = Number(estimatedTotalNutrition[key]);
      const provided = Number(nutrition[key]);

      if (Number.isFinite(estimated) && estimated > 0) {
        return Math.max(0, Math.round(estimated));
      }

      return Number.isFinite(provided) && provided > 0
        ? Math.max(0, Math.round(provided * currentServings))
        : 0;
    };

    return {
      calories: readNutritionValue("calories"),
      protein: readNutritionValue("protein"),
      carbs: readNutritionValue("carbs"),
      fat: readNutritionValue("fat"),
      fiber: readNutritionValue("fiber")
    };
  };

  const getNutritionSegments = () => {
    const nutrition = getCurrentNutrition();
    const segments = [
      { key: "carbs", label: "Carbs", value: nutrition.carbs, unit: "g", color: "#f5b642", softColor: "#fff1cf" },
      { key: "fat", label: "Fat", value: nutrition.fat, unit: "g", color: "#e85d75", softColor: "#ffe2e8" },
      { key: "protein", label: "Protein", value: nutrition.protein, unit: "g", color: "#2fa36b", softColor: "#ddf5e9" },
      { key: "fiber", label: "Fiber", value: nutrition.fiber, unit: "g", color: "#4aa8df", softColor: "#dff1fb" }
    ];
    const totalMacros = segments.reduce((sum, segment) => sum + Math.max(0, Number(segment.value) || 0), 0) || 1;

    return segments.map((segment) => ({
      ...segment,
      percentage: Math.max(6, Math.min(100, Math.round((Math.max(0, Number(segment.value) || 0) / totalMacros) * 100)))
    }));
  };

  const markRecipeCustomized = () => {
    setHasIngredientChanges(true);
    setIsSaved(false);
  };

  const requestNavigation = (target) => {
    if (!hasIngredientChanges) {
      navigate(target);
      return;
    }

    setPendingNavigation(target);
    setShowUnsavedModal(true);
  };

  const getRecipeLabelForDate = (dateKey) => {
    if (!dateKey) return "";
    const week = getWeekFromDateKey(getMondayDateKey(dateKey));
    return week.find((day) => day.dateKey === dateKey)?.fullLabel || dateKey;
  };

  const getDayIndexForDate = (dateKey) => {
    const week = getWeekFromDateKey(getMondayDateKey(dateKey));
    const dayIndex = week.findIndex((day) => day.dateKey === dateKey);
    return dayIndex >= 0 ? dayIndex : 0;
  };

  const parseQuantity = (value) => {
    const normalized = String(value || "").trim();

    if (/^\d+\s+\d+\/\d+$/.test(normalized)) {
      const [whole, fraction] = normalized.split(/\s+/);
      const [numerator, denominator] = fraction.split("/").map(Number);
      return Number(whole) + (denominator ? numerator / denominator : 0);
    }

    if (normalized.includes("/")) {
      const [numerator, denominator] = normalized.split("/").map(Number);
      return denominator ? numerator / denominator : Number(normalized);
    }

    return Number(normalized);
  };

  const formatScaledAmount = (amount) => {
    const rounded = Math.round(amount * 8) / 8;
    const whole = Math.floor(rounded);
    const decimal = Number((rounded - whole).toFixed(3));

    const fractionMap = {
      0.125: "⅛",
      0.25: "¼",
      0.375: "⅜",
      0.5: "½",
      0.625: "⅝",
      0.75: "¾",
      0.875: "⅞"
    };

    if (decimal === 0) return String(whole);
    const fraction = fractionMap[decimal];
    if (!fraction) return Number(amount.toFixed(2)).toString();
    return whole > 0 ? `${whole}${fraction}` : fraction;
  };

  const scaleIngredientText = (ingredient, scaleFactor) => {
    const numberMatch = ingredient.match(/\b(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\b/);

    if (!numberMatch) return ingredient;

    const originalAmount = parseQuantity(numberMatch[1]);
    if (!Number.isFinite(originalAmount)) return ingredient;

    const scaledAmount = originalAmount * scaleFactor;
    const formattedAmount = formatScaledAmount(scaledAmount);

    return ingredient.replace(numberMatch[1], formattedAmount);
  };

  const getSavedRecipeFromDatabase = async (servingCount = servings) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await fetch(apiUrl(`/api/recipes/find?title=${encodeURIComponent(query)}`), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 404) return null;
    if (!res.ok) return null;

    const savedRecipe = await res.json();

    if (!savedRecipe) return null;
    if (regionalStyle && normalizeTitle(savedRecipe.regionalStyle) !== normalizeTitle(regionalStyle)) return null;
    if (!isRecipeSafeForDietMode(savedRecipe)) return null;

    const savedServings = Number(savedRecipe.servings) || 2;
    const scaleFactor = servingCount / savedServings;

      return {
        name: savedRecipe.title,
        description: savedRecipe.description || "",
        ingredients: (savedRecipe.ingredients || []).map((ingredient) => scaleIngredientText(ingredient, scaleFactor)),
      steps: savedRecipe.steps || [],
      healthScore: savedRecipe.healthScore,
      healthLabel: savedRecipe.healthLabel,
      regionalStyle: savedRecipe.regionalStyle,
      servings: servingCount
    };
  };

  const getRecipeFromSavedDocument = (savedRecipe, servingCount = Number(savedRecipe?.servings) || preferredServings) => ({
    name: savedRecipe.title,
    description: savedRecipe.description || "",
    ingredients: savedRecipe.ingredients || [],
    steps: savedRecipe.steps || [],
    healthScore: savedRecipe.healthScore,
    healthLabel: savedRecipe.healthLabel,
    nutrition: savedRecipe.nutrition,
    regionalStyle: savedRecipe.regionalStyle,
    servings: servingCount,
    source: "saved"
  });

  async function loadSavedRecipeById(id) {
    setLoading(true);
    setError("");
    setRecipe(null);
    setRecipeSource("");
    setOriginalRecipe(null);
    setIsSaved(false);
    setHasIngredientChanges(false);
    setCustomIngredient("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/api/recipes/${encodeURIComponent(id)}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to load saved recipe");
      }

      const savedRecipe = getRecipeFromSavedDocument(data);
      setServings(savedRecipe.servings);
      setOriginalRecipe(savedRecipe);
      setRecipe(savedRecipe);
      setRecipeSource("saved");
      setIsSaved(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load saved recipe");
    }

    setLoading(false);
  }

  async function fetchRecipe(activeServings = servings, options = {}) {
    const forceRegenerate = Boolean(options.forceRegenerate);
    setLoading(true);
    setError("");
    setRecipe(null);
    setRecipeSource("");
    setOriginalRecipe(null);
    setIsSaved(false);
    setHasIngredientChanges(false);
    setCustomIngredient("");

    try {
      clearRecipeBrowserCache();
      const savedRecipe = forceRegenerate ? null : await getSavedRecipeFromDatabase(activeServings);
      if (savedRecipe) {
        setOriginalRecipe(savedRecipe);
        const recipeFromSaved = { ...savedRecipe, source: "saved" };
        setRecipe(recipeFromSaved);
        setRecipeSource("saved");
        setIsSaved(true);
        setHasIngredientChanges(false);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/api/recipes/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query,
          servings: activeServings,
          regionalStyle,
          forceRegenerate
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to generate recipe");
      }

      const parsed = data.recipe;

      if (!isRecipeSafeForDietMode(parsed)) {
        throw new Error(`Generated recipe did not match ${getDietModeLabel()} search rules. ${getModeBlockedText()} Please generate again.`);
      }
      
      // Store original recipe for scaling
      setOriginalRecipe(parsed);
      setRecipe(parsed);
      setRecipeSource(parsed.source || "aiGenerated");
      setHasIngredientChanges(false);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate recipe. Please try again.");
    }

    setLoading(false);
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      if (savedRecipeId) {
        loadSavedRecipeById(savedRecipeId);
        return;
      }

      if (!query) return;
      setServings(preferredServings);
      fetchRecipe(preferredServings);
    }, 0);

    return () => window.clearTimeout(loadTimer);
    // Route changes should reload the recipe; these loaders intentionally own their internal state resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, savedRecipeId, preferredServings, regionalStyle, foodPreference]);

  const regenerateRecipe = () => {
    if (!query || loading) return;
    fetchRecipe(servings, { forceRegenerate: true });
  };

  // Scale ingredients based on servings
  const scaleIngredients = (newServings) => {
    if (!originalRecipe) return;

    const originalServings = originalRecipe.servings || 2;
    const scaleFactor = newServings / originalServings;

    const scaledIngredients = originalRecipe.ingredients.map((ingredient) => scaleIngredientText(ingredient, scaleFactor));

    setRecipe({
      ...originalRecipe,
      ingredients: scaledIngredients,
      servings: newServings
    });
  };

  const handleServingsChange = (newServings) => {
    if (newServings < 1 || newServings > 20) return;
    setServings(newServings);
    scaleIngredients(newServings);
  };

  const updateIngredient = (index, value) => {
    setRecipe((prev) => {
      if (!prev) return prev;
      const nextIngredients = [...(prev.ingredients || [])];
      nextIngredients[index] = value;
      return { ...prev, ingredients: nextIngredients };
    });
    markRecipeCustomized();
  };

  const removeIngredient = (index) => {
    setRecipe((prev) => {
      if (!prev) return prev;
      const nextIngredients = (prev.ingredients || []).filter((_, itemIndex) => itemIndex !== index);
      return { ...prev, ingredients: nextIngredients };
    });
    markRecipeCustomized();
  };

  const addCustomIngredient = () => {
    const ingredient = customIngredient.trim();
    if (!ingredient) return;
    if (nonVegetarianPattern.test(ingredient)) {
      alert("Veg recipes are strict, so non-veg ingredients cannot be added.");
      return;
    }
    if (getDietMode() === "jain" && jainRestrictedPattern.test(ingredient)) {
      alert("Jain search is active, so this ingredient cannot be added.");
      return;
    }
    if (getDietMode() === "vegan" && veganRestrictedPattern.test(ingredient)) {
      alert("Vegan search is active, so this ingredient cannot be added.");
      return;
    }

    setRecipe((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ingredients: [...(prev.ingredients || []), ingredient]
      };
    });
    setCustomIngredient("");
    markRecipeCustomized();
  };

  // ⭐ SAVE TO BACKEND DATABASE
  const saveRecipe = async ({ silent = false } = {}) => {
    if (!recipe || saving) return false;
    if (!isRecipeSafeForDietMode(recipe)) {
      if (!silent) alert(`${getDietModeLabel()} search rules are active, so remove blocked ingredients before saving.`);
      return false;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      const recipeForSaving = getRecipeForSaving();

      const res = await fetch(apiUrl("/api/recipes/save"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: recipeForSaving.name,
          description: recipeForSaving.description || "",
          ingredients: recipeForSaving.ingredients,
          steps: recipeForSaving.steps,
          image: "",
          healthScore: recipeForSaving.healthScore,
          healthLabel: recipeForSaving.healthLabel
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (!silent) alert(data.msg || "Failed to save recipe");
        setSaving(false);
        return false;
      }

      setIsSaved(true);
      setHasIngredientChanges(false);
      const returnedRecipe = data.recipe || {};
      const savedRecipe = {
        ...recipeForSaving,
        ...returnedRecipe,
        name: returnedRecipe.title || returnedRecipe.name || recipeForSaving.name,
        description: returnedRecipe.description || recipeForSaving.description || "",
        steps: recipeForSaving.steps || []
      };
      setRecipe(savedRecipe);
      setOriginalRecipe(savedRecipe);
      setSaving(false);
      return true;

    } catch (err) {
      console.error(err);
      if (!silent) alert("❌ Could not save recipe. Please try again.");
    }

    setSaving(false);
    return false;
  };

  const continueAfterUnsavedChoice = (target = pendingNavigation) => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
    setHasIngredientChanges(false);
    if (target) navigate(target);
  };

  const saveAndContinue = async () => {
    const target = pendingNavigation;
    const saved = await saveRecipe({ silent: true });
    if (!saved) {
      alert("❌ Could not save recipe. Please try again.");
      return;
    }
    setShowUnsavedModal(false);
    setPendingNavigation(null);
    if (target) navigate(target);
  };

  const openMealPlanModal = () => {
    setMealPlanChoice({
      mealType: "",
      dayIndex: null,
      planDate: ""
    });
    setShowMealModal(true);
  };

  const addToMealPlan = async () => {
    const { mealType, dayIndex, planDate } = mealPlanChoice;

    if (!recipe || !mealType || dayIndex === null || !planDate || addingMealPlan) {
      alert("Please choose a meal and date first");
      return;
    }

    setAddingMealPlan(true);

    try {
      const token = localStorage.getItem("token");

      const recipeForSaving = getRecipeForSaving();
      if (!isRecipeSafeForDietMode(recipeForSaving)) {
        alert(`${getDietModeLabel()} search rules are active, so remove blocked ingredients before adding this recipe.`);
        return;
      }

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
            id: "",
            title: recipeForSaving.name,
            description: recipeForSaving.description || "",
            ingredients: recipeForSaving.ingredients || [],
            steps: recipeForSaving.steps || [],
            image: ""
          },
          time: defaultTimes[mealType]
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to add to meal planner");
        return;
      }

      setIsSaved(true);
      setShowMealModal(false);
      alert(`✅ Added to ${mealType} for ${getRecipeLabelForDate(planDate)}!`);
    } catch (err) {
      console.error(err);
      alert("Failed to add to meal planner");
    } finally {
      setAddingMealPlan(false);
    }
  };

  const copyRecipe = async () => {
    const recipeText = getRecipeText();
    if (!recipeText) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(recipeText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = recipeText;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      alert("✅ Recipe copied!");
    } catch (err) {
      console.error(err);
      alert("❌ Could not copy recipe. Please try again.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-4 mb-5">
        {/* Back Button */}
        <button 
          className="btn btn-outline-secondary mb-4"
          onClick={() => requestNavigation("/home")}
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
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div>
                  <h3 className="fw-bold mb-2">{recipe.name}</h3>
                  {recipe.description && (
                    <p className="recipe-description-note mb-3">{recipe.description}</p>
                  )}
                  <div className="recipe-health-meter-wrap">
                    <div className="recipe-health-title">
                      <div className="nutrition-popover-anchor">
                        <button
                          type="button"
                          className="nutrition-info-btn"
                          onClick={() => setShowNutritionModal((value) => !value)}
                          aria-expanded={showNutritionModal}
                          aria-label="View nutrition spectrum"
                          title="View nutrition spectrum"
                        >
                          i
                        </button>
                        <div className={`nutrition-inline-panel ${showNutritionModal ? "is-open" : ""}`}>
                          <div className="nutrition-orb" aria-label="Nutrition spectrum">
                            {getNutritionSegments().map((segment, index) => (
                              <span
                                key={segment.key}
                                className={`nutrition-orb-dot nutrition-orb-dot-${index}`}
                                style={{
                                  "--macro-color": segment.color,
                                  "--macro-soft-color": segment.softColor,
                                  "--macro-percent": `${segment.percentage}%`
                                }}
                                title={`${segment.label}: ${segment.value}${segment.unit} (${segment.percentage}%)`}
                              >
                                <small>{segment.label}</small>
                                <strong>{segment.value}{segment.unit}</strong>
                              </span>
                            ))}
                            <div className="nutrition-orb-center">
                              <strong>{getCurrentNutrition().calories}</strong>
                              <span>Total Cal</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span>{getCurrentHealthLabel()}</span>
                    </div>
                    <div className="recipe-health-meter-labels recipe-health-meter-icons">
                      <span className={`recipe-health-heart recipe-health-heart-broken ${getCurrentHealthScore() < 30 ? "active" : ""}`}>💔</span>
                      <strong>{getCurrentHealthScore()}%</strong>
                      <span className={`recipe-health-heart recipe-health-heart-full ${getCurrentHealthScore() > 70 ? "active" : ""}`}>❤️</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={getCurrentHealthScore()}
                      readOnly
                      className="recipe-health-meter"
                    />
                  </div>
                  
                  {/* Servings Selector */}
                  <div className="servings-selector">
                    <label className="fw-semibold me-3">👥 Servings:</label>
                    <button 
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => handleServingsChange(servings - 1)}
                      disabled={servings <= 1}
                    >
                      −
                    </button>
                    <span className="mx-3 fw-bold fs-5">{servings}</span>
                    <button 
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => handleServingsChange(servings + 1)}
                      disabled={servings >= 20}
                    >
                      +
                    </button>
                    <small className="text-muted ms-3">
                      (Ingredients auto-scaled)
                    </small>
                  </div>
                </div>

                <div className="d-flex flex-column gap-2">
                  <button 
                    className={`btn ${isSaved ? 'btn-secondary' : 'btn-success'}`}
                    onClick={saveRecipe}
                    disabled={saving || isSaved}
                  >
                    {saving ? '⏳ Saving...' : isSaved ? '✅ Saved!' : '❤️ Save Recipe'}
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={openMealPlanModal}
                  >
                    📅 Add to Meal Planner
                  </button>
                  <button
                    className="btn btn-outline-warning"
                    onClick={regenerateRecipe}
                    disabled={loading}
                  >
                    🔄 Regenerate
                  </button>
                </div>
              </div>
              {recipeSource === "sharedRegional" && (
                <div className="shared-recipe-note mt-3">
                  Showing a recipe already generated by another Tastewise user. Regenerate if you want a fresh version.
                </div>
              )}
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
                      <li key={i} className="ingredient-item editable-ingredient-item">
                        <span className="ingredient-bullet">•</span>
                        <input
                          type="text"
                          className="ingredient-edit-input"
                          value={item}
                          onChange={(event) => updateIngredient(i, event.target.value)}
                          aria-label={`Edit ingredient ${i + 1}`}
                        />
                        <button
                          type="button"
                          className="ingredient-remove-btn"
                          onClick={() => removeIngredient(i)}
                          aria-label={`Remove ${item}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="add-ingredient-row mt-3">
                    <input
                      type="text"
                      className="form-control"
                      value={customIngredient}
                      onChange={(event) => setCustomIngredient(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomIngredient();
                        }
                      }}
                      placeholder="Add ingredient manually"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-warning"
                      onClick={addCustomIngredient}
                    >
                      Add
                    </button>
                  </div>
                  {hasIngredientChanges && (
                    <p className="customized-recipe-note mt-3 mb-0">
                      Custom changes will be saved with this recipe.
                    </p>
                  )}
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
                className="btn btn-outline-success flex-fill"
                onClick={copyRecipe}
              >
                📋 Copy Recipe
              </button>
              <button 
                className="btn btn-outline-dark flex-fill"
                onClick={() => requestNavigation("/saved")}
              >
                📚 View Saved Recipes
              </button>
            </div>

            <AdSlot placement="search-bottom" label="Sponsored" />
          </div>
        )}
      </div>

      {showMealModal && recipe && (
        <div className="meal-modal-overlay" onClick={() => setShowMealModal(false)}>
          <div className="meal-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="meal-modal-header">
              <div>
                <h4 className="fw-bold mb-1">Add to Meal Planner</h4>
                <p className="text-muted mb-0">{recipe.name}</p>
              </div>
              <button className="btn-close" onClick={() => setShowMealModal(false)}></button>
            </div>

            <div className="meal-modal-body">
              <h6 className="fw-bold mb-2">Meal</h6>
              <div className="meal-options">
                {mealOptions.map((meal) => (
                  <button
                    key={meal.type}
                    className={`meal-option-btn ${mealPlanChoice.mealType === meal.type ? "selected" : ""}`}
                    onClick={() => setMealPlanChoice((prev) => ({ ...prev, mealType: meal.type }))}
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
                  setMealPlanChoice((prev) => ({
                    ...prev,
                    dayIndex: getDayIndexForDate(planDate),
                    planDate
                  }));
                  event.currentTarget.blur();
                }}
              />
              {mealPlanChoice.planDate && (
                <p className="selected-date-label mb-0 mt-2">
                  {getRecipeLabelForDate(mealPlanChoice.planDate)}
                </p>
              )}

              <button
                className="btn btn-success w-100 mt-4"
                onClick={addToMealPlan}
                disabled={addingMealPlan || !mealPlanChoice.mealType || mealPlanChoice.dayIndex === null}
              >
                {addingMealPlan ? "Adding..." : "Save to Meal Planner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnsavedModal && (
        <div className="meal-modal-overlay" onClick={() => setShowUnsavedModal(false)}>
          <div className="unsaved-recipe-modal" onClick={(event) => event.stopPropagation()}>
            <div className="meal-modal-header">
              <div>
                <h4 className="fw-bold mb-1">Save Your Customized Recipe?</h4>
                <p className="text-muted mb-0">
                  You changed the ingredients but have not saved them yet.
                </p>
              </div>
              <button className="btn-close" onClick={() => setShowUnsavedModal(false)}></button>
            </div>
            <div className="meal-modal-body">
              <p className="mb-4">
                Save this customized recipe to your Saved Recipes before leaving?
              </p>
              <div className="unsaved-actions">
                <button className="btn btn-success" onClick={saveAndContinue} disabled={saving}>
                  {saving ? "Saving..." : "Yes, Save"}
                </button>
                <button className="btn btn-outline-danger" onClick={() => continueAfterUnsavedChoice()}>
                  Leave Without Saving
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setShowUnsavedModal(false)}>
                  Keep Editing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .search-header {
          border-bottom: 3px solid var(--tw-sage);
          padding-bottom: 16px;
        }

        .recipe-container {
          animation: fadeIn 0.5s ease-in;
        }

        .recipe-header-card {
          background: linear-gradient(135deg, var(--tw-sage-soft) 0%, #ffffff 100%);
          border: 2px solid var(--tw-sage);
        }

        .recipe-description-note {
          color: var(--tw-muted);
          font-size: 0.96rem;
          font-weight: 600;
          line-height: 1.45;
          max-width: 620px;
        }

        .shared-recipe-note {
          background: var(--tw-sage-soft);
          border: 1px solid rgba(95, 143, 103, 0.32);
          border-radius: 8px;
          color: var(--tw-sage);
          font-weight: 600;
          padding: 10px 12px;
        }

        .nutrition-info-btn {
          align-items: center;
          background: #ffffff;
          border: 2px solid #212529;
          border-radius: 50%;
          color: #212529;
          display: inline-flex;
          flex: 0 0 auto;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 0.98rem;
          font-weight: 800;
          height: 28px;
          justify-content: center;
          line-height: 1;
          padding: 0 0 1px;
          transition: background 0.18s ease, transform 0.18s ease;
          width: 28px;
        }

        .nutrition-info-btn:hover {
          background: #f8f9fa;
          transform: translateY(-1px);
        }

        .nutrition-popover-anchor {
          display: inline-flex;
          flex: 0 0 auto;
          position: relative;
        }

        .recipe-health-meter-wrap {
          background: var(--tw-sage-soft);
          border: 1px solid rgba(95, 143, 103, 0.32);
          border-radius: 12px;
          margin: 10px 0 18px;
          max-width: 430px;
          padding: 12px 14px 14px;
        }

        .recipe-health-title,
        .recipe-health-meter-labels {
          align-items: center;
          display: flex;
          justify-content: space-between;
        }

        .recipe-health-title {
          gap: 10px;
          margin-bottom: 8px;
        }

        .recipe-health-title span {
          color: #146c43;
          font-size: 0.95rem;
          font-weight: 800;
        }

        .recipe-health-meter-icons {
          margin-bottom: 8px;
        }

        .recipe-health-heart {
          filter: grayscale(1);
          font-size: 1.3rem;
          line-height: 1;
          opacity: 0.45;
          transition: filter 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
        }

        .recipe-health-heart.active {
          filter: grayscale(0);
          opacity: 1;
          transform: scale(1.12);
        }

        .recipe-health-meter-labels strong {
          color: #212529;
          font-size: 0.98rem;
        }

        .recipe-health-meter {
          accent-color: #198754;
          display: block;
          pointer-events: none;
          width: 100%;
        }

        .nutrition-inline-panel {
          align-items: center;
          background: transparent;
          border: 0;
          border-radius: 50%;
          box-shadow: none;
          display: flex;
          height: 260px;
          justify-content: center;
          left: 0;
          min-width: 0;
          opacity: 0;
          padding: 0;
          pointer-events: none;
          position: absolute;
          top: calc(100% + 14px);
          transform: translateY(8px) scale(0.96);
          transform-origin: top left;
          transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease;
          visibility: hidden;
          width: 260px;
          z-index: 35;
        }

        .nutrition-inline-panel::before {
          display: none;
        }

        .nutrition-popover-anchor:hover .nutrition-inline-panel,
        .nutrition-popover-anchor:focus-within .nutrition-inline-panel,
        .nutrition-inline-panel.is-open {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0) scale(1);
          visibility: visible;
        }

        .nutrition-orb {
          align-items: center;
          background:
            radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.96) 0 8%, transparent 9%),
            linear-gradient(145deg, #ffffff 0%, #eef3f7 100%);
          border: 1px solid #e2e8ef;
          border-radius: 50%;
          box-shadow: inset 0 -16px 32px rgba(90, 105, 120, 0.08), 0 18px 38px rgba(33, 37, 41, 0.16);
          display: flex;
          height: 260px;
          justify-content: center;
          position: relative;
          width: 260px;
        }

        .nutrition-orb-center {
          align-items: center;
          background: #fff9e8;
          border: 1px solid rgba(95, 143, 103, 0.32);
          border-radius: 50%;
          color: #212529;
          display: flex;
          flex-direction: column;
          height: 64px;
          justify-content: center;
          position: relative;
          width: 64px;
          z-index: 2;
        }

        .nutrition-orb-center strong {
          font-size: 1.05rem;
          line-height: 1;
        }

        .nutrition-orb-center span {
          color: var(--tw-muted);
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0;
          line-height: 1;
          margin-top: 4px;
          text-transform: uppercase;
        }

        .nutrition-orb-dot {
          align-items: center;
          background:
            radial-gradient(circle at center, #ffffff 0 53%, transparent 54%),
            conic-gradient(var(--macro-color) 0 var(--macro-percent), var(--macro-soft-color) var(--macro-percent) 100%);
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 8px 18px rgba(33, 37, 41, 0.13);
          color: #212529;
          display: flex;
          flex-direction: column;
          font-size: 0.5rem;
          font-weight: 800;
          height: 58px;
          justify-content: center;
          letter-spacing: 0;
          position: absolute;
          text-align: center;
          text-transform: uppercase;
          width: 58px;
          z-index: 1;
        }

        .nutrition-orb-dot small,
        .nutrition-orb-dot strong {
          display: block;
          max-width: 44px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nutrition-orb-dot small {
          color: #6c757d;
          font-size: 0.48rem;
          line-height: 1;
        }

        .nutrition-orb-dot strong {
          color: #212529;
          font-size: 0.7rem;
          line-height: 1.1;
          margin-top: 3px;
          text-transform: none;
        }

        .nutrition-orb-dot-0 {
          left: 50%;
          top: 22px;
          transform: translateX(-50%);
        }

        .nutrition-orb-dot-1 {
          right: 22px;
          top: 50%;
          transform: translateY(-50%);
        }

        .nutrition-orb-dot-2 {
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%);
        }

        .nutrition-orb-dot-3 {
          left: 22px;
          top: 50%;
          transform: translateY(-50%);
        }

        .servings-selector {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-radius: 10px;
          border: 2px solid var(--tw-sage);
          margin-top: 8px;
        }

        .servings-selector button {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          font-size: 1.2rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .servings-selector button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
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

        .editable-ingredient-item {
          align-items: center;
          gap: 10px;
        }

        .ingredient-item:last-child {
          border-bottom: none;
        }

        .ingredient-bullet {
          color: var(--tw-sage);
          font-size: 1.5rem;
          margin-right: 12px;
          line-height: 1;
        }

        .ingredient-edit-input {
          flex: 1;
          min-width: 0;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 9px 10px;
          font: inherit;
          background: #fff;
        }

        .ingredient-edit-input:focus {
          outline: none;
          border-color: var(--tw-sage);
          box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.16);
        }

        .ingredient-remove-btn {
          width: 34px;
          height: 34px;
          border: 1px solid #dc3545;
          border-radius: 8px;
          background: #fff;
          color: #dc3545;
          font-size: 1.3rem;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .ingredient-remove-btn:hover {
          background: #dc3545;
          color: #fff;
        }

        .add-ingredient-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
        }

        .customized-recipe-note {
          color: #146c43;
          font-weight: 700;
          background: #eaf7ef;
          border: 1px solid #badbcc;
          border-radius: 10px;
          padding: 10px 12px;
        }

        .steps-list {
          padding-left: 20px;
        }

        .step-item {
          padding: 12px 0;
          margin-bottom: 12px;
          border-left: 3px solid var(--tw-sage);
          padding-left: 16px;
          line-height: 1.6;
        }

        .meal-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .meal-modal-content {
          width: min(640px, 100%);
          max-height: 88vh;
          overflow: hidden;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
          display: flex;
          flex-direction: column;
        }

        .unsaved-recipe-modal {
          width: min(560px, 100%);
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
          overflow: hidden;
        }

        .unsaved-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .meal-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid #e9ecef;
        }

        .meal-modal-body {
          padding: 24px;
          overflow-y: auto;
        }

        .meal-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .meal-option-btn,
        .date-option-btn {
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          background: #fff;
          transition: all 0.2s ease;
        }

        .meal-option-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px;
          font-weight: 700;
        }

        .meal-option-btn.selected,
        .date-option-btn.selected {
          border-color: #198754;
          background: #eaf7ef;
        }

        .meal-icon {
          font-size: 1.8rem;
        }

        .meal-option-btn:hover,
        .date-option-btn:hover {
          border-color: var(--tw-sage);
          background: var(--tw-sage-soft);
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
          border-color: var(--tw-sage);
          box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.18);
        }

        .selected-date-label {
          color: #146c43;
          font-weight: 700;
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

        @media (max-width: 767.98px) {
          .recipe-header-card {
            padding: 18px !important;
          }

          .recipe-header-card > .d-flex {
            flex-direction: column;
          }

          .recipe-header-card > .d-flex > div,
          .recipe-header-card .btn-success,
          .recipe-header-card .btn-secondary {
            width: 100%;
          }

          .servings-selector {
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 10px;
          }

          .nutrition-info-btn {
            font-size: 0.92rem;
            height: 26px;
            width: 26px;
          }

          .nutrition-inline-panel {
            height: 220px;
            left: -2px;
            min-width: 0;
            padding: 0;
            width: 220px;
          }

          .nutrition-orb {
            height: 220px;
            width: 220px;
          }

          .nutrition-orb-center {
            height: 58px;
            width: 58px;
          }

          .nutrition-orb-dot {
            font-size: 0.5rem;
            height: 52px;
            width: 52px;
          }

          .nutrition-orb-dot small,
          .nutrition-orb-dot strong {
            max-width: 40px;
          }

          .servings-selector label,
          .servings-selector small {
            width: 100%;
            margin-left: 0 !important;
          }

          .ingredients-card,
          .steps-card {
            padding: 18px !important;
          }

          .add-ingredient-row,
          .unsaved-actions {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }

          .meal-modal-overlay {
            align-items: flex-end;
            padding: 12px;
          }

          .meal-modal-content {
            border-radius: 16px;
          }

          .meal-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
