const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const authMiddleware = require("../middleware/authMiddleware");
const VisionScan = require("../models/VisionScan");
const { enhanceRecipe } = require("../utils/recipeEnhancements");

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
  "spring onion",
  "green onion",
  "scallion",
  "leek",
  "shallot"
];

const normalizeDietMode = (value) => {
  return String(value || "").toLowerCase() === "jain" ? "jain" : "veg";
};

const getDietRules = (dietMode) => {
  if (dietMode === "jain") {
    return `
JAIN MODE ACTIVE:
- Detect, suggest, and generate ONLY Jain vegetarian food.
- Do not include onion, garlic, potato, carrot, radish, beetroot, turnip, ginger, sweet potato, yam, tapioca, cassava, arbi, colocasia, spring onion, leek, shallot, or any root vegetable.
- For generic requests like diet recipes or healthy recipes, keep the result strictly Jain by default.
- If any Jain-restricted item is visible, put it in rejectedItems and do not include it in ingredients or uncertainItems.
- Never include meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or non-vegetarian ingredients.
`;
  }

  return `
VEG MODE ACTIVE:
- Detect, suggest, and generate ONLY vegetarian food.
- Never include meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or non-vegetarian ingredients.
- Normal vegetarian ingredients such as onion, garlic, potato, carrot, ginger, beetroot, and other root vegetables are allowed in Veg mode when they are visible or belong in the recipe.
- If non-vegetarian food is visible, put it in rejectedItems and do not include it in ingredients or uncertainItems.
`;
};

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  return key && key !== "YOUR_GEMINI_API_KEY" ? key : "";
};

const getModel = (modelName, generationConfig = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error("Gemini API key is missing. Add GEMINI_API_KEY in backend/.env.");
    error.statusCode = 503;
    throw error;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    ...(Object.keys(generationConfig).length ? { generationConfig } : {})
  });
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

const generateContentWithFallback = async (contents, generationConfig = {}) => {
  let lastError;

  for (const modelName of getModelCandidates()) {
    try {
      const model = getModel(modelName, generationConfig);
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

const normalizeConfidence = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("high")) return "High";
  if (normalized.includes("low")) return "Low";
  if (normalized.includes("manual")) return "Manual";
  return "Medium";
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

const isBlockedByDiet = (value, dietMode) => {
  return isNonVegetarian(value) || (dietMode === "jain" && isJainRestricted(value));
};

const cleanIngredients = (ingredients = [], dietMode = "veg") => {
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
      confidence: normalizeConfidence(ingredient.confidence)
    }))
    .filter((ingredient) => ingredient.name && !isBlockedByDiet(ingredient.name, dietMode))
    .filter((ingredient) => ingredient.confidence !== "Low")
    .filter((ingredient) => {
      const key = ingredient.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const getBlockedNames = (items = [], dietMode = "veg") => {
  return items
    .map((item) => typeof item === "string" ? item : item?.name)
    .map(normalizeIngredient)
    .filter((name) => name && isBlockedByDiet(name, dietMode));
};

const uniqueNames = (items = []) => {
  const seen = new Set();
  return items
    .map(normalizeIngredient)
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const cleanSuggestions = (suggestions = [], dietMode = "veg") => {
  return suggestions
    .filter((suggestion) => {
      const content = [
        suggestion?.name,
        suggestion?.description,
        ...(Array.isArray(suggestion?.matchedIngredients) ? suggestion.matchedIngredients : [])
      ].join(" ");
      return suggestion?.name && !isBlockedByDiet(content, dietMode);
    })
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

  if (message.includes("leaked") || message.includes("403") || message.includes("Forbidden")) {
    return "This Gemini API key was blocked by Google. Create a new Gemini API key, update GEMINI_API_KEY on Render, and redeploy/restart the backend.";
  }

  if (message.includes("API key")) {
    return message;
  }

  return err.message || "Gemini request failed";
};

router.post("/detect-ingredients", authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    const dietMode = normalizeDietMode(req.body.dietMode);
    const inlineData = parseImage(image);

    const prompt = `
You are Tastewise's careful vegetarian ingredient scanner.
${getDietRules(dietMode)}

Task: Detect only clearly visible vegetarian ingredients in the uploaded food, grocery, or pantry image.

Accuracy workflow:
1. First identify the image type: raw ingredients, cooked dish, pantry/package items, or mixed.
2. Inspect foreground and background separately.
3. Keep only ingredients that are visually supported by the image.
4. If the photo is blurry, cropped, hidden by packaging, or ambiguous, do not guess.

Strict rules:
- Output only valid JSON. No markdown.
- Prefer ingredient names, not dish names. Example: use "Tomato", "Potato", "Paneer", not "Pav Bhaji".
- Do not infer invisible recipe ingredients. If onion/garlic/spices are not visibly identifiable, leave them out.
- Do not include generic containers, utensils, plates, bowls, hands, garnish words, cooking styles, or actions.
- Do not include duplicate synonyms. Use one simple grocery name.
- Use common Indian grocery names where appropriate: "Coriander leaves" instead of "cilantro"; "Capsicum" instead of "bell pepper"; "Curd" only if visibly yogurt/curd.
- For packaged food, detect the main grocery item from readable label or visible food only.
- Only include High or Medium confidence items in "ingredients".
- Put Low confidence or uncertain items in "uncertainItems", not "ingredients".
- If any item violates the active diet mode, do not include it in ingredients. Add it to rejectedItems.
- If a restricted item is ambiguous, put it in rejectedItems or uncertainItems instead of ingredients.
- Keep names singular unless the grocery item is naturally plural.

Confidence rules:
- High: clearly visible and identifiable.
- Medium: likely visible, but partly cropped, small, or partly obscured.
- Low: possible but uncertain. Must go to uncertainItems only.

Format exactly:
{
  "ingredients": [{ "name": "Tomato", "confidence": "High" }],
  "uncertainItems": [{ "name": "Onion", "reason": "partly hidden" }],
  "rejectedItems": ["Chicken"],
  "notes": "Short note if image quality or visibility limits accuracy, otherwise empty string"
}
`;

    const result = await generateContentWithFallback(
      [
        prompt,
        { inlineData }
      ],
      {
        temperature: 0,
        topP: 0.1,
        topK: 1,
        responseMimeType: "application/json"
      }
    );
    const parsed = extractJson(result.response.text());

    const rawIngredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
    const rawUncertainItems = Array.isArray(parsed.uncertainItems) ? parsed.uncertainItems : [];
    const detectedIngredients = cleanIngredients(rawIngredients, dietMode);
    const rejectedItems = uniqueNames([
      ...(Array.isArray(parsed.rejectedItems) ? parsed.rejectedItems : []),
      ...getBlockedNames(rawIngredients, dietMode),
      ...getBlockedNames(rawUncertainItems, dietMode)
    ]);
    const uncertainItems = Array.isArray(parsed.uncertainItems)
      ? parsed.uncertainItems
        .filter((item) => item?.name)
        .slice(0, 8)
        .map((item) => ({
          name: normalizeIngredient(item.name),
          reason: String(item.reason || "Not clear enough to auto-add").trim()
        }))
        .filter((item) => item.name && !isBlockedByDiet(item.name, dietMode))
      : [];
    const notes = dietMode === "jain" && isJainRestricted(parsed.notes)
      ? "Jain mode removed restricted ingredients from this scan."
      : (parsed.notes || "");

    await VisionScan.create({
      userId: req.user.id,
      ingredients: detectedIngredients.map((item) => item.name),
      rejectedItems
    });

    res.json({
      ingredients: detectedIngredients,
      uncertainItems,
      rejectedItems,
      notes,
      dietMode
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

router.post("/suggest-recipes", authMiddleware, async (req, res) => {
  try {
    const dietMode = normalizeDietMode(req.body.dietMode);
    const ingredients = cleanIngredients(req.body.ingredients || [], dietMode).map((item) => item.name);
    if (ingredients.length === 0) {
      return res.status(400).json({ msg: `Add at least one ${dietMode === "jain" ? "Jain-friendly" : "vegetarian"} ingredient` });
    }

    const result = await generateContentWithFallback(`
Suggest ${dietMode === "jain" ? "Jain vegetarian" : "vegetarian"} recipes using these ingredients: ${ingredients.join(", ")}.
${getDietRules(dietMode)}
Rules:
- Output only JSON.
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
    res.json({ suggestions: cleanSuggestions(parsed, dietMode), dietMode });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

router.post("/generate-recipe", authMiddleware, async (req, res) => {
  try {
    const dietMode = normalizeDietMode(req.body.dietMode);
    const ingredients = cleanIngredients(req.body.ingredients || [], dietMode).map((item) => item.name);
    const recipeName = String(req.body.recipeName || "").trim();

    if (!recipeName) {
      return res.status(400).json({ msg: "Recipe name is required" });
    }

    const result = await generateContentWithFallback(`
Generate a detailed ${dietMode === "jain" ? "Jain vegetarian" : "vegetarian"} recipe.
Recipe: ${recipeName}
Available ingredients: ${ingredients.join(", ")}
${getDietRules(dietMode)}
Rules:
- Output only JSON.
- Use mostly the available ingredients, but basic pantry items like salt, oil, water, spices are allowed.
- Make ingredients clear with quantities for 2 servings.
- Keep each ingredient as one complete grocery item.
- Do not create separate ingredients like "chopped", "sliced", "to taste", "for garnish", "for serving", or "peeled and grated".
- Attach preparation words to the grocery item, for example "2 tomatoes, chopped".
- Put serving/garnish instructions in cooking steps, not as separate ingredients.
Format:
{
  "name": "",
  "ingredients": ["", ""],
  "steps": ["", ""],
  "servings": 2
}
`);

    const recipe = extractJson(result.response.text());
    const groceryText = [recipe.name, ...(recipe.ingredients || [])].join(" ");

    if ([recipe.name, ...(recipe.ingredients || []), ...(recipe.steps || [])].some(isNonVegetarian)) {
      return res.status(422).json({ msg: "Generated recipe was blocked because it included non-vegetarian content." });
    }

    if (dietMode === "jain" && isJainRestricted(groceryText)) {
      return res.status(422).json({ msg: "Generated recipe was blocked because it included ingredients that are not allowed in Jain mode." });
    }

    const enhancedRecipe = enhanceRecipe({
        name: recipe.name || recipeName,
        title: recipe.name || recipeName,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        steps: Array.isArray(recipe.steps) ? recipe.steps : [],
        servings: recipe.servings || 2
    });

    res.json({
      recipe: {
        name: enhancedRecipe.name || enhancedRecipe.title,
        ingredients: enhancedRecipe.ingredients,
        steps: enhancedRecipe.steps,
        servings: enhancedRecipe.servings || 2,
        image: enhancedRecipe.image,
        nutrition: enhancedRecipe.nutrition,
        dietMode
      }
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

module.exports = router;
