const emptyNutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0
};

const unicodeFractions = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8"
};

const normalizeAmountText = (value = "") =>
  String(value)
    .replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (match) => ` ${unicodeFractions[match]} `)
    .replace(/\s+/g, " ")
    .trim();

const fractionToNumber = (value = "") => {
  const text = String(value).trim();
  if (!text) return 0;
  if (/^\d+\/\d+$/.test(text)) {
    const [numerator, denominator] = text.split("/").map(Number);
    return denominator ? numerator / denominator : 0;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
};

const parseQuantity = (text = "") => {
  const normalized = normalizeAmountText(text);
  const rangeMatch = normalized.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*[-–]\s*(\d+(?:\.\d+)?|\d+\/\d+)/);
  if (rangeMatch) {
    return {
      quantity: (fractionToNumber(rangeMatch[1]) + fractionToNumber(rangeMatch[2])) / 2,
      rest: normalized.slice(rangeMatch[0].length).trim()
    };
  }

  const mixedMatch = normalized.match(/^(\d+(?:\.\d+)?)\s+(\d+\/\d+)/);
  if (mixedMatch) {
    return {
      quantity: Number(mixedMatch[1]) + fractionToNumber(mixedMatch[2]),
      rest: normalized.slice(mixedMatch[0].length).trim()
    };
  }

  const fractionMatch = normalized.match(/^(\d+\/\d+)/);
  if (fractionMatch) {
    return {
      quantity: fractionToNumber(fractionMatch[1]),
      rest: normalized.slice(fractionMatch[0].length).trim()
    };
  }

  const numberMatch = normalized.match(/^(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    return {
      quantity: Number(numberMatch[1]),
      rest: normalized.slice(numberMatch[0].length).trim()
    };
  }

  return { quantity: 1, rest: normalized };
};

const unitAliases = [
  { pattern: /^(cups?|c)$/i, unit: "cup" },
  { pattern: /^(tablespoons?|tbsp|tbsps?)$/i, unit: "tbsp" },
  { pattern: /^(teaspoons?|tsp|tsps?)$/i, unit: "tsp" },
  { pattern: /^(grams?|g)$/i, unit: "g" },
  { pattern: /^(kilograms?|kg)$/i, unit: "kg" },
  { pattern: /^(ounces?|oz)$/i, unit: "oz" },
  { pattern: /^(milliliters?|millilitres?|ml)$/i, unit: "ml" },
  { pattern: /^(liters?|litres?|l)$/i, unit: "l" },
  { pattern: /^(cloves?)$/i, unit: "clove" },
  { pattern: /^(pieces?|pcs?)$/i, unit: "piece" },
  { pattern: /^(small)$/i, unit: "small" },
  { pattern: /^(medium|medium-sized)$/i, unit: "medium" },
  { pattern: /^(large)$/i, unit: "large" },
  { pattern: /^(pinches?|pinch)$/i, unit: "pinch" }
];

const parseIngredient = (ingredient = "") => {
  const { quantity, rest } = parseQuantity(ingredient);
  const words = rest.split(/\s+/);
  const firstWord = words[0] || "";
  const alias = unitAliases.find((item) => item.pattern.test(firstWord));

  if (!alias) {
    return { quantity, unit: "piece", item: rest.toLowerCase() };
  }

  return {
    quantity,
    unit: alias.unit,
    item: words.slice(1).join(" ").toLowerCase()
  };
};

const per100g = (calories, protein, carbs, fat, fiber = 0) => ({
  g: { calories: calories / 100, protein: protein / 100, carbs: carbs / 100, fat: fat / 100, fiber: fiber / 100 },
  kg: { calories: calories * 10, protein: protein * 10, carbs: carbs * 10, fat: fat * 10, fiber: fiber * 10 }
});

const profile = (pattern, units, fallbackUnit = "piece") => ({ pattern, units, fallbackUnit });

const nutritionProfiles = [
  profile(/\b(water)\b/i, { cup: emptyNutrition, ml: emptyNutrition, l: emptyNutrition, piece: emptyNutrition }, "cup"),
  profile(/\b(salt|black salt|rock salt|sendha namak)\b/i, { tsp: emptyNutrition, tbsp: emptyNutrition, pinch: emptyNutrition, piece: emptyNutrition }, "tsp"),
  profile(/\b(active dry yeast|instant yeast|yeast)\b/i, { tsp: { calories: 8, protein: 1, carbs: 1, fat: 0, fiber: 0.5 }, tbsp: { calories: 24, protein: 3, carbs: 3, fat: 0, fiber: 1.5 } }, "tsp"),
  profile(/\b(all[-\s]?purpose flour|plain flour|maida)\b/i, { cup: { calories: 455, protein: 13, carbs: 95, fat: 1.2, fiber: 3.4 }, tbsp: { calories: 28, protein: 0.8, carbs: 6, fat: 0.1, fiber: 0.2 }, ...per100g(364, 10, 76, 1, 2.7) }, "cup"),
  profile(/\b(whole wheat flour|atta)\b/i, { cup: { calories: 407, protein: 16, carbs: 87, fat: 2.2, fiber: 13 }, tbsp: { calories: 25, protein: 1, carbs: 5.4, fat: 0.1, fiber: 0.8 }, ...per100g(340, 13, 72, 2.5, 11) }, "cup"),
  profile(/\b(basmati rice|white rice|rice)\b/i, { cup: { calories: 675, protein: 13, carbs: 148, fat: 1.2, fiber: 2.4 }, ...per100g(365, 7, 80, 0.7, 1.3) }, "cup"),
  profile(/\b(mozzarella|shredded mozzarella)\b/i, { cup: { calories: 336, protein: 25, carbs: 2.5, fat: 25, fiber: 0 }, oz: { calories: 85, protein: 6.3, carbs: 0.6, fat: 6.3, fiber: 0 }, ...per100g(302, 22, 2.2, 22, 0) }, "cup"),
  profile(/\b(parmesan)\b/i, { cup: { calories: 431, protein: 38, carbs: 4, fat: 29, fiber: 0 }, tbsp: { calories: 22, protein: 1.9, carbs: 0.2, fat: 1.4, fiber: 0 }, oz: { calories: 122, protein: 10.8, carbs: 1, fat: 8.2, fiber: 0 }, ...per100g(431, 38, 4, 29, 0) }, "cup"),
  profile(/\b(paneer)\b/i, { cup: { calories: 520, protein: 36, carbs: 12, fat: 40, fiber: 0 }, ...per100g(265, 18, 6, 20, 0) }, "g"),
  profile(/\b(cheese|cheddar|processed cheese)\b/i, { cup: { calories: 455, protein: 28, carbs: 4, fat: 37, fiber: 0 }, oz: { calories: 113, protein: 7, carbs: 1, fat: 9, fiber: 0 }, ...per100g(402, 25, 1.3, 33, 0) }, "cup"),
  profile(/\b(pizza sauce|tomato sauce|marinara)\b/i, { cup: { calories: 80, protein: 2, carbs: 16, fat: 2, fiber: 4 }, tbsp: { calories: 5, protein: 0.1, carbs: 1, fat: 0.1, fiber: 0.2 } }, "cup"),
  profile(/\b(olive oil|vegetable oil|oil)\b/i, { tbsp: { calories: 119, protein: 0, carbs: 0, fat: 13.5, fiber: 0 }, tsp: { calories: 40, protein: 0, carbs: 0, fat: 4.5, fiber: 0 }, cup: { calories: 1904, protein: 0, carbs: 0, fat: 216, fiber: 0 } }, "tbsp"),
  profile(/\b(ghee)\b/i, { tbsp: { calories: 112, protein: 0, carbs: 0, fat: 12.7, fiber: 0 }, tsp: { calories: 37, protein: 0, carbs: 0, fat: 4.2, fiber: 0 } }, "tbsp"),
  profile(/\b(butter)\b/i, { tbsp: { calories: 102, protein: 0.1, carbs: 0, fat: 11.5, fiber: 0 }, tsp: { calories: 34, protein: 0, carbs: 0, fat: 3.8, fiber: 0 } }, "tbsp"),
  profile(/\b(cream|whipping cream|heavy cream)\b/i, { cup: { calories: 821, protein: 5, carbs: 7, fat: 88, fiber: 0 }, tbsp: { calories: 51, protein: 0.3, carbs: 0.4, fat: 5.5, fiber: 0 }, oz: { calories: 103, protein: 0.6, carbs: 0.8, fat: 11, fiber: 0 } }, "tbsp"),
  profile(/\b(yogurt|curd|dahi|hung curd)\b/i, { cup: { calories: 150, protein: 8.5, carbs: 12, fat: 8, fiber: 0 }, tbsp: { calories: 9, protein: 0.5, carbs: 0.8, fat: 0.5, fiber: 0 }, ...per100g(61, 3.5, 4.7, 3.3, 0) }, "cup"),
  profile(/\b(besan|gram flour|chickpea flour)\b/i, { cup: { calories: 356, protein: 20, carbs: 53, fat: 6, fiber: 10 }, tbsp: { calories: 22, protein: 1.2, carbs: 3.3, fat: 0.4, fiber: 0.6 }, ...per100g(387, 22, 58, 6.7, 10.8) }, "cup"),
  profile(/\b(chickpeas?|chana|rajma|beans?|lentils?|dal)\b/i, { cup: { calories: 240, protein: 15, carbs: 41, fat: 2, fiber: 14 }, ...per100g(164, 9, 27, 2.6, 8) }, "cup"),
  profile(/\b(sugar|jaggery)\b/i, { tbsp: { calories: 49, protein: 0, carbs: 12.6, fat: 0, fiber: 0 }, tsp: { calories: 16, protein: 0, carbs: 4.2, fat: 0, fiber: 0 }, cup: { calories: 774, protein: 0, carbs: 200, fat: 0, fiber: 0 } }, "tsp"),
  profile(/\b(capsicum|bell pepper)\b/i, { cup: { calories: 30, protein: 1, carbs: 7, fat: 0.3, fiber: 2.5 }, medium: { calories: 24, protein: 1, carbs: 6, fat: 0.2, fiber: 2 } }, "cup"),
  profile(/\b(tomatoes?|tomato)\b/i, { cup: { calories: 32, protein: 1.6, carbs: 7, fat: 0.4, fiber: 2.2 }, medium: { calories: 22, protein: 1, carbs: 5, fat: 0.2, fiber: 1.5 } }, "medium"),
  profile(/\b(cauliflower|cabbage|spinach|peas|green peas|beans|french beans|bottle gourd|lauki|ridge gourd|pumpkin|mixed vegetables?|vegetables?)\b/i, { cup: { calories: 50, protein: 2.5, carbs: 10, fat: 0.5, fiber: 3.5 }, medium: { calories: 35, protein: 1.5, carbs: 7, fat: 0.3, fiber: 2.5 } }, "cup"),
  profile(/\b(basil|cilantro|coriander leaves|mint|herbs?)\b/i, { cup: { calories: 5, protein: 0.4, carbs: 1, fat: 0, fiber: 0.5 }, tbsp: { calories: 1, protein: 0, carbs: 0, fat: 0, fiber: 0.1 }, piece: { calories: 1, protein: 0, carbs: 0, fat: 0, fiber: 0.1 } }, "piece")
];

const scaleValues = (values, quantity) => ({
  calories: (values.calories || 0) * quantity,
  protein: (values.protein || 0) * quantity,
  carbs: (values.carbs || 0) * quantity,
  fat: (values.fat || 0) * quantity,
  fiber: (values.fiber || 0) * quantity
});

export const getIngredientNutrition = (ingredient = "") => {
  const parsed = parseIngredient(ingredient);
  const text = `${parsed.item} ${ingredient}`.toLowerCase();
  const matchedProfile = nutritionProfiles.find((item) => item.pattern.test(text));
  if (!matchedProfile) return emptyNutrition;

  const unitValues = matchedProfile.units[parsed.unit] || matchedProfile.units[matchedProfile.fallbackUnit];
  if (!unitValues) return emptyNutrition;
  return scaleValues(unitValues, parsed.quantity);
};

export const estimateNutrition = (ingredients = [], servings = 1) => {
  const totalServings = Math.max(1, Number(servings) || 1);
  const total = (Array.isArray(ingredients) ? ingredients : []).reduce((acc, ingredient) => {
    const values = getIngredientNutrition(ingredient);
    acc.calories += values.calories;
    acc.protein += values.protein;
    acc.carbs += values.carbs;
    acc.fat += values.fat;
    acc.fiber += values.fiber;
    return acc;
  }, { ...emptyNutrition });

  return Object.fromEntries(
    Object.entries(total).map(([key, value]) => [key, Math.max(0, Math.round(value / totalServings))])
  );
};
