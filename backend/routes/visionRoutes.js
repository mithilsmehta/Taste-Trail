const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const authMiddleware = require("../middleware/authMiddleware");
const VisionScan = require("../models/VisionScan");
const User = require("../models/User");
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

const veganRestrictedWords = [
  "milk",
  "curd",
  "yogurt",
  "yoghurt",
  "dahi",
  "paneer",
  "cheese",
  "cream",
  "butter",
  "ghee",
  "honey",
  "mayonnaise",
  "mayo",
  "mozzarella",
  "parmesan",
  "ricotta",
  "mascarpone",
  "malai",
  "buttermilk",
  "whey",
  "casein",
  "milk powder",
  "condensed milk",
  "khoya",
  "mawa"
];

const normalizeDietMode = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "jain") return "jain";
  if (normalized === "vegan") return "vegan";
  return "veg";
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
- Keep recipes faithful to the requested dish. Do not add unrelated substitutes like raw banana, cabbage, cauliflower, or hing unless they are normal for that dish or strictly needed to replace a blocked ingredient.
- For paneer dishes, paneer must remain the main ingredient. Do not replace paneer with raw banana or unrelated vegetables.
- Use hing only when it is traditionally appropriate or clearly needed for Jain flavoring; do not add hing by default.
`;
  }

  if (dietMode === "vegan") {
    return `
VEGAN MODE ACTIVE:
- Detect, suggest, and generate ONLY vegan food.
- Do not include milk, curd, yogurt, paneer, cheese, cream, butter, ghee, honey, mayonnaise, whey, casein, milk powder, condensed milk, khoya, mawa, eggs, or other animal products.
- Put visible vegan-restricted items in rejectedItems and do not include them in ingredients or uncertainItems.
- Never include meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or non-vegetarian ingredients.
- Use plant-based alternatives only when they naturally fit the requested dish.
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

const normalizeRegionalStyle = (value) => {
  return String(value || "").trim().replace(/\s+/g, " ");
};

const getUserRegionalStyle = async (userId) => {
  const user = await User.findById(userId).select("onboarding.ethnicity").lean();
  return normalizeRegionalStyle(user?.onboarding?.ethnicity);
};

const getUserDietMode = async (userId) => {
  const user = await User.findById(userId)
    .select("preferences.diet onboarding.dietaryPreference onboarding.foodPreference")
    .lean();

  return normalizeDietMode(
    user?.preferences?.diet ||
    user?.onboarding?.dietaryPreference ||
    user?.onboarding?.foodPreference
  );
};

const getRegionalStyleRules = (regionalStyle) => {
  if (!regionalStyle) {
    return `
REGIONAL STYLE:
- No saved regional preference is available. Use the most authentic, commonly accepted preparation for the requested dish.
`;
  }

  return `
REGIONAL STYLE ACTIVE: ${regionalStyle}
- Adapt recipe suggestions and generated recipes to the user's selected regional food style: ${regionalStyle}.
- Use ingredients, seasoning balance, cooking method, texture, and serving style commonly used in ${regionalStyle} homes.
- If the dish is iconic to another region, keep its authentic base and add only natural ${regionalStyle} touches that do not make it incorrect.
- Do not add random ingredients only because of the region. Accuracy for the dish and visible ingredients is more important than forced regional twists.
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

const getDisplayRecipeName = (query, regionalStyle, generatedName = "") => {
  const dishName = getCleanDishName(query, generatedName);
  return dishName;
};

const getRecipeDescription = (recipeName, recipe = {}) => {
  const provided = String(recipe.description || "").replace(/\s+/g, " ").trim();
  if (provided) return provided.slice(0, 220);

  const name = String(recipeName || recipe.name || "This recipe").trim() || "This recipe";
  const text = [name, ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : [])].join(" ").toLowerCase();

  if (/\bpaneer\b/.test(text)) return `${name} brings smoky, creamy confidence like it knows it is the headline act.`;
  if (/\bpav\s*bhaji\b/.test(text)) return `${name} is vegetables, butter, and pav forming a very successful committee.`;
  if (/\bbiryani|pulao|pulav\b/.test(text)) return `${name} has layers, aroma, and enough drama to make plain rice nervous.`;
  if (/\bdosa|idli|uttapam|uthappam\b/.test(text)) return `${name} is humble batter doing a full career transformation.`;
  if (/\bpizza|pasta\b/.test(text)) return `${name} tastes like the weekend filed an early arrival notice.`;
  return `${name} brings comfort, flavor, and just enough kitchen confidence to make takeout nervous.`;
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

const isVeganRestricted = (value) => {
  const normalized = String(value || "").toLowerCase();
  return veganRestrictedWords.some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(normalized);
  });
};

const isBlockedByDiet = (value, dietMode) => {
  return isNonVegetarian(value) ||
    (dietMode === "jain" && isJainRestricted(value)) ||
    (dietMode === "vegan" && isVeganRestricted(value));
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
    const dietMode = await getUserDietMode(req.user.id);
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
    const notes = isBlockedByDiet(parsed.notes, dietMode)
      ? `${dietMode === "jain" ? "Jain" : dietMode === "vegan" ? "Vegan" : "Veg"} mode removed restricted ingredients from this scan.`
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
      notes
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

router.post("/suggest-recipes", authMiddleware, async (req, res) => {
  try {
    const dietMode = await getUserDietMode(req.user.id);
    const regionalStyle = await getUserRegionalStyle(req.user.id);
    const ingredients = cleanIngredients(req.body.ingredients || [], dietMode).map((item) => item.name);
    if (ingredients.length === 0) {
      const dietLabel = dietMode === "jain" ? "Jain-friendly" : dietMode === "vegan" ? "vegan" : "vegetarian";
      return res.status(400).json({ msg: `Add at least one ${dietLabel} ingredient` });
    }

    const result = await generateContentWithFallback(`
Suggest ${dietMode === "jain" ? "Jain vegetarian" : dietMode === "vegan" ? "vegan" : "vegetarian"} recipes using these ingredients: ${ingredients.join(", ")}.
${getDietRules(dietMode)}
${getRegionalStyleRules(regionalStyle)}
Rules:
- Output only JSON.
- Prefer Indian-friendly and practical recipes.
- Suggest recognizable recipes that naturally fit the detected ingredients.
- Do not suggest recipes that would require unrelated main ingredients not present in the scan.
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
    res.json({ suggestions: cleanSuggestions(parsed, dietMode) });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

router.post("/generate-recipe", authMiddleware, async (req, res) => {
  try {
    const dietMode = await getUserDietMode(req.user.id);
    const regionalStyle = await getUserRegionalStyle(req.user.id);
    const ingredients = cleanIngredients(req.body.ingredients || [], dietMode).map((item) => item.name);
    const recipeName = String(req.body.recipeName || "").trim();
    const requestedServings = Math.min(10, Math.max(1, Math.round(Number(req.body.servings) || 2)));

    if (!recipeName) {
      return res.status(400).json({ msg: "Recipe name is required" });
    }

    const result = await generateContentWithFallback(`
Generate a detailed ${dietMode === "jain" ? "Jain vegetarian" : dietMode === "vegan" ? "vegan" : "vegetarian"} recipe.
Recipe: ${recipeName}
Available ingredients: ${ingredients.join(", ")}
${getDietRules(dietMode)}
${getRegionalStyleRules(regionalStyle)}
Rules:
- Output only JSON.
- The JSON "name" must be exactly "${getDisplayRecipeName(recipeName, regionalStyle)}". Do not add descriptions, subtitles, "style" text, or alternate names.
- Add a JSON "description" with one short playful line under 170 characters. Make it recipe-specific: a fun fact, light joke, or sarcastic newsroom-style comment. Do not mention real current political/news events or any person.
- Use mostly the available ingredients, but basic pantry items like salt, oil, water, spices are allowed.
- Generate the real, recognizable recipe for the requested dish, not a random variation.
- Use ingredients that commonly belong in that dish and cuisine.
- Do not invent unusual ingredients or substitutions unless the active recipe rules require it.
- For paneer recipes, paneer must remain the main ingredient. Do not replace paneer with raw banana or unrelated vegetables.
- Do not overuse any single spice. Include hing/asafoetida only if it genuinely belongs or is necessary for Jain mode.
- Make ingredients clear with quantities for ${requestedServings} servings.
- Keep each ingredient as one complete grocery item.
- Do not create separate ingredients like "chopped", "sliced", "to taste", "for garnish", "for serving", or "peeled and grated".
- Attach preparation words to the grocery item, for example "2 tomatoes, chopped".
- Put serving/garnish instructions in cooking steps, not as separate ingredients.
Format:
{
  "name": "",
  "description": "",
  "ingredients": ["", ""],
  "steps": ["", ""],
  "servings": ${requestedServings}
}
`);

    const recipe = extractJson(result.response.text());
    const recipeText = [
      recipe.name,
      ...(recipe.ingredients || []),
      ...(recipe.steps || [])
    ].join(" ");

    if ([recipe.name, ...(recipe.ingredients || []), ...(recipe.steps || [])].some(isNonVegetarian)) {
      return res.status(422).json({ msg: "Generated recipe was blocked because it included non-vegetarian content." });
    }

    if (isBlockedByDiet(recipeText, dietMode)) {
      return res.status(422).json({ msg: `Generated recipe included ingredients that are not allowed in ${dietMode} mode.` });
    }

    const displayName = getDisplayRecipeName(recipeName, regionalStyle, recipe.name);
    const description = getRecipeDescription(displayName, recipe);
    const enhancedRecipe = enhanceRecipe({
        name: displayName,
        title: displayName,
        description,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        steps: Array.isArray(recipe.steps) ? recipe.steps : [],
        servings: recipe.servings || requestedServings
    });

    res.json({
      recipe: {
        name: displayName,
        description,
        ingredients: enhancedRecipe.ingredients,
        steps: enhancedRecipe.steps,
        servings: enhancedRecipe.servings || requestedServings,
        image: enhancedRecipe.image,
        nutrition: enhancedRecipe.nutrition,
        regionalStyle
      }
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ msg: getClientErrorMessage(err) });
  }
});

module.exports = router;
