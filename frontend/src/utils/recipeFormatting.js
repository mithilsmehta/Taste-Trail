const decimalFractions = {
  "0.25": "¼",
  "0.33": "⅓",
  "0.333": "⅓",
  "0.5": "½",
  "0.50": "½",
  "0.66": "⅔",
  "0.667": "⅔",
  "0.75": "¾"
};

export const formatIngredientAmount = (ingredient) => {
  return String(ingredient).replace(/\b(\d+)\.(\d+)\b/g, (match, whole, decimal) => {
    const fraction = decimalFractions[`0.${decimal}`];
    if (!fraction) return match;

    return whole === "0" ? fraction : `${whole}${fraction}`;
  });
};

export const splitIngredientLine = (ingredient) => {
  const withoutRecipeLabel = String(ingredient).replace(/^for\s+[^:]+:\s*/i, "");
  const parts = withoutRecipeLabel
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts : [String(ingredient).trim()].filter(Boolean);
};

export const getDisplayIngredients = (ingredients = []) => {
  return ingredients.flatMap((ingredient) =>
    splitIngredientLine(ingredient).map(formatIngredientAmount)
  );
};
