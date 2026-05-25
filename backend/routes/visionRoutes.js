const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

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

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  return key && key !== "YOUR_GEMINI_API_KEY" ? key : "";
};

const getModel = (modelName) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error("Gemini API key is missing. Add GEMINI_API_KEY in backend/.env.");
    error.statusCode = 503;
    throw error;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

const getModelCandidates = () => {
  const configuredModel = process.env.GEMINI_MODEL;
  const candidates = [
    configuredModel,
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash"
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const isFallbackError = (err) => {
  const message = String(err?.message || "");
  return message.includes("404") || message.includes("429") || message.includes("quota");
};

const generateContentWithFallback = async (contents) => {
  let lastError;

  for (const modelName of getModelCandidates()) {
    try {
      const model = getModel(modelName);
      return await model.generateContent(contents);
    } catch (err) {
      lastError = err;
      if (!isFallbackError(err)) break;
    }
  }

  throw lastError;
};

const extractJson = (value) => {
  const raw = String(value || "").replace(/```json|```/g, "").trim();
  const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("AI returned invalid JSON");
  return JSON.parse(match[0]);
};

const parseImage = (image) => {
  const match = String(image || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    const error = new Error("Invalid image data");
    error.statusCode = 400;
    throw error;
  }

  return {
    mimeType: match[1],
    data: match[2]
  };
};

const normalizeIngredient = (value) => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
};

const isNonVegetarian = (value) => {
  const normalized = String(value || "").toLowerCase();
  return nonVegetarianWords.some((word) => new RegExp(`\\b${word}\\b`, "i").test(normalized));
};

const cleanIngredients = (ingredients = []) => {
  const seen = new Set();

  return ingredients
    .map((ingredient) => {
      if (typeof ingredient === "string") {
        return { name: ingredient, confidence: "Medium" };
      }
      return ingredient;
    })
    .map((ingredient) => ({
      name: normalizeIngredient(ingredient.name),
      confidence: ingredient.confidence || "Medium"
    }))
    .filter((ingredient) => ingredient.name && !isNonVegetarian(ingredient.name))
    .filter((ingredient) => {
      const key = ingredient.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const cleanSuggestions = (suggestions = []) => {
  return suggestions
    .filter((suggestion) => suggestion?.name && !isNonVegetarian(suggestion.name))
    .slice(0, 6)
    .map((suggestion) => ({
      name: String(suggestion.name).trim(),
      description: String(suggestion.description || "Vegetarian recipe idea").trim(),
      matchedIngredients: Array.isArray(suggestion.matchedIngredients)
        ? suggestion.matchedIngredients.slice(0, 6)
        : []
    }));
};

const getClientErrorMessage = (err) => {
  const message = String(err?.message || "");

  if (message.includes("404") && message.includes("models/")) {
    return "The selected Gemini model is not available for this API key. Try GEMINI_MODEL=gemini-2.0-flash-lite in backend/.env and restart the backend.";
  }

  if (message.includes("429") || message.includes("quota")) {
    return "Gemini quota is blocked for this API key/project right now. In Google AI Studio, enable billing or use a project/API key with available Gemini quota, then restart the backend.";
  }

  if (message.includes("API key")) {
    return message;
  }

  return err.message || "Gemini request failed";
};

router.post("/detect-ingredients", authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    const inlineData = parseImage(image);

    const prompt = `
Detect visible vegetarian ingredients in this food or pantry image.
Rules:
- Output only JSON.
- Only include vegetarian ingredients.
- If any meat, seafood, fish, egg, or gelatin is visible, do not include it in ingredients. Add it to rejectedItems.
- Prefer ingredient names, not dish names.
- Include confidence as High, Medium, or Low.
Format:
{
  "ingredients": [{ "name": "Tomato", "confidence": "High" }],
  "rejectedItems": ["Chicken"],
  "notes": ""
}
`;

    const result = await generateContentWithFallback([
      prompt,
      { inlineData }
    ]);
    const parsed = extractJson(result.response.text());

    res.json({
      ingredients: cleanIngredients(parsed.ingredients),
      rejectedItems: Array.isArray(parsed.rejectedItems) ? parsed.rejectedItems.filter(Boolean) : [],
      notes: parsed.notes || ""
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

router.post("/suggest-recipes", authMiddleware, async (req, res) => {
  try {
    const ingredients = cleanIngredients(req.body.ingredients || []).map((item) => item.name);
    if (ingredients.length === 0) {
      return res.status(400).json({ msg: "Add at least one vegetarian ingredient" });
    }

    const result = await generateContentWithFallback(`
Suggest vegetarian recipes using these ingredients: ${ingredients.join(", ")}.
Rules:
- Output only JSON.
- No meat, seafood, fish, eggs, gelatin, or non-vegetarian ingredients.
- Prefer Indian-friendly and practical recipes.
- Suggest 5 recipes.
Format:
[
  {
    "name": "Recipe name",
    "description": "Short useful description",
    "matchedIngredients": ["Ingredient"]
  }
]
`);

    const parsed = extractJson(result.response.text());
    res.json({ suggestions: cleanSuggestions(parsed) });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

router.post("/generate-recipe", authMiddleware, async (req, res) => {
  try {
    const ingredients = cleanIngredients(req.body.ingredients || []).map((item) => item.name);
    const recipeName = String(req.body.recipeName || "").trim();

    if (!recipeName) {
      return res.status(400).json({ msg: "Recipe name is required" });
    }

    const result = await generateContentWithFallback(`
Generate a detailed vegetarian recipe.
Recipe: ${recipeName}
Available ingredients: ${ingredients.join(", ")}
Rules:
- Output only JSON.
- No meat, seafood, fish, eggs, gelatin, or non-vegetarian ingredients.
- Use mostly the available ingredients, but basic pantry items like salt, oil, water, spices are allowed.
- Make ingredients clear with quantities for 2 servings.
Format:
{
  "name": "",
  "ingredients": ["", ""],
  "steps": ["", ""],
  "servings": 2
}
`);

    const recipe = extractJson(result.response.text());

    if (isNonVegetarian(recipe.name) || [...(recipe.ingredients || []), ...(recipe.steps || [])].some(isNonVegetarian)) {
      return res.status(422).json({ msg: "Generated recipe was blocked because it included non-vegetarian content." });
    }

    res.json({
      recipe: {
        name: recipe.name || recipeName,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        steps: Array.isArray(recipe.steps) ? recipe.steps : [],
        servings: recipe.servings || 2
      }
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

module.exports = router;
