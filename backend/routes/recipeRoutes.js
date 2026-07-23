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
  "mawa",
  "egg",
  "eggs"
];

const normalizeDietMode = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "jain") return "jain";
  if (normalized === "vegan") return "vegan";
  return "veg";
};

const stripDietWords = (value) => {
  return String(value || "")
    .replace(/\b(jain|vegan|veg|vegetarian)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getDietModeLabel = (dietMode) => {
  if (dietMode === "jain") return "Jain";
  if (dietMode === "vegan") return "Vegan";
  return "Veg";
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

const isVeganRestricted = (value) => {
  const normalized = String(value || "").toLowerCase();
  return veganRestrictedWords.some((word) => {
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

const getDietSafetyIssue = (recipe = {}, dietMode = "veg") => {
  const recipeText = getRecipeSafetyText(recipe);
  if (isNonVegetarian(recipeText)) return "non-vegetarian content";
  if (dietMode === "jain" && isJainRestricted(recipeText)) {
    return "onion, garlic, ginger, potato, carrot, or another Jain-restricted root vegetable";
  }
  if (dietMode === "vegan" && isVeganRestricted(recipeText)) {
    return "dairy, honey, eggs, or another animal product";
  }
  return "";
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

const createJainRecipe = ({ query, servings, ingredients, steps }) => {
  return {
    name: getDietSpecificRecipeName(query, "jain"),
    ingredients,
    steps,
    servings
  };
};

const getJainFallbackRecipe = (query, servings, options = {}) => {
  const { allowGeneric = false } = options;
  const normalizedQuery = String(query || "").toLowerCase();
  const isPavBhaji = /\bpav\s*bhaji\b/.test(normalizedQuery);
  const isHakkaNoodles = /\b(hakka|noodles?|chow\s*mein|chowmein)\b/.test(normalizedQuery);
  const isBiryaniOrPulao = /\b(biryani|pulao|pulav|fried\s*rice|rice)\b/.test(normalizedQuery);
  const isPaneerTikka = /\bpaneer\s*tikka\b/.test(normalizedQuery);
  const isPaneerDish = /\bpaneer\b/.test(normalizedQuery);
  const isPizza = /\bpizza\b/.test(normalizedQuery);
  const isPasta = /\bpasta\b/.test(normalizedQuery);
  const isSandwich = /\b(sandwich|toast)\b/.test(normalizedQuery);
  const isManchurian = /\bmanchurian\b/.test(normalizedQuery);
  const isDosaOrIdli = /\b(dosa|idli|uttapam|uthappam)\b/.test(normalizedQuery);
  const isMasalaDosa = /\bmasala\s+dosa\b/.test(normalizedQuery);
  const isKhamanOrDhokla = /\b(khaman|dhokla)\b/.test(normalizedQuery);
  const isPoha = /\bpoha\b/.test(normalizedQuery);
  const isCholeOrChana = /\b(chole|chana|chickpea|chickpeas)\b/.test(normalizedQuery);
  const isDalOrKhichdi = /\b(dal|daal|khichdi|khichadi|khichri)\b/.test(normalizedQuery);
  const isUpma = /\bupma\b/.test(normalizedQuery);
  const isMixedVegetableDish = /\b(mix|mixed)\s+veg\b/.test(normalizedQuery)
    || /\bmixed\s+vegetable/.test(normalizedQuery)
    || /\bveg(etables?)?\s+(sabji|sabzi|subji|curry)\b/.test(normalizedQuery);

  if (isPavBhaji) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1 cup chopped bottle gourd",
        "1 cup cauliflower florets",
        "1 cup chopped capsicum",
        "1/2 cup green peas",
        "2 medium tomatoes, finely chopped",
        "2 tablespoons butter",
        "1 tablespoon oil",
        "1 teaspoon cumin seeds",
        "1 tablespoon pav bhaji masala",
        "1 teaspoon Kashmiri red chilli powder",
        "1/2 teaspoon turmeric powder",
        "1/2 teaspoon salt",
        "6 pav buns",
        "2 tablespoons chopped fresh coriander",
        "1 lemon, cut into wedges"
      ],
      steps: [
        "Boil bottle gourd, cauliflower, capsicum, and green peas until soft, then mash lightly.",
        "Heat butter and oil in a wide pan over medium heat and let the cumin seeds sizzle.",
        "Add chopped tomatoes and cook until they become soft and pulpy.",
        "Add the mashed vegetables, pav bhaji masala, Kashmiri red chilli powder, turmeric powder, and salt.",
        "Mash and simmer the bhaji for 8-10 minutes until thick and well combined.",
        "Toast the pav buns with a little butter on a hot tawa.",
        "Garnish the bhaji with fresh coriander and serve hot with toasted pav and lemon wedges."
      ],
    });
  }

  if (isHakkaNoodles) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "200g vegetarian hakka noodles",
        "1 cup shredded cabbage",
        "1 cup sliced capsicum",
        "1/2 cup sliced French beans",
        "1/2 cup green peas",
        "2 tablespoons sesame oil",
        "1 tablespoon soy sauce",
        "1 teaspoon green chilli sauce",
        "1 teaspoon vinegar",
        "1/2 teaspoon black pepper powder",
        "1/2 teaspoon salt",
        "2 tablespoons chopped fresh coriander"
      ],
      steps: [
        "Boil the hakka noodles until just cooked, rinse with cold water, drain, and toss with a few drops of oil.",
        "Heat sesame oil in a wok over high heat.",
        "Add cabbage, capsicum, French beans, and green peas, then stir-fry for 2-3 minutes so the vegetables stay crisp.",
        "Add soy sauce, green chilli sauce, vinegar, black pepper powder, and salt.",
        "Add the cooked noodles and toss on high heat until the noodles are evenly coated.",
        "Finish with fresh coriander and serve hot."
      ]
    });
  }

  if (isPaneerTikka) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "250g paneer, cut into cubes",
        "1 medium capsicum, cut into squares",
        "1 medium firm tomato, cut into squares",
        "1/2 cup thick curd",
        "1 tablespoon besan",
        "1 teaspoon Kashmiri red chilli powder",
        "1/2 teaspoon turmeric powder",
        "1 teaspoon coriander powder",
        "1/2 teaspoon garam masala",
        "1/2 teaspoon roasted cumin powder",
        "1 tablespoon lemon juice",
        "1 tablespoon oil",
        "1/2 teaspoon salt",
        "1 tablespoon butter for brushing"
      ],
      steps: [
        "Whisk thick curd, besan, chilli powder, turmeric powder, coriander powder, garam masala, roasted cumin powder, lemon juice, oil, and salt into a smooth marinade.",
        "Add paneer cubes, capsicum, and tomato, then coat gently and rest for 20 minutes.",
        "Thread paneer and vegetables onto skewers or arrange them on a hot tawa.",
        "Cook on medium-high heat, brushing with butter, until the paneer is lightly charred on all sides.",
        "Serve hot with lemon wedges and fresh coriander."
      ]
    });
  }

  if (isPaneerDish) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "250g paneer, cut into cubes",
        "2 medium tomatoes, pureed",
        "1/2 cup chopped capsicum",
        "1/2 cup thick curd",
        "2 tablespoons cashew paste",
        "1 tablespoon ghee or oil",
        "1 teaspoon cumin seeds",
        "1 teaspoon coriander powder",
        "1/2 teaspoon turmeric powder",
        "1 teaspoon Kashmiri red chilli powder",
        "1/2 teaspoon garam masala",
        "1/2 teaspoon salt",
        "2 tablespoons chopped fresh coriander"
      ],
      steps: [
        "Heat ghee or oil in a pan and let cumin seeds sizzle.",
        "Add tomato puree and cook until it thickens and the oil begins to separate.",
        "Add capsicum, coriander powder, turmeric powder, chilli powder, garam masala, and salt.",
        "Whisk curd with cashew paste, lower the heat, and stir it into the gravy.",
        "Add paneer cubes and simmer gently for 4-5 minutes.",
        "Garnish with fresh coriander and serve hot."
      ]
    });
  }

  if (isBiryaniOrPulao) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1 cup basmati rice",
        "1 cup cauliflower florets",
        "1/2 cup chopped capsicum",
        "1/2 cup green peas",
        "1/2 cup chopped French beans",
        "2 medium tomatoes, chopped",
        "2 tablespoons ghee or oil",
        "1 teaspoon cumin seeds",
        "1 bay leaf",
        "1 small cinnamon stick",
        "2 cloves",
        "1 teaspoon coriander powder",
        "1/2 teaspoon turmeric powder",
        "1 teaspoon biryani masala",
        "1/2 teaspoon salt",
        "2 tablespoons chopped fresh coriander",
        "2 tablespoons chopped mint leaves"
      ],
      steps: [
        "Rinse and soak basmati rice for 20 minutes, then drain.",
        "Heat ghee or oil in a heavy pan and add cumin seeds, bay leaf, cinnamon, and cloves.",
        "Add tomatoes and cook until soft.",
        "Add cauliflower, capsicum, green peas, French beans, coriander powder, turmeric powder, biryani masala, and salt.",
        "Add drained rice and 2 cups water, then cover and cook on low heat until the rice is fluffy.",
        "Rest for 5 minutes, garnish with coriander and mint, and serve hot."
      ]
    });
  }

  if (isPizza) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1 ready pizza base",
        "1/2 cup Jain tomato pizza sauce",
        "1 cup shredded mozzarella cheese",
        "1/2 cup sliced capsicum",
        "1/2 cup sliced tomatoes",
        "1/4 cup sweet corn",
        "1 teaspoon dried oregano",
        "1/2 teaspoon chilli flakes",
        "1 tablespoon olive oil"
      ],
      steps: [
        "Preheat the oven to 220°C.",
        "Spread Jain tomato pizza sauce over the pizza base.",
        "Top with mozzarella cheese, capsicum, tomatoes, and sweet corn.",
        "Sprinkle oregano and chilli flakes, then drizzle olive oil.",
        "Bake for 10-12 minutes until the cheese melts and the base turns crisp.",
        "Slice and serve hot."
      ]
    });
  }

  if (isPasta) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "200g pasta",
        "1 cup tomato puree",
        "1/2 cup chopped capsicum",
        "1/2 cup sweet corn",
        "2 tablespoons olive oil",
        "1 teaspoon dried oregano",
        "1/2 teaspoon chilli flakes",
        "1/2 teaspoon black pepper powder",
        "1/2 teaspoon salt",
        "1/2 cup grated cheese"
      ],
      steps: [
        "Boil pasta until al dente, reserve 1/2 cup pasta water, and drain.",
        "Heat olive oil in a pan and add tomato puree.",
        "Cook until the sauce thickens, then add capsicum and sweet corn.",
        "Add oregano, chilli flakes, black pepper powder, and salt.",
        "Add pasta and a little reserved pasta water, then toss well.",
        "Finish with grated cheese and serve hot."
      ]
    });
  }

  if (isSandwich) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "4 bread slices",
        "1/2 cup grated paneer",
        "1/2 cup chopped capsicum",
        "1/2 cup chopped tomatoes",
        "2 tablespoons Jain green chutney",
        "2 tablespoons butter",
        "1/2 teaspoon chaat masala",
        "1/2 teaspoon salt"
      ],
      steps: [
        "Mix paneer, capsicum, tomatoes, chaat masala, and salt.",
        "Spread green chutney on bread slices.",
        "Add the paneer filling and close the sandwiches.",
        "Apply butter on the outside and toast until golden and crisp.",
        "Cut and serve hot."
      ]
    });
  }

  if (isManchurian) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1 cup finely shredded cabbage",
        "1/2 cup finely chopped capsicum",
        "1/2 cup grated paneer",
        "1/4 cup chopped French beans",
        "3 tablespoons cornflour",
        "2 tablespoons all-purpose flour",
        "1/2 teaspoon black pepper powder",
        "1/2 teaspoon salt",
        "Oil for frying",
        "1 tablespoon sesame oil",
        "1/2 cup tomato puree",
        "1 tablespoon soy sauce",
        "1 teaspoon chilli sauce",
        "1 teaspoon vinegar",
        "1/2 cup water",
        "1 tablespoon chopped fresh coriander"
      ],
      steps: [
        "Mix cabbage, capsicum, paneer, French beans, cornflour, all-purpose flour, black pepper powder, and salt into a firm mixture.",
        "Shape the mixture into small balls and fry until crisp and golden.",
        "Heat sesame oil in a pan, add tomato puree, soy sauce, chilli sauce, vinegar, and water.",
        "Simmer the sauce for 3-4 minutes until glossy.",
        "Add the fried balls and toss gently until coated.",
        "Garnish with fresh coriander and serve hot."
      ]
    });
  }

  if (isMasalaDosa) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1 cup parboiled rice",
        "1/3 cup urad dal",
        "1/4 teaspoon fenugreek seeds",
        "1/2 teaspoon salt",
        "Oil for cooking",
        "2 cups raw banana, peeled and mashed",
        "1/2 cup green peas",
        "1 medium tomato, finely chopped",
        "2 tablespoons oil",
        "1 teaspoon mustard seeds",
        "8 curry leaves",
        "2 green chillies, finely chopped",
        "1/2 teaspoon turmeric powder",
        "1 teaspoon coriander powder",
        "1/2 teaspoon cumin powder",
        "1 tablespoon lemon juice",
        "2 tablespoons chopped fresh coriander",
        "1/2 cup coconut chutney"
      ],
      steps: [
        "Soak rice, urad dal, and fenugreek seeds separately for 5-6 hours.",
        "Grind into a smooth batter, mix with salt, and ferment overnight.",
        "Steam or boil raw banana until tender, then mash it lightly.",
        "Heat oil in a pan and crackle mustard seeds with curry leaves and green chillies.",
        "Add tomato and cook until soft, then add green peas, turmeric powder, coriander powder, cumin powder, and salt.",
        "Add mashed raw banana and mix until the masala becomes thick and spoonable.",
        "Finish the masala with lemon juice and fresh coriander.",
        "Spread dosa batter on a hot tawa, drizzle oil, add the raw banana masala, fold, and serve with coconut chutney."
      ]
    });
  }

  if (isDosaOrIdli) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1 cup parboiled rice",
        "1/3 cup urad dal",
        "1/4 teaspoon fenugreek seeds",
        "1/2 teaspoon salt",
        "Oil for cooking",
        "1/2 cup coconut chutney",
        "1 cup Jain sambar made with bottle gourd, pumpkin, and tomatoes"
      ],
      steps: [
        "Soak rice, urad dal, and fenugreek seeds separately for 5-6 hours.",
        "Grind into a smooth batter, mix with salt, and ferment overnight.",
        "For dosa, spread batter on a hot tawa, drizzle oil, and cook until crisp.",
        "For idli, pour batter into greased moulds and steam for 10-12 minutes.",
        "Serve with coconut chutney and Jain sambar."
      ]
    });
  }

  if (isKhamanOrDhokla) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1 cup gram flour",
        "1 tablespoon semolina",
        "1 tablespoon sugar",
        "1 tablespoon lemon juice",
        "1 teaspoon green chilli paste",
        "3/4 cup water",
        "1 teaspoon fruit salt",
        "1 tablespoon oil",
        "1 teaspoon mustard seeds",
        "1 teaspoon sesame seeds",
        "8 curry leaves",
        "2 tablespoons chopped fresh coriander",
        "1/2 teaspoon salt"
      ],
      steps: [
        "Whisk gram flour, semolina, sugar, lemon juice, green chilli paste, salt, and water into a smooth batter.",
        "Grease a steaming tray and heat the steamer.",
        "Stir fruit salt into the batter and immediately pour it into the tray.",
        "Steam for 12-15 minutes until the khaman is soft and cooked through.",
        "Heat oil and crackle mustard seeds, sesame seeds, and curry leaves.",
        "Pour the tempering over the khaman, garnish with fresh coriander, cut, and serve."
      ]
    });
  }

  if (isPoha) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "2 cups thick poha",
        "1/2 cup green peas",
        "1/2 cup chopped capsicum",
        "1/4 cup roasted peanuts",
        "2 tablespoons oil",
        "1 teaspoon mustard seeds",
        "8 curry leaves",
        "2 green chillies, finely chopped",
        "1/2 teaspoon turmeric powder",
        "1 teaspoon sugar",
        "1 tablespoon lemon juice",
        "1/2 teaspoon salt",
        "2 tablespoons chopped fresh coriander"
      ],
      steps: [
        "Rinse poha briefly, drain well, and rest for 5 minutes.",
        "Heat oil in a pan and crackle mustard seeds with curry leaves and green chillies.",
        "Add green peas and capsicum, then cook for 2-3 minutes.",
        "Add turmeric powder, sugar, salt, and softened poha.",
        "Mix gently and cook for 2 minutes on low heat.",
        "Finish with lemon juice, roasted peanuts, and fresh coriander."
      ]
    });
  }

  if (isCholeOrChana) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1 cup chickpeas, soaked overnight",
        "2 medium tomatoes, pureed",
        "2 tablespoons oil",
        "1 teaspoon cumin seeds",
        "1 bay leaf",
        "1 teaspoon coriander powder",
        "1/2 teaspoon turmeric powder",
        "1 teaspoon Kashmiri red chilli powder",
        "1 teaspoon chole masala",
        "1/2 teaspoon garam masala",
        "1/2 teaspoon salt",
        "2 tablespoons chopped fresh coriander",
        "1 tablespoon lemon juice"
      ],
      steps: [
        "Pressure cook soaked chickpeas with water until soft.",
        "Heat oil in a pan and add cumin seeds and bay leaf.",
        "Add tomato puree and cook until thick.",
        "Add coriander powder, turmeric powder, chilli powder, chole masala, garam masala, and salt.",
        "Add cooked chickpeas with some cooking water and simmer for 10 minutes.",
        "Finish with lemon juice and fresh coriander."
      ]
    });
  }

  if (isDalOrKhichdi) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1/2 cup yellow moong dal",
        "1/2 cup rice",
        "1 medium tomato, chopped",
        "1/2 cup bottle gourd cubes",
        "1/2 cup green peas",
        "1 tablespoon ghee",
        "1 teaspoon cumin seeds",
        "1/2 teaspoon turmeric powder",
        "1/2 teaspoon salt",
        "3 cups water",
        "2 tablespoons chopped fresh coriander"
      ],
      steps: [
        "Rinse moong dal and rice until the water runs clear.",
        "Heat ghee in a pressure cooker and add cumin seeds.",
        "Add tomato, bottle gourd, green peas, turmeric powder, and salt.",
        "Add dal, rice, and water, then pressure cook until soft.",
        "Mash lightly for a comforting texture.",
        "Garnish with fresh coriander and serve hot."
      ]
    });
  }

  if (isUpma) {
    return createJainRecipe({
      query,
      servings,
      ingredients: [
        "1 cup semolina",
        "1/2 cup chopped capsicum",
        "1/2 cup green peas",
        "1/4 cup chopped French beans",
        "2 tablespoons oil",
        "1 teaspoon mustard seeds",
        "1 teaspoon urad dal",
        "8 curry leaves",
        "2 green chillies, finely chopped",
        "2 1/2 cups water",
        "1/2 teaspoon salt",
        "1 tablespoon lemon juice",
        "2 tablespoons chopped fresh coriander"
      ],
      steps: [
        "Dry roast semolina on low heat until aromatic, then set aside.",
        "Heat oil in a pan and crackle mustard seeds with urad dal, curry leaves, and green chillies.",
        "Add capsicum, green peas, and French beans, then cook for 2-3 minutes.",
        "Add water and salt, then bring to a boil.",
        "Slowly add roasted semolina while stirring continuously.",
        "Cook until thick and fluffy, then finish with lemon juice and fresh coriander."
      ]
    });
  }

  if (!allowGeneric && !isMixedVegetableDish && !/\b(veg|vegetable|sabji|sabzi|subji|curry|healthy|diet)\b/.test(normalizedQuery)) {
    return null;
  }

  return createJainRecipe({
    query,
    servings,
    ingredients: [
      "1 cup cauliflower florets",
      "1 cup chopped capsicum",
      "1 cup chopped cabbage",
      "1/2 cup green peas",
      "2 medium tomatoes, finely chopped",
      "2 tablespoons ghee or oil",
      "1 teaspoon cumin seeds",
      "1 teaspoon coriander powder",
      "1/2 teaspoon turmeric powder",
      "1 teaspoon Kashmiri red chilli powder",
      "1 teaspoon garam masala",
      "1/2 teaspoon salt",
      "2 tablespoons chopped fresh coriander"
    ],
    steps: [
      "Heat ghee or oil in a pan over medium heat and add cumin seeds.",
      "Add chopped tomatoes and cook until soft and pulpy.",
      "Add cauliflower, capsicum, cabbage, and green peas. Mix well.",
      "Add coriander powder, turmeric powder, Kashmiri red chilli powder, garam masala, and salt.",
      "Cover and cook for 8-10 minutes, stirring occasionally, until the vegetables are tender but not mushy.",
      "Garnish with fresh coriander and serve hot with roti or paratha."
    ],
  });
};

const normalizeRegionalStyle = (value) => {
  return String(value || "").trim().replace(/\s+/g, " ");
};

const normalizeRecipeQuery = (value) => {
  return stripDietWords(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(recipe|style|styled|authentic|traditional|homestyle|home style)\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  const cleaned = stripDietWords(source)
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

const getDietSpecificRecipeName = (query, dietMode = "veg", generatedName = "") => {
  const baseName = getStoredRecipeName(query, generatedName);
  if (dietMode === "jain" && !/^jain\b/i.test(baseName)) return `Jain ${baseName}`;
  if (dietMode === "vegan" && !/^vegan\b/i.test(baseName)) return `Vegan ${baseName}`;
  return baseName;
};

const getRecipeLookupTitles = (query, dietMode = "veg") => {
  const candidates = [
    getDietSpecificRecipeName(query, dietMode),
    getStoredRecipeName(query),
    getStoredRecipeName(stripDietWords(query))
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const getSavedRecipeForUser = async ({ userId, query, regionalStyle, dietMode }) => {
  const titles = getRecipeLookupTitles(query, dietMode);
  if (!titles.length) return null;

  const baseQuery = {
    userId,
    regionalStyle,
    dietMode
  };

  let recipe = await SavedRecipe.findOne({
    ...baseQuery,
    title: { $in: titles }
  }).sort({ updatedAt: -1, createdAt: -1 }).lean();

  if (!recipe) {
    const titlePatterns = titles.map((title) => new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
    recipe = await SavedRecipe.findOne({
      ...baseQuery,
      title: { $in: titlePatterns }
    }).sort({ updatedAt: -1, createdAt: -1 }).lean();
  }

  if (!recipe) return null;

  const safetyIssue = getDietSafetyIssue(recipe, dietMode);
  if (safetyIssue) {
    console.warn(`Skipped saved recipe "${recipe.title}" because it contains ${safetyIssue}.`);
    return null;
  }

  return recipe;
};

const getRecipeDescription = (query, recipe = {}) => {
  const provided = String(recipe.description || "").replace(/\s+/g, " ").trim();
  if (provided) return provided.slice(0, 220);

  const name = getDietSpecificRecipeName(query, recipe.dietMode || "veg", recipe.name || recipe.title || "This recipe");
  const text = [query, name, ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : [])].join(" ").toLowerCase();

  if (/\bpaneer\b/.test(text)) {
    return `${name} walks in with main-character energy: smoky, creamy, and fully aware it is carrying dinner.`;
  }
  if (/\bpav\s*bhaji\b/.test(text)) {
    return `Fun fact: ${name} is basically vegetables holding a press conference with butter and pav.`;
  }
  if (/\bbiryani|pulao|pulav\b/.test(text)) {
    return `${name} has layers, fragrance, and enough drama to make plain rice file a complaint.`;
  }
  if (/\bdosa|idli|uttapam|uthappam\b/.test(text)) {
    return `South Indian engineering at its finest: humble batter becomes ${name} and suddenly breakfast has a fan club.`;
  }
  if (/\bpizza|pasta\b/.test(text)) {
    return `${name} is what happens when comfort food checks the calendar and decides every day is a weekend.`;
  }
  if (/\bsalad|soup|sprout|quinoa|millet|oats\b/.test(text)) {
    return `${name} is healthy enough to sound responsible, but tasty enough to avoid becoming a lecture.`;
  }
  if (/\bdessert|cake|kheer|jalebi|gulab|brownie|tiramisu|ice\s*cream\b/.test(text)) {
    return `${name} is proof that dessert does not solve problems, but it does improve the meeting.`;
  }

  return `${name} brings comfort, spice, and just enough kitchen confidence to make takeout nervous.`;
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

  const storedName = getDietSpecificRecipeName(query, dietMode, recipe.name);
  const enhancedRecipe = enhanceRecipe({ ...recipe, name: storedName, title: storedName, servings });
  const description = getRecipeDescription(query, { ...recipe, dietMode, name: storedName });

  await GeneratedRecipe.create({
    userId,
    query,
    normalizedQuery,
    regionalStyle,
    dietMode,
    servings,
    name: storedName,
    description,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    nutrition: enhancedRecipe.nutrition,
    healthScore: enhancedRecipe.healthScore,
    healthLabel: enhancedRecipe.healthLabel
  });
};

// GENERATE RECIPE WITH BACKEND AI
router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const query = String(req.body.query || "").trim();
    const servings = Number(req.body.servings) || 2;
    const forceRegenerate = Boolean(req.body.forceRegenerate);
    const regionalStyle = await getUserRegionalStyle(req.user.id);
    const dietMode = await getUserDietMode(req.user.id);

    if (!query) {
      return res.status(400).json({ msg: "Recipe query is required" });
    }

    if (!forceRegenerate) {
      const savedRecipe = await getSavedRecipeForUser({
        userId: req.user.id,
        query,
        regionalStyle,
        dietMode
      });

      if (savedRecipe) {
        const savedResponseRecipe = {
          name: getDietSpecificRecipeName(query, dietMode, savedRecipe.title),
          description: savedRecipe.description || getRecipeDescription(query, { ...savedRecipe, dietMode }),
          ingredients: Array.isArray(savedRecipe.ingredients) ? savedRecipe.ingredients : [],
          steps: Array.isArray(savedRecipe.steps) ? savedRecipe.steps : [],
          servings: savedRecipe.servings || servings,
          nutrition: savedRecipe.nutrition,
          healthScore: savedRecipe.healthScore,
          healthLabel: savedRecipe.healthLabel,
          dietMode,
          regionalStyle,
          source: "saved",
          savedRecipeId: savedRecipe._id
        };

        return res.json({ recipe: enhanceRecipe(savedResponseRecipe) });
      }

      const sharedRecipe = await getSharedRegionalRecipe({ query, regionalStyle, dietMode, servings });
      if (sharedRecipe) {
        const sharedResponseRecipe = {
          name: getDietSpecificRecipeName(query, dietMode, sharedRecipe.name),
          description: getRecipeDescription(query, { ...sharedRecipe, dietMode }),
          ingredients: Array.isArray(sharedRecipe.ingredients) ? sharedRecipe.ingredients : [],
          steps: Array.isArray(sharedRecipe.steps) ? sharedRecipe.steps : [],
          servings: sharedRecipe.servings || servings,
          nutrition: sharedRecipe.nutrition,
          healthScore: sharedRecipe.healthScore,
          healthLabel: sharedRecipe.healthLabel,
          dietMode,
          regionalStyle,
          source: "sharedRegional",
          sharedRecipeId: sharedRecipe._id
        };
        const sharedSafetyIssue = getDietSafetyIssue(sharedResponseRecipe, dietMode);
        if (sharedSafetyIssue) {
          console.warn("Skipped shared recipe because of safety issue:", sharedSafetyIssue);
        } else {
        const sharedAccuracyIssue = getRecipeAccuracyIssue(query, sharedResponseRecipe);
        if (!sharedAccuracyIssue) {
          const enhancedSharedRecipe = enhanceRecipe(sharedResponseRecipe);
          return res.json({ recipe: enhancedSharedRecipe });
        }

        console.warn("Skipped shared recipe because of accuracy issue:", sharedAccuracyIssue);
        }
      }
    }

    const quickJainFallback = dietMode === "jain" ? getJainFallbackRecipe(query, servings) : null;
    if (quickJainFallback) {
      const enhancedFallbackRecipe = enhanceRecipe({
        ...quickJainFallback,
        title: quickJainFallback.name
      });
      const responseRecipe = {
        ...quickJainFallback,
        description: getRecipeDescription(query, { ...quickJainFallback, dietMode }),
        nutrition: enhancedFallbackRecipe.nutrition,
        healthScore: enhancedFallbackRecipe.healthScore,
        healthLabel: enhancedFallbackRecipe.healthLabel,
        dietMode,
        regionalStyle,
        source: "jainFallback"
      };

      return res.json({ recipe: responseRecipe });
    }

    const dietRules = {
      jain: `
STRICT JAIN MODE ACTIVE:
- Generate ONLY Jain vegetarian recipes, even if the user did not type "Jain".
- NEVER use onion, garlic, potato, carrot, radish, beetroot, turnip, ginger, sweet potato, yam, tapioca, cassava, arbi, colocasia, spring onion, leek, shallot, or any root vegetable.
- NEVER use meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or any non-vegetarian ingredient.
- For searches like "diet recipe", "healthy recipe", or any generic recipe request, still make the recipe strictly Jain by default.
- If the requested dish normally uses restricted ingredients, create a Jain-friendly version and name it clearly.
- If the requested dish normally uses potato filling, such as masala dosa, replace potato with raw banana or another Jain-safe equivalent and keep the dish recognizable.
- For dishes like pav bhaji, biryani, pulao, chole, paneer sabji, noodles, pasta, pizza, sandwiches, and sabji, create the real Jain version of that dish. Do not copy the regular recipe and do not include onion, garlic, potato, carrot, ginger, beetroot, radish, or any root vegetable.
- For "mix veg", "mixed veg", "mixed vegetable sabji", or similar generic vegetable recipes in Jain mode, use only non-root Jain-safe vegetables such as cauliflower, capsicum, cabbage, green peas, French beans, tomatoes, bottle gourd, ridge gourd, or paneer. Do not use onion, garlic, ginger, potato, carrot, beetroot, radish, or any root vegetable.
- Keep the recipe faithful to the requested dish. Do not add unrelated substitutes like raw banana, cabbage, cauliflower, or hing unless they are normal for that exact dish or are replacing a blocked potato/root filling.
- For paneer dishes, paneer must remain the main ingredient. Do not replace paneer with raw banana or unrelated vegetables.
- Hing/asafoetida is not a default Jain replacement for onion or garlic. Use it only in dishes where it is traditionally normal, such as some dals or kadhis.
- Do not add hing/asafoetida to paneer tikka, paneer sabji, paneer curry, paneer masala, paneer bhurji, grilled paneer starters, or tandoori-style paneer unless the user explicitly asks for hing.
`,
      vegan: `
STRICT VEGAN MODE ACTIVE:
- Generate ONLY vegan recipes, even if the user did not type "Vegan".
- NEVER use meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or any non-vegetarian ingredient.
- NEVER use dairy or animal products such as milk, curd, yogurt, dahi, paneer, cheese, cream, butter, ghee, honey, mayonnaise, whey, casein, condensed milk, khoya, or mawa.
- Use plant-based ingredients such as tofu, legumes, lentils, beans, nuts, seeds, coconut milk, plant milk, vegetable oil, and vegetables where they naturally fit.
- If the requested dish normally uses dairy, create a vegan version with recognizable plant-based substitutions and name it clearly.
`,
      veg: `
STRICT VEG MODE ACTIVE:
- Generate ONLY vegetarian recipes.
- NEVER use meat, seafood, fish, chicken, eggs, gelatin, animal stock, lard, bacon, ham, or any non-vegetarian ingredient.
- Normal vegetarian ingredients such as onion, garlic, potato, carrot, ginger, beetroot, and other root vegetables are allowed in Veg mode when they belong in the recipe.
- If the requested dish is non-vegetarian, convert it into a vegetarian version using paneer, tofu, vegetables, mushrooms, lentils, or beans and name it clearly.
`
    }[dietMode];

    const buildPrompt = (retryNote = "") => `
Output ONLY pure JSON. No markdown, no commentary.
${dietRules}
${getRegionalStyleRules(regionalStyle)}
${retryNote}

Generate a detailed ${getDietModeLabel(dietMode)} recipe for ${servings} servings: ${query}
Accuracy rules:
- The JSON "name" must be exactly "${getDietSpecificRecipeName(query, dietMode)}". Keep the state/region only in the separate "regionalStyle" app field, not in the recipe name.
- Do not add descriptions like "steamed savory cake", "Maharashtrian-style", subtitles, or alternate names to the name.
- Add a JSON "description" with one or two short lines under 170 characters. Make it recipe-specific and playful: a fun fact, light joke, or sarcastic newsroom-style comment. Do not mention real current political/news events or any person.
- Generate the real, recognizable recipe for the requested dish, not a random variation.
- Use ingredients that commonly belong in that dish and cuisine.
- Do not invent unusual ingredients or substitutions unless the active search rules require it.
- If the query is specific, such as "paneer tikka", "paneer sabji", "pav bhaji", "tiramisu", or "veg biryani", the ingredients and steps must match that dish.
- For paneer tikka in regular or Jain searches, use paneer cubes, thick curd or hung curd, besan or gram flour, capsicum, firm tomato if allowed, lemon juice, oil or butter for brushing, and standard tikka spices. In Vegan searches, use firm tofu or a vegan paneer alternative with dairy-free marinade instead.
- For paneer sabji/curry/masala in regular or Jain searches, use paneer as the main ingredient and a normal paneer gravy base allowed by the active search rules. In Vegan searches, use tofu or a vegan paneer alternative and avoid all dairy. Do not use raw banana, plantain, or hing unless the user explicitly requested them.
- Never write impossible spice measurements like "cloves hing". Hing is a pinch or powder only when it truly belongs.
- Do not overuse any single spice. Include hing/asafoetida only if it genuinely belongs to the requested dish, never just because Jain mode is active.
Ingredient rules:
- Every ingredient must include an amount, for example "1 cup basmati rice" or "2 tablespoons oil".
- Keep each ingredient as one complete grocery item.
- Do not create separate ingredients like "chopped", "sliced", "to taste", "for garnish", "for serving", or "peeled and grated".
- Attach preparation words to the grocery item, for example "2 tomatoes, chopped".
- Put serving/garnish instructions in cooking steps, not as separate ingredients.
- Do not mention blocked ingredients in cooking steps either.
Nutrition rules:
- Estimate nutrition per serving from the exact ingredient quantities.
- Include calories, protein, carbs, fat, and fiber as numbers only.
- Do not guess high protein unless the recipe includes real protein sources such as paneer, cheese, dal, beans, chickpeas, tofu, yogurt, milk, nuts, seeds, or whole grains.

Format:
{
  "name": "",
  "description": "",
  "ingredients": ["", ""],
  "steps": ["", ""],
  "servings": ${servings},
  "nutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0
  }
}
`;

    let recipe = null;
    let blockedReason = "";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const retryNote = attempt === 0
        ? ""
        : `
The previous recipe was rejected because it contained "${blockedReason}".
Rewrite from scratch. Keep the requested dish authentic, remove every restricted or inaccurate item from ingredients and steps, and do not replace the main ingredient with unrelated substitutes.
If this is a mixed vegetable dish in Jain mode, use cauliflower, capsicum, cabbage, green peas, French beans, tomatoes, bottle gourd, ridge gourd, or paneer only.`;
      const result = await generateRecipeText(buildPrompt(retryNote));
      const candidate = extractJson(result);
      const safetyIssue = getDietSafetyIssue(candidate, dietMode);
      if (safetyIssue) {
        blockedReason = safetyIssue;
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
      const fallbackRecipe = dietMode === "jain" ? getJainFallbackRecipe(query, servings, { allowGeneric: true }) : null;
      if (fallbackRecipe) {
        const enhancedFallbackRecipe = enhanceRecipe({
          ...fallbackRecipe,
          title: fallbackRecipe.name
        });
        const responseRecipe = {
          ...fallbackRecipe,
          description: getRecipeDescription(query, { ...fallbackRecipe, dietMode }),
          nutrition: enhancedFallbackRecipe.nutrition,
          healthScore: enhancedFallbackRecipe.healthScore,
          healthLabel: enhancedFallbackRecipe.healthLabel,
          dietMode,
          regionalStyle,
          source: "jainFallback"
        };

        return res.json({
          recipe: responseRecipe
        });
      }

      return res.status(422).json({
        msg: dietMode === "jain"
          ? "Could not generate a Jain-safe recipe. Please try again; Jain mode blocks onion, garlic, ginger, potato, carrot, and root vegetables."
          : dietMode === "vegan"
            ? "Could not generate a vegan recipe. Please try again; Vegan mode blocks dairy, honey, eggs, and animal products."
          : "Generated recipe was blocked because it included non-vegetarian content."
      });
    }

    const displayName = getDietSpecificRecipeName(query, dietMode, recipe.name);
    const description = getRecipeDescription(query, { ...recipe, dietMode, name: displayName });
    const enhancedGeneratedRecipe = enhanceRecipe({
      name: displayName,
      title: displayName,
      description,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      servings
    });
    const responseRecipe = {
      name: displayName,
      description,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      servings,
      nutrition: enhancedGeneratedRecipe.nutrition,
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
    const { title, ingredients, steps, image, nutrition, healthScore, healthLabel, servings } = req.body;
    const regionalStyle = await getUserRegionalStyle(req.user.id);
    const dietMode = await getUserDietMode(req.user.id);
    const storedTitle = getDietSpecificRecipeName(title, dietMode);
    const description = getRecipeDescription(title, { description: req.body.description, ingredients, steps, dietMode, title: storedTitle });
    const enhancedRecipe = enhanceRecipe({ title: storedTitle, description, ingredients, steps, image, nutrition, healthScore, healthLabel, servings });
    const recipeText = getRecipeSafetyText({ title: storedTitle, ingredients, steps });

    if (isNonVegetarian(recipeText)) {
      return res.status(422).json({ msg: `Recipe was blocked because ${getDietModeLabel(dietMode)} search rules do not allow non-vegetarian content.` });
    }

    if (dietMode === "jain" && isJainRestricted(recipeText)) {
      return res.status(422).json({ msg: "Recipe was blocked because Jain mode does not allow root vegetables, onion, or garlic." });
    }

    if (dietMode === "vegan" && isVeganRestricted(recipeText)) {
      return res.status(422).json({ msg: "Recipe was blocked because Vegan mode does not allow dairy, honey, eggs, or animal products." });
    }

    // Check if recipe already exists for this user
    const existing = await SavedRecipe.findOne({
      userId: req.user.id,
      title: { $in: getRecipeLookupTitles(title, dietMode) },
      regionalStyle,
      dietMode
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (existing) {
      existing.title = storedTitle;
      existing.ingredients = Array.isArray(ingredients) ? ingredients : [];
      existing.steps = Array.isArray(steps) ? steps : [];
      existing.regionalStyle = regionalStyle;
      existing.dietMode = dietMode;
      existing.description = description;
      existing.image = enhancedRecipe.image;
      existing.servings = Number(servings) || existing.servings || 2;
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
      description,
      ingredients,
      steps,
      regionalStyle,
      dietMode,
      image: enhancedRecipe.image,
      servings: Number(servings) || 2,
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
    const dietMode = await getUserDietMode(req.user.id);
    const recipe = await getSavedRecipeForUser({
      userId: req.user.id,
      regionalStyle,
      query: title,
      dietMode
    });

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

// GET ONE SAVED RECIPE FOR USER BY ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(String(req.params.id || ""))) {
      return res.status(400).json({ msg: "Invalid recipe id" });
    }

    const recipe = await SavedRecipe.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!recipe) {
      return res.status(404).json({ msg: "Recipe not found" });
    }

    res.json(enhanceRecipe(recipe));
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch recipe" });
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
