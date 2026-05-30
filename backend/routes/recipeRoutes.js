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
      "X-Title": process.env.OPENROUTER_APP_NAME || "TasteTrail"
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

// GENERATE RECIPE WITH BACKEND AI
router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const query = String(req.body.query || "").trim();
    const servings = Number(req.body.servings) || 2;

    if (!query) {
      return res.status(400).json({ msg: "Recipe query is required" });
    }

    const isJainRecipe = /jain/i.test(query);
    const prompt = `
Output ONLY pure JSON. No markdown, no commentary.
Default to vegetarian recipes for all generic searches and suggestions.
Do not add meat, seafood, fish, chicken, eggs, or gelatin unless the user's query explicitly asks for a non-vegetarian recipe.
For generic dishes that often have non-veg versions, choose vegetarian versions.

${isJainRecipe ? `
JAIN DIETARY RESTRICTIONS:
- NEVER use root vegetables: onion, garlic, potato, carrot, radish, beetroot, turnip, ginger
- Use alternatives only when they make sense.
- Use asafoetida (hing) for flavor instead of onion/garlic.
- Use Jain-friendly vegetables like cauliflower, peas, beans, capsicum, tomatoes, cucumber, cabbage, spinach.
` : ""}

Generate a detailed recipe for ${servings} servings: ${query}

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

    if (!/non[-\s]?veg|chicken|mutton|fish|egg|seafood|prawn|shrimp/i.test(query) && isNonVegetarian(recipeText)) {
      return res.status(422).json({ msg: "Generated recipe was blocked because it included non-vegetarian content." });
    }

    res.json({
      recipe: {
        name: recipe.name || query,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        steps: Array.isArray(recipe.steps) ? recipe.steps : [],
        servings: recipe.servings || servings
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
    const enhancedRecipe = enhanceRecipe({ title, ingredients, steps, image, nutrition });

    // Check if recipe already exists for this user
    const existing = await SavedRecipe.findOne({ 
      userId: req.user.id, 
      title: title 
    });

    if (existing) {
      return res.status(400).json({ msg: "Recipe already saved!" });
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
