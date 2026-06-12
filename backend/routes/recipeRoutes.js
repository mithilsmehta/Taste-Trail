const express = require("express");
const router = express.Router();
const SavedRecipe = require("../models/SavedRecipe");
const GeneratedRecipe = require("../models/GeneratedRecipe");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { enhanceRecipe } = require("../utils/recipeEnhancements");

const nonVegetarianWords = [
  "chicken",
  "mutton",
  "beef",
  "pork",
  "fish",
  "seafood",
  "prawn",
  "shrimp",
  "egg",
  "eggs",
  "gelatin",
  "bacon",
  "ham",
  "turkey",
  "lamb"
];

const jainRestrictedWords = [
  "onion",
  "onions",
  "garlic",
  "potato",
  "potatoes",
  "aloo",
  "carrot",
  "carrots",
  "radish",
  "beetroot",
  "beet",
  "turnip",
  "ginger",
  "sweet potato",
  "yam",
  "tapioca",
  "cassava",
  "arbi",
  "colocasia",
  "surti papdi root",
  "spring onion",
  "green onion",
  "scallion",
  "leek",
  "shallot"
];

const normalizeDietMode = (value) => {
  return String(value || "").toLowerCase() === "jain" ? "jain" : "veg";
};

const recipeMemoryCache = new Map();
const recipeMemoryCacheTtlMs = Number(process.env.RECIPE_MEMORY_CACHE_TTL_MS) || 15 * 60 * 1000;

const getRecipeMemoryCacheKey = ({ query, regionalStyle, dietMode, servings }) => {
  return [
    normalizeRecipeQuery(query),
    normalizeRegionalStyle(regionalStyle).toLowerCase(),
    dietMode,
    servings
  ].join("|");
};

const getRecipeFromMemoryCache = (cacheKey) => {
  const cached = recipeMemoryCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    recipeMemoryCache.delete(cacheKey);
    return null;
  }

  return cached.recipe;
};

const saveRecipeToMemoryCache = (cacheKey, recipe) => {
  recipeMemoryCache.set(cacheKey, {
    recipe,
    expiresAt: Date.now() + recipeMemoryCacheTtlMs
  });
};

const getOpenRouterApiKey = () => {
  const key = process.env.OPENROUTER_API_KEY || "";
  return key && key !== "YOUR_OPENROUTER_API_KEY" ? key : "";
};

const getOpenRouterModel = () => {
  return process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";
};

const getOpenRouterMaxTokens = () => {
  const value = Number(process.env.OPENROUTER_MAX_TOKENS);
  return Number.isFinite(value) && value > 0 ? value : 1300;
};

const getOpenRouterTimeoutMs = () => {
  const value = Number(process.env.OPENROUTER_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 45000;
};

const getClientErrorMessage = (err) => {
  const message = String(err?.message || "");
  const statusCode = Number(err?.statusCode || err?.status || 0);

  if (statusCode === 401 || statusCode === 403 || /api key|unauthorized|forbidden/i.test(message)) {
    return "OpenRouter API key is missing or invalid. Add OPENROUTER_API_KEY on Render, then redeploy/restart the backend.";
  }

  if (statusCode === 429 || /rate|quota|credits|limit/i.test(message)) {
    return "OpenRouter quota or rate limit was reached. Check your OpenRouter credits/model limit, or choose another OPENROUTER_MODEL.";
  }

  if (statusCode === 404 || /model/i.test(message)) {
    return "The selected OpenRouter model is not available. Set OPENROUTER_MODEL to a valid OpenRouter chat model and restart the backend.";
  }

  if (statusCode === 504 || /timed out/i.test(message)) {
    return "Recipe generation took too long. Please try again, or use a faster OPENROUTER_MODEL on the backend.";
  }

  return "Failed to generate recipe. Please try again.";
};

const generateRecipeText = async (prompt) => {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    const error = new Error("OpenRouter API key is missing. Add OPENROUTER_API_KEY on the backend.");
    error.statusCode = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenRouterTimeoutMs());

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || process.env.FRONTEND_URL || "http://localhost:5173",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Tastewise"
      },
      body: JSON.stringify({
        model: getOpenRouterModel(),
        messages: [
          {
            role: "system",
            content: "You are an expert vegetarian recipe chef and recipe-data API. Prioritize authentic, commonly accepted recipes for the requested dish. Return only valid JSON with no markdown."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: getOpenRouterMaxTokens()
      })
    });
  } catch (err) {
    if (err.name === "AbortError") {
      const error = new Error("OpenRouter request timed out. Try again or choose a faster OPENROUTER_MODEL.");
      error.statusCode = 504;
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  if (!response.ok) {
    const error = new Error(responseText || `OpenRouter request failed with ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = JSON.parse(responseText);
  return data?.choices?.[0]?.message?.content || "";
};

const extractJson = (value) => {
  const raw = String(value || "").replace(/```json|```/g, "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned invalid JSON");
  return JSON.parse(match[0]);
};

const isNonVegetarian = (value) => {
  const normalized = String(value || "").toLowerCase();
  return nonVegetarianWords.some((word) => new RegExp(`\\b${word}\\b`, "i").test(normalized));
};

const isJainRestricted = (value) => {
  const normalized = String(value || "").toLowerCase();
  return jainRestrictedWords.some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(normalized);
  });
};

const getRecipeSafetyText = (recipe = {}) => {
  return [
    recipe.name,
    recipe.title,
    ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : []),
    ...(Array.isArray(recipe.steps) ? recipe.steps : [])
  ].join(" ");
};

const getRecipeAccuracyIssue = (query, recipe = {}) => {
  const normalizedQuery = String(query || "").toLowerCase();
  const recipeName = String(recipe.name || recipe.title || "").toLowerCase();
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const recipeText = getRecipeSafetyText(recipe).toLowerCase();
  const isPaneerDish = /\bpaneer\b/.test(normalizedQuery) || /\bpaneer\b/.test(recipeName);
  const isPaneerTikka = /\bpaneer\s+tikka\b/.test(normalizedQuery) || /\bpaneer\s+tikka\b/.test(recipeName);
  const isPaneerSabji = /\bpaneer\s+(sabji|subji|sabzi|curry|masala|gravy)\b/.test(normalizedQuery)
    || /\bpaneer\s+(sabji|subji|sabzi|curry|masala|gravy)\b/.test(recipeName);

  if (/\b\d+\s*(cloves?|pods?|pieces?)\s+(hing|asafoetida)\b/i.test(recipeText)) {
    return "invalid hing measurement";
  }

  if (isPaneerDish && /\b(hing|asafoetida)\b/i.test(recipeText)) {
    return "hing or asafoetida does not belong in paneer tikka or paneer sabji unless explicitly requested";
  }

  if (isPaneerDish && !ingredients.some((ingredient) => /\bpaneer\b/i.test(String(ingredient)))) {
    return "paneer dish missing paneer";
  }

  if (isPaneerTikka) {
    const hasCurdBase = ingredients.some((ingredient) => /\b(curd|yogurt|yoghurt|hung curd|thick curd|dahi)\b/i.test(String(ingredient)));
    const hasTikkaBinder = ingredients.some((ingredient) => /\b(besan|gram flour|chickpea flour)\b/i.test(String(ingredient)));
    if (!hasCurdBase) return "paneer tikka missing curd or yogurt marinade";
    if (!hasTikkaBinder) return "paneer tikka missing besan or gram flour marinade binder";
  }

  if ((isPaneerTikka || isPaneerSabji) && /\b(raw banana|plantain)\b/i.test(recipeText)) {
    return "paneer dish contains unrelated raw banana substitute";
  }

  return "";
};

const normalizeRegionalStyle = (value) => {
  return String(value || "").trim().replace(/\s+/g, " ");
};

const normalizeRecipeQuery = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(recipe|style|styled|authentic|traditional|homestyle|home style)\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const getUserRegionalStyle = async (userId) => {
  const user = await User.findById(userId).select("onboarding.ethnicity onboarding.currentBase").lean();
  return normalizeRegionalStyle(user?.onboarding?.ethnicity || user?.onboarding?.currentBase);
};

const getRegionalStyleRules = (regionalStyle) => {
  if (!regionalStyle) {
    return `
REGIONAL STYLE:
- No saved regional preference is available. Use the most authentic, commonly accepted Indian preparation for the requested dish.
`;
  }

  return `
REGIONAL STYLE ACTIVE: ${regionalStyle}
- Adapt the recipe to the user's selected regional food style: ${regionalStyle}.
- Use ingredients, seasoning balance, cooking method, texture, and serving style commonly used in ${regionalStyle} homes.
- If the requested dish belongs strongly to another state or region, keep the dish recognizable but explain it through a ${regionalStyle}-style vegetarian home preparation where reasonable.
- If the dish is strongly iconic to its own region, such as Maharashtrian misal pav, Gujarati dhokla/khaman, Punjabi chole, or South Indian dosa/idli, preserve the authentic base recipe and add only natural ${regionalStyle} touches that do not make it incorrect.
- For examples: Gujarat-style dhokla/khaman should lean mildly sweet, tangy, tempered with mustard/sesame/curry leaves/green chili when allowed; Maharashtra-style poha or misal pav should use the common Maharashtrian flavor profile and ingredients.
- Do not add random ingredients only because of the region. Accuracy for the requested dish is more important than forced regional twists.
`;
};

const toTitleCase = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
};

const getCleanDishName = (query, generatedName = "") => {
  const source = String(query || generatedName || "").trim();
  const cleaned = source
    .replace(/\([^)]*\)/g, " ")
    .split(/\s[-–—]\s/)[0]
    .replace(/\b(recipe|style|styled|authentic|traditional|homestyle|home style)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return toTitleCase(cleaned || source || "Recipe");
};

const getStoredRecipeName = (query, generatedName = "") => {
  return getCleanDishName(query, generatedName);
};

const getSharedRegionalRecipe = async ({ query, regionalStyle, dietMode, servings }) => {
  const normalizedQuery = normalizeRecipeQuery(query);
  if (!normalizedQuery || !regionalStyle) return null;

  const matches = await GeneratedRecipe.aggregate([
    {
      $match: {
        normalizedQuery,
        regionalStyle,
        dietMode,
        servings
      }
    },
    { $sample: { size: 1 } }
  ]);

  const sharedRecipe = matches[0];
  if (!sharedRecipe) return null;

  await GeneratedRecipe.updateOne(
    { _id: sharedRecipe._id },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date(), updatedAt: new Date() }
    }
  );

  return sharedRecipe;
};

const saveGeneratedRecipeToPool = async ({ userId, query, regionalStyle, dietMode, servings, recipe }) => {
  const normalizedQuery = normalizeRecipeQuery(query);
  if (!normalizedQuery || !regionalStyle) return;

  const storedName = getStoredRecipeName(query, recipe.name);
  const enhancedRecipe = enhanceRecipe({ ...recipe, name: storedName, title: storedName });

  await GeneratedRecipe.create({
    userId,
    query,
    normalizedQuery,
    regionalStyle,
    dietMode,
    servings,
    name: storedName,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    healthScore: enhancedRecipe.healthScore,
    healthLabel: enhancedRecipe.healthLabel
  });
};

// GENERATE RECIPE WITH BACKEND AI
router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const query = String(req.body.query || "").trim();
    const servings = Number(req.body.servings) || 2;
    const requestedDietMode = normalizeDietMode(req.body.dietMode);
    const forceRegenerate = Boolean(req.body.forceRegenerate);
    const regionalStyle = await getUserRegionalStyle(req.user.id);

    if (!query) {
      return res.status(400).json({ msg: "Recipe query is required" });
    }

    const dietMode = requestedDietMode === "jain" || /jain/i.test(query) ? "jain" : "veg";
    const memoryCacheKey = getRecipeMemoryCacheKey({ query, regionalStyle, dietMode, servings });

    if (!forceRegenerate) {
      const cachedRecipe = getRecipeFromMemoryCache(memoryCacheKey);
      if (cachedRecipe && !getRecipeAccuracyIssue(query, cachedRecipe)) {
        return res.json({ recipe: enhanceRecipe({ ...cachedRecipe, source: "serverCache" }) });
      }

      const sharedRecipe = await getSharedRegionalRecipe({ query, regionalStyle, dietMode, servings });
      if (sharedRecipe) {
        const sharedResponseRecipe = {
          name: getStoredRecipeName(query, sharedRecipe.name),
          ingredients: Array.isArray(sharedRecipe.ingredients) ? sharedRecipe.ingredients : [],
          steps: Array.isArray(sharedRecipe.steps) ? sharedRecipe.steps : [],
          servings: sharedRecipe.servings || servings,
          healthScore: sharedRecipe.healthScore,
          healthLabel: sharedRecipe.healthLabel,
          dietMode,
          regionalStyle,
          source: "sharedRegional",
          sharedRecipeId: sharedRecipe._id
        };
        const sharedAccuracyIssue = getRecipeAccuracyIssue(query, sharedResponseRecipe);
        if (!sharedAccuracyIssue) {
          const enhancedSharedRecipe = enhanceRecipe(sharedResponseRecipe);
          saveRecipeToMemoryCache(memoryCacheKey, enhancedSharedRecipe);
          return res.json({ recipe: enhancedSharedRecipe });
        }

        console.warn("Skipped shared recipe because of accuracy issue:", sharedAccuracyIssue);
      }
    }

    const dietRules = dietMode === "jain"
      ? `
STRICT JAIN MODE ACTIVE:
- Generate ONLY Jain vegetarian recipes, even if the user did not type "Jain".
- NEVER use onion, garlic, potato, carrot, radish, beetroot, turnip, ginger, sweet potato, yam, tapioca, cassava, arbi, colocasia, spring onion, leek, shallot, or any root vegetable.
- NEVER use meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or any non-vegetarian ingredient.
- For searches like "diet recipe", "healthy recipe", or any generic recipe request, still make the recipe strictly Jain by default.
- If the requested dish normally uses restricted ingredients, create a Jain-friendly version and name it clearly.
- Keep the recipe faithful to the requested dish. Do not add unrelated substitutes like raw banana, cabbage, cauliflower, or hing unless they are normal for that exact dish.
- For paneer dishes, paneer must remain the main ingredient. Do not replace paneer with raw banana or unrelated vegetables.
- Hing/asafoetida is not a default Jain replacement for onion or garlic. Use it only in dishes where it is traditionally normal, such as some dals or kadhis.
- Do not add hing/asafoetida to paneer tikka, paneer sabji, paneer curry, paneer masala, paneer bhurji, grilled paneer starters, or tandoori-style paneer unless the user explicitly asks for hing.
`
      : `
STRICT VEG MODE ACTIVE:
- Generate ONLY vegetarian recipes.
- NEVER use meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or any non-vegetarian ingredient.
- Normal vegetarian ingredients such as onion, garlic, potato, carrot, ginger, beetroot, and other root vegetables are allowed in Veg mode when they belong in the recipe.
- If the requested dish is non-vegetarian, convert it into a vegetarian version using paneer, tofu, vegetables, mushrooms, lentils, or beans and name it clearly.
`;

    const buildPrompt = (retryNote = "") => `
Output ONLY pure JSON. No markdown, no commentary.
${dietRules}
${getRegionalStyleRules(regionalStyle)}
${retryNote}

Generate a detailed recipe for ${servings} servings: ${query}
Accuracy rules:
- The JSON "name" must be exactly "${getStoredRecipeName(query)}". Keep the state/region only in the separate "regionalStyle" app field, not in the recipe name.
- Do not add descriptions like "steamed savory cake", "Maharashtrian-style", subtitles, or alternate names to the name.
- Generate the real, recognizable recipe for the requested dish, not a random variation.
- Use ingredients that commonly belong in that dish and cuisine.
- Do not invent unusual ingredients or substitutions unless the diet mode requires it.
- If the query is specific, such as "paneer tikka", "paneer sabji", "pav bhaji", "tiramisu", or "veg biryani", the ingredients and steps must match that dish.
- For paneer tikka, use paneer cubes, thick curd or hung curd, besan or gram flour, capsicum, firm tomato if allowed, lemon juice, oil or butter for brushing, and standard tikka spices. Do not use hing/asafoetida.
- For paneer sabji/curry/masala, use paneer as the main ingredient and a normal paneer gravy base allowed by the active diet mode. Do not use raw banana, plantain, or hing unless the user explicitly requested them.
- Never write impossible spice measurements like "cloves hing". Hing is a pinch or powder only when it truly belongs.
- Do not overuse any single spice. Include hing/asafoetida only if it genuinely belongs to the requested dish, never just because Jain mode is active.
Ingredient rules:
- Every ingredient must include an amount, for example "1 cup basmati rice" or "2 tablespoons oil".
- Keep each ingredient as one complete grocery item.
- Do not create separate ingredients like "chopped", "sliced", "to taste", "for garnish", "for serving", or "peeled and grated".
- Attach preparation words to the grocery item, for example "2 tomatoes, chopped".
- Put serving/garnish instructions in cooking steps, not as separate ingredients.
- Do not mention blocked ingredients in cooking steps either.

Format:
{
  "name": "",
  "ingredients": ["", ""],
  "steps": ["", ""],
  "servings": ${servings}
}
`;

    let recipe = null;
    let blockedReason = "";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const retryNote = attempt === 0
        ? ""
        : `
The previous recipe was rejected because it contained "${blockedReason}".
Rewrite from scratch. Keep the requested dish authentic, remove every restricted or inaccurate item from ingredients and steps, and do not replace the main ingredient with unrelated substitutes.`;
      const result = await generateRecipeText(buildPrompt(retryNote));
      const candidate = extractJson(result);
      const recipeText = getRecipeSafetyText(candidate);

      if (isNonVegetarian(recipeText)) {
        blockedReason = "non-vegetarian content";
        continue;
      }

      if (dietMode === "jain" && isJainRestricted(recipeText)) {
        blockedReason = "onion, garlic, ginger, potato, carrot, or another Jain-restricted root vegetable";
        continue;
      }

      const accuracyIssue = getRecipeAccuracyIssue(query, candidate);
      if (accuracyIssue) {
        blockedReason = accuracyIssue;
        continue;
      }

      recipe = candidate;
      break;
    }

    if (!recipe) {
      return res.status(422).json({
        msg: dietMode === "jain"
          ? "Could not generate a Jain-safe recipe. Please try again; Jain mode blocks onion, garlic, ginger, potato, carrot, and root vegetables."
          : "Generated recipe was blocked because it included non-vegetarian content."
      });
    }

    const displayName = getStoredRecipeName(query, recipe.name);
    const enhancedGeneratedRecipe = enhanceRecipe({
      name: displayName,
      title: displayName,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : []
    });
    const responseRecipe = {
      name: displayName,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      servings,
      healthScore: enhancedGeneratedRecipe.healthScore,
      healthLabel: enhancedGeneratedRecipe.healthLabel,
      dietMode,
      regionalStyle,
      source: "aiGenerated"
    };

    try {
      await saveGeneratedRecipeToPool({
        userId: req.user.id,
        query,
        regionalStyle,
        dietMode,
        servings: responseRecipe.servings,
        recipe: responseRecipe
      });
    } catch (poolErr) {
      console.error("Failed to save generated recipe to shared pool:", poolErr);
    }

    saveRecipeToMemoryCache(memoryCacheKey, responseRecipe);

    res.json({
      recipe: responseRecipe
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

// SAVE RECIPE
router.post("/save", authMiddleware, async (req, res) => {
  try {
    const { title, ingredients, steps, image, nutrition, healthScore, healthLabel } = req.body;
    const dietMode = normalizeDietMode(req.body.dietMode);
    const regionalStyle = await getUserRegionalStyle(req.user.id);
    const storedTitle = getStoredRecipeName(title);
    const enhancedRecipe = enhanceRecipe({ title: storedTitle, ingredients, steps, image, nutrition, healthScore, healthLabel });
    const recipeText = getRecipeSafetyText({ title: storedTitle, ingredients, steps });

    if (isNonVegetarian(recipeText)) {
      return res.status(422).json({ msg: "Recipe was blocked because Veg mode does not allow non-vegetarian content." });
    }

    if (dietMode === "jain" && isJainRestricted(recipeText)) {
      return res.status(422).json({ msg: "Recipe was blocked because Jain mode does not allow root vegetables, onion, or garlic." });
    }

    // Check if recipe already exists for this user
    const existing = await SavedRecipe.findOne({ 
      userId: req.user.id, 
      title: storedTitle,
      regionalStyle
    });

    if (existing) {
      existing.ingredients = Array.isArray(ingredients) ? ingredients : [];
      existing.steps = Array.isArray(steps) ? steps : [];
      existing.regionalStyle = regionalStyle;
      existing.image = enhancedRecipe.image;
      existing.healthScore = enhancedRecipe.healthScore;
      existing.healthLabel = enhancedRecipe.healthLabel;
      existing.nutrition = enhancedRecipe.nutrition;
      existing.updatedAt = Date.now();
      await existing.save();

      return res.json({ msg: "Recipe updated!", recipe: existing });
    }

    const saved = await SavedRecipe.create({
      userId: req.user.id,
      title: storedTitle,
      ingredients,
      steps,
      regionalStyle,
      image: enhancedRecipe.image,
      healthScore: enhancedRecipe.healthScore,
      healthLabel: enhancedRecipe.healthLabel,
      nutrition: enhancedRecipe.nutrition,
    });

    res.json({ msg: "Recipe saved!", recipe: saved });
  } catch (err) {
    res.status(500).json({ msg: "Failed to save recipe" });
  }
});

// FIND ONE SAVED RECIPE BY TITLE
router.get("/find", authMiddleware, async (req, res) => {
  try {
    const title = String(req.query.title || "").trim();
    if (!title) {
      return res.status(400).json({ msg: "Recipe title is required" });
    }

    const regionalStyle = await getUserRegionalStyle(req.user.id);
    const storedTitle = getStoredRecipeName(title);
    const recipe = await SavedRecipe.findOne({
      userId: req.user.id,
      title: storedTitle,
      regionalStyle
    }).lean();

    if (!recipe) {
      return res.status(404).json({ msg: "Recipe not found" });
    }

    res.json(enhanceRecipe(recipe));
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch recipe" });
  }
});

// GET ALL SAVED RECIPES FOR USER
router.get("/my-recipes", authMiddleware, async (req, res) => {
  try {
    const recipes = await SavedRecipe.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(recipes.map((recipe) => enhanceRecipe(recipe.toObject())));
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch recipes" });
  }
});

// DELETE RECIPE
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deletedRecipe = await SavedRecipe.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deletedRecipe) {
      return res.status(404).json({ msg: "Recipe not found" });
    }

    res.json({ msg: "Recipe removed" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to remove recipe" });
  }
});

module.exports = router;
