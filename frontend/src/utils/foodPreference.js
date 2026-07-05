export const foodPreferenceOptions = ["Jain", "Veg", "Vegan"];

export const normalizeFoodPreference = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "jain") return "jain";
  if (normalized === "vegan") return "vegan";
  return "veg";
};

export const getFoodPreferenceLabel = (value = "") => {
  const mode = normalizeFoodPreference(value);
  if (mode === "jain") return "Jain";
  if (mode === "vegan") return "Vegan";
  return "Veg";
};

export const getUserFoodPreference = (user = {}) =>
  normalizeFoodPreference(
    user?.onboarding?.foodPreference ||
    user?.onboarding?.dietaryPreference ||
    user?.preferences?.diet ||
    "veg"
  );

export const nonVegetarianPattern =
  /\b(chicken|mutton|beef|pork|fish|seafood|prawn|shrimp|eggs?|gelatin|bacon|ham|turkey|lamb|keema|animal stock|lard)\b/i;

export const jainRestrictedPattern =
  /\b(onions?|garlic|potatoes?|aloo|carrots?|radish|beetroot|beet|turnip|ginger|sweet potato|yam|tapioca|cassava|arbi|colocasia|spring onion|green onion|scallion|leek|shallot|root vegetables?)\b/i;

export const veganRestrictedPattern =
  /\b(milk|curd|yogurt|yoghurt|dahi|paneer|cheese|cream|butter|ghee|honey|mayonnaise|mayo|mozzarella|parmesan|ricotta|mascarpone|malai|buttermilk|whey|casein|milk powder|condensed milk|khoya|mawa|eggs?)\b/i;

export const getFoodPreferenceBlockedText = (value = "") => {
  const mode = normalizeFoodPreference(value);
  if (mode === "jain") {
    return "Jain preference blocks non-veg items, onion, garlic, ginger, potato, carrot, and all root vegetables.";
  }
  if (mode === "vegan") {
    return "Vegan preference blocks non-veg items, dairy, honey, eggs, and animal products.";
  }
  return "Veg preference blocks non-veg items.";
};

export const isTextAllowedForFoodPreference = (value, preference = "veg") => {
  const text = Array.isArray(value) ? value.join(" ") : String(value || "");
  const mode = normalizeFoodPreference(preference);
  if (nonVegetarianPattern.test(text)) return false;
  if (mode === "jain" && jainRestrictedPattern.test(text)) return false;
  if (mode === "vegan" && veganRestrictedPattern.test(text)) return false;
  return true;
};
