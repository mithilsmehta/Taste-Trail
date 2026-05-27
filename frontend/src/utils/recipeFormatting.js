const decimalFractions = {
  "0.125": "⅛",
  "0.25": "¼",
  "0.33": "⅓",
  "0.333": "⅓",
  "0.375": "⅜",
  "0.5": "½",
  "0.50": "½",
  "0.625": "⅝",
  "0.66": "⅔",
  "0.667": "⅔",
  "0.75": "¾",
  "0.875": "⅞"
};

const slashFractions = {
  "1/8": "⅛",
  "1/4": "¼",
  "1/3": "⅓",
  "3/8": "⅜",
  "1/2": "½",
  "5/8": "⅝",
  "2/3": "⅔",
  "3/4": "¾",
  "7/8": "⅞"
};

export const formatIngredientAmount = (ingredient) => {
  return String(ingredient)
    .replace(/\b(\d+)\s+([1-7])\/([2-8])\b/g, (match, whole, numerator, denominator) => {
      const fraction = slashFractions[`${numerator}/${denominator}`];
      return fraction ? `${whole}${fraction}` : match;
    })
    .replace(/\b([1-7])\/([2-8])\b/g, (match, numerator, denominator) => {
      const fraction = slashFractions[`${numerator}/${denominator}`];
      return fraction || match;
    })
    .replace(/\b(\d+)\.(\d+)\b/g, (match, whole, decimal) => {
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
