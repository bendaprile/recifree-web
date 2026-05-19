/**
 * Ingredient Parser Utility
 * Parses raw ingredient strings (e.g., "1 1/2 cups all-purpose flour, sifted")
 * into normalized { amount, unit, item } objects.
 */

const UNICODE_FRACTIONS = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8'
};

const UNIT_MAP = {
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'tbsp.': 'tbsp',
  'tbsps': 'tbsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'tsp.': 'tsp',
  'tsps': 'tsp',
  'ounce': 'oz',
  'ounces': 'oz',
  'oz.': 'oz',
  'ozs': 'oz',
  'pound': 'lb',
  'pounds': 'lb',
  'lb.': 'lb',
  'lbs.': 'lb',
  'lbs': 'lb',
  'cups': 'cup',
  'gram': 'g',
  'grams': 'g',
  'g.': 'g',
  'milliliter': 'ml',
  'milliliters': 'ml',
  'ml.': 'ml',
  'cloves': 'clove',
  'stalks': 'stalk',
  'cans': 'can',
  'pinches': 'pinch',
  'bunches': 'bunch',
  'slices': 'slice',
  'heads': 'head'
};

// Recognized units (both raw and standardized keys)
const RECOGNIZED_UNITS = new Set([
  'cup', 'cups', 'tbsp', 'tbsps', 'tablespoon', 'tablespoons',
  'tsp', 'tsps', 'teaspoon', 'teaspoons', 'oz', 'ozs', 'ounce', 'ounces',
  'lb', 'lbs', 'pound', 'pounds', 'g', 'grams', 'ml', 'milliliter', 'milliliters',
  'clove', 'cloves', 'can', 'cans', 'pinch', 'pinches', 'slice', 'slices',
  'stalk', 'stalks', 'head', 'heads', 'bunch', 'bunches', 'sprig', 'sprigs',
  'can (13.5 oz)', 'can (15 oz)', 'package', 'packages', 'pkg', 'pkgs', 'bag', 'bags'
]);

/**
 * Normalizes Unicode fractions in a string to standard text fractions (e.g. "½" -> "1/2").
 */
function normalizeUnicodeFractions(str) {
  let normalized = str;
  for (const [unicode, fraction] of Object.entries(UNICODE_FRACTIONS)) {
    normalized = normalized.replace(new RegExp(unicode, 'g'), fraction);
  }
  return normalized;
}

/**
 * Parses a raw ingredient string into { amount, unit, item }.
 * @param {string} rawString 
 * @returns {{ amount: string, unit: string, item: string }}
 */
function parseIngredient(rawString) {
  if (!rawString || typeof rawString !== 'string') {
    return { amount: '', unit: '', item: '' };
  }

  let cleanStr = normalizeUnicodeFractions(rawString.trim());

  // 1. Match Quantity at the beginning of the string
  // Supports: "1", "1.5", "1/2", "1 1/2", "1-1/2", "1 to 2", "1-2"
  const qtyRegex = /^((?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?:\s*(?:to|-)\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?))?)\s*(.*)$/i;
  const qtyMatch = cleanStr.match(qtyRegex);

  let amount = '';
  let rest = cleanStr;

  if (qtyMatch) {
    amount = qtyMatch[1].trim();
    rest = qtyMatch[2].trim();
  }

  // 2. Identify Unit
  // Check if the next word or phrase in 'rest' matches any recognized units
  let unit = '';
  let item = rest;

  // Check parenthetical units first, e.g. "can (13.5 oz)" or "can (15 oz)"
  const parentheticalUnitRegex = /^(can\s*\([^)]+\)|package\s*\([^)]+\)|pkg\s*\([^)]+\))\s+(.*)$/i;
  const parenMatch = rest.match(parentheticalUnitRegex);

  if (parenMatch) {
    unit = parenMatch[1].toLowerCase();
    item = parenMatch[2].trim();
  } else {
    // Check single-word units
    const firstWordMatch = rest.match(/^([a-zA-Z\.]+)\s+(.*)$/);
    if (firstWordMatch) {
      const candidateUnit = firstWordMatch[1].toLowerCase().replace(/[.,]$/, '');
      if (RECOGNIZED_UNITS.has(candidateUnit) || RECOGNIZED_UNITS.has(firstWordMatch[1].toLowerCase())) {
        unit = firstWordMatch[1];
        item = firstWordMatch[2].trim();
      }
    }
  }

  // Standardize the unit if a match is found in UNIT_MAP
  if (unit) {
    const cleanUnit = unit.toLowerCase().trim();
    if (UNIT_MAP[cleanUnit]) {
      unit = UNIT_MAP[cleanUnit];
    } else {
      unit = cleanUnit; // Fallback to lowercased parsed unit
    }
  }

  // If no amount or unit was found, the whole string is the item
  if (!amount && !unit) {
    item = rawString.trim();
  }

  return {
    amount: amount || '',
    unit: unit || '',
    item: item || ''
  };
}

module.exports = {
  parseIngredient,
  normalizeUnicodeFractions
};
