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

const isExplicitNonVegRecipe = (title = "") =>
  /\b(chicken|mutton|lamb|fish|prawn|shrimp|egg|beef|pork|bacon|ham|seafood|keema)\b/i.test(String(title));

const getRecipeImage = (title = "") => {
  const safeImage = safeVegetarianImages.find((item) => item.pattern.test(String(title)))?.image;
  if (safeImage && !isExplicitNonVegRecipe(title)) return safeImage;

  const vegetarianPrefix = isExplicitNonVegRecipe(title) ? "" : "strictly vegetarian, no meat, no chicken, no fish, no eggs, ";
  const prompt = encodeURIComponent(`professional appetizing ${vegetarianPrefix}${title || "recipe"} food photography, natural light, plated dish`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=900&height=650&nologo=true&enhance=true&seed=${getImageSeed(title || "recipe")}`;
};

const enhanceRecipe = (recipe = {}) => {
  const ingredients = recipe.ingredients || [];
  const nutrition = recipe.nutrition || {};
  const hasNutrition = Object.values(nutrition).some((value) => Number(value) > 0);

  return {
    ...recipe,
    image: recipe.image || getRecipeImage(recipe.title || recipe.name),
    nutrition: hasNutrition ? nutrition : estimateNutrition(ingredients)
  };
};

module.exports = {
  enhanceRecipe,
  estimateNutrition,
  getRecipeImage
};
