const nutritionProfiles = [
  { pattern: /paneer|cheese|tofu/i, calories: 130, protein: 9, carbs: 3, fat: 9 },
  { pattern: /rice|pulao|biryani/i, calories: 160, protein: 3, carbs: 35, fat: 1 },
  { pattern: /dal|lentil|chickpea|chana|rajma|bean/i, calories: 140, protein: 8, carbs: 24, fat: 2 },
  { pattern: /potato|aloo/i, calories: 100, protein: 2, carbs: 23, fat: 0 },
  { pattern: /flour|bread|roti|paratha|pasta|noodle/i, calories: 170, protein: 5, carbs: 32, fat: 3 },
  { pattern: /oil|ghee|butter|cream/i, calories: 120, protein: 0, carbs: 0, fat: 14 },
  { pattern: /milk|yogurt|curd/i, calories: 80, protein: 4, carbs: 6, fat: 4 },
  { pattern: /nut|almond|cashew|peanut/i, calories: 110, protein: 4, carbs: 4, fat: 9 },
  { pattern: /vegetable|tomato|onion|capsicum|carrot|pea|cabbage|cauliflower|spinach|cucumber/i, calories: 35, protein: 2, carbs: 7, fat: 0 }
];

const estimateNutrition = (ingredients = []) => {
  const total = ingredients.reduce((acc, ingredient) => {
    const profile = nutritionProfiles.find((item) => item.pattern.test(String(ingredient)));
    if (!profile) {
      acc.calories += 20;
      acc.protein += 1;
      acc.carbs += 4;
      return acc;
    }

    acc.calories += profile.calories;
    acc.protein += profile.protein;
    acc.carbs += profile.carbs;
    acc.fat += profile.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    calories: Math.max(0, Math.round(total.calories)),
    protein: Math.max(0, Math.round(total.protein)),
    carbs: Math.max(0, Math.round(total.carbs)),
    fat: Math.max(0, Math.round(total.fat))
  };
};

const clampScore = (value) => Math.min(100, Math.max(0, Math.round(value)));

const estimateHealthScore = (recipe = {}) => {
  const title = String(recipe.title || recipe.name || "").toLowerCase();
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
  addIf(/\b(large amount|generous amount|extra butter|extra cheese|double cheese)\b/i, -10);

  const isPaneerTikka = /\bpaneer\s+tikka\b/i.test(title);
  const isPaneerDish = /\bpaneer\s+(sabji|subji|sabzi|curry|masala|bhurji)\b/i.test(title);
  const highFatCount = ingredients.filter((ingredient) => /\b(butter|ghee|oil|cream|cheese|mayonnaise)\b/i.test(String(ingredient))).length;
  score -= Math.min(isPaneerTikka ? 8 : 18, highFatCount * (isPaneerTikka ? 2 : 4));

  const vegetableCount = ingredients.filter((ingredient) => /\b(vegetable|spinach|palak|methi|cabbage|cauliflower|capsicum|tomato|cucumber|beans|peas|lauki|pumpkin|sprouts?|dal|lentil|chana|chickpea|tofu)\b/i.test(String(ingredient))).length;
  score += Math.min(16, vegetableCount * 3);

  if (isPaneerTikka) score = Math.min(88, Math.max(score, 78));
  if (isPaneerDish) score = Math.max(score, 70);

  return clampScore(score);
};

const getHealthLabel = (score = 50) => {
  if (score >= 70) return "Healthy";
  if (score <= 40) return "Unhealthy";
  return "Moderate";
};

const getImageSeed = (value = "recipe") =>
  Array.from(String(value)).reduce((sum, char) => sum + char.charCodeAt(0), 0);

const commonsImage = (fileName) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=900`;

const safeVegetarianImages = [
  { pattern: /jain.*pav\s*bhaji|pav\s*bhaji.*jain/i, image: commonsImage("Jain dosa, Pav bhaji, Chole bhature.jpg") },
  { pattern: /tiramisu|tiramisù/i, image: commonsImage("Tiramisu (44840044151).jpg") },
  { pattern: /paneer.*salad|salad.*paneer/i, image: commonsImage("Paneer masaledar and fresh veggies salad.png") },
  { pattern: /biryani/i, image: commonsImage("Vegetable-biryani.jpg") },
  { pattern: /pizza/i, image: commonsImage("Pizza_Margherita_stu_spivack.jpg") },
  { pattern: /dosa/i, image: commonsImage("Masala_Dosa.JPG") },
  { pattern: /poha|pohe/i, image: commonsImage("poha.jpg") },
  { pattern: /pav\s*bhaji/i, image: commonsImage("Pav_Bhaji.jpg") },
  { pattern: /chole|cholle|bhature|bhatura/i, image: commonsImage("Cholle-Bhature.jpg") },
  { pattern: /paneer\s*tikka/i, image: commonsImage("Paneer_Tikka.jpg") }
];

const getRecipeImage = (title = "") => {
  const safeImage = safeVegetarianImages.find((item) => item.pattern.test(String(title)))?.image;
  if (safeImage) return safeImage;

  const prompt = encodeURIComponent(`professional appetizing strictly vegetarian, no meat, no chicken, no fish, no eggs, ${title || "recipe"} food photography, natural light, plated dish`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=900&height=650&nologo=true&enhance=true&seed=${getImageSeed(title || "recipe")}`;
};

const enhanceRecipe = (recipe = {}) => {
  const ingredients = recipe.ingredients || [];
  const nutrition = recipe.nutrition || {};
  const hasNutrition = Object.values(nutrition).some((value) => Number(value) > 0);
  const healthScore = Number.isFinite(Number(recipe.healthScore))
    ? clampScore(Number(recipe.healthScore))
    : estimateHealthScore(recipe);

  return {
    ...recipe,
    image: recipe.image || getRecipeImage(recipe.title || recipe.name),
    nutrition: hasNutrition ? nutrition : estimateNutrition(ingredients),
    healthScore,
    healthLabel: recipe.healthLabel || getHealthLabel(healthScore)
  };
};

module.exports = {
  enhanceRecipe,
  estimateNutrition,
  estimateHealthScore,
  getHealthLabel,
  getRecipeImage
};
