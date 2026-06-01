const express = require("express");
const router = express.Router();
const SavedRecipe = require("../models/SavedRecipe");
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

const getOpenRouterApiKey = () => {
  const key = process.env.OPENROUTER_API_KEY || "";
  return key && key !== "YOUR_OPENROUTER_API_KEY" ? key : "";
};

const getOpenRouterModel = () => {
  return process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";
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

  return "Failed to generate recipe. Please try again.";
};

const generateRecipeText = async (prompt) => {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    const error = new Error("OpenRouter API key is missing. Add OPENROUTER_API_KEY on the backend.");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
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
          content: "You are a vegetarian-first recipe API. Return only valid JSON with no markdown."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1600
    })
  });

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

// GENERATE RECIPE WITH BACKEND AI
router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const query = String(req.body.query || "").trim();
    const servings = Number(req.body.servings) || 2;
    const requestedDietMode = normalizeDietMode(req.body.dietMode);

    if (!query) {
      return res.status(400).json({ msg: "Recipe query is required" });
    }

    const dietMode = requestedDietMode === "jain" || /jain/i.test(query) ? "jain" : "veg";
    const dietRules = dietMode === "jain"
      ? `
STRICT JAIN MODE ACTIVE:
- Generate ONLY Jain vegetarian recipes, even if the user did not type "Jain".
- NEVER use onion, garlic, potato, carrot, radish, beetroot, turnip, ginger, sweet potato, yam, tapioca, cassava, arbi, colocasia, spring onion, leek, shallot, or any root vegetable.
- NEVER use meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or any non-vegetarian ingredient.
- For searches like "diet recipe", "healthy recipe", or any generic recipe request, still make the recipe strictly Jain by default.
- If the requested dish normally uses restricted ingredients, create a Jain-friendly version and name it clearly.
- Use Jain-safe alternatives such as raw banana, cauliflower, cabbage, capsicum, peas, beans, tomato, cucumber, spinach, paneer, tofu, lentils, grains, spices, and asafoetida (hing).
`
      : `
STRICT VEG MODE ACTIVE:
- Generate ONLY vegetarian recipes.
- NEVER use meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or any non-vegetarian ingredient.
- Normal vegetarian ingredients such as onion, garlic, potato, carrot, ginger, beetroot, and other root vegetables are allowed in Veg mode when they belong in the recipe.
- If the requested dish is non-vegetarian, convert it into a vegetarian version using paneer, tofu, vegetables, mushrooms, lentils, or beans and name it clearly.
`;

    const prompt = `
Output ONLY pure JSON. No markdown, no commentary.
${dietRules}

Generate a detailed recipe for ${servings} servings: ${query}
Ingredient rules:
- Keep each ingredient as one complete grocery item.
- Do not create separate ingredients like "chopped", "sliced", "to taste", "for garnish", "for serving", or "peeled and grated".
- Attach preparation words to the grocery item, for example "2 tomatoes, chopped".
- Put serving/garnish instructions in cooking steps, not as separate ingredients.

Format:
{
  "name": "",
  "ingredients": ["", ""],
  "steps": ["", ""],
  "servings": ${servings}
}
`;

    const result = await generateRecipeText(prompt);
    const recipe = extractJson(result);
    const recipeText = [
      recipe.name,
      ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : []),
      ...(Array.isArray(recipe.steps) ? recipe.steps : [])
    ].join(" ");

    if (isNonVegetarian(recipeText)) {
      return res.status(422).json({ msg: "Generated recipe was blocked because it included non-vegetarian content." });
    }

    const groceryText = [
      recipe.name,
      ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    ].join(" ");

    if (dietMode === "jain" && isJainRestricted(groceryText)) {
      return res.status(422).json({ msg: "Generated recipe was blocked because it included ingredients that are not allowed in Jain mode." });
    }

    res.json({
      recipe: {
        name: recipe.name || query,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        steps: Array.isArray(recipe.steps) ? recipe.steps : [],
        servings: recipe.servings || servings,
        dietMode
      }
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

// SAVE RECIPE
router.post("/save", authMiddleware, async (req, res) => {
  try {
    const { title, ingredients, steps, image, nutrition } = req.body;
    const dietMode = normalizeDietMode(req.body.dietMode);
    const enhancedRecipe = enhanceRecipe({ title, ingredients, steps, image, nutrition });
    const recipeText = [
      title,
      ...(Array.isArray(ingredients) ? ingredients : []),
      ...(Array.isArray(steps) ? steps : [])
    ].join(" ");

    if (isNonVegetarian(recipeText)) {
      return res.status(422).json({ msg: "Recipe was blocked because Veg mode does not allow non-vegetarian content." });
    }

    if (dietMode === "jain" && isJainRestricted([title, ...(Array.isArray(ingredients) ? ingredients : [])].join(" "))) {
      return res.status(422).json({ msg: "Recipe was blocked because Jain mode does not allow root vegetables, onion, or garlic." });
    }

    // Check if recipe already exists for this user
    const existing = await SavedRecipe.findOne({ 
      userId: req.user.id, 
      title: title 
    });

    if (existing) {
      existing.ingredients = Array.isArray(ingredients) ? ingredients : [];
      existing.steps = Array.isArray(steps) ? steps : [];
      existing.image = enhancedRecipe.image;
      existing.nutrition = enhancedRecipe.nutrition;
      existing.updatedAt = Date.now();
      await existing.save();

      return res.json({ msg: "Recipe updated!", recipe: existing });
    }

    const saved = await SavedRecipe.create({
      userId: req.user.id,
      title,
      ingredients,
      steps,
      image: enhancedRecipe.image,
      nutrition: enhancedRecipe.nutrition,
    });

    res.json({ msg: "Recipe saved!", recipe: saved });
  } catch (err) {
    res.status(500).json({ msg: "Failed to save recipe" });
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
    await SavedRecipe.findByIdAndDelete(req.params.id);
    res.json({ msg: "Recipe removed" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to remove recipe" });
  }
});

module.exports = router;
