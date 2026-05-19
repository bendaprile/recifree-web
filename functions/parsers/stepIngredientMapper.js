/**
 * Step-Ingredient Mapper Utility
 * Heuristically maps ingredient indices to instruction steps by scanning
 * the step description text for matches against ingredient item names.
 */

// Common cooking words and descriptors to strip when matching ingredients
const STOP_WORDS = new Set([
  'diced', 'chopped', 'sliced', 'organic', 'fresh', 'freshly', 'dry', 'dried',
  'large', 'medium', 'small', 'divided', 'minced', 'grated', 'ground',
  'powdered', 'crushed', 'sifted', 'to taste', 'optional', 'plus more',
  'kosher', 'sea', 'fine', 'coarse', 'melted', 'cold', 'warm', 'hot',
  'halved', 'peeled', 'seeded', 'shredded', 'cubed', 'drained', 'rinsed',
  'boneless', 'skinless', 'thawed', 'cooked', 'raw', 'extra-virgin',
  'extra virgin', 'extra', 'virgin', 'unsalted', 'salted', 'pure', 'plain',
  'whole', 'black', 'white', 'yellow', 'red', 'green', 'sweet'
]);

/**
 * Escapes special characters for use in a Regular Expression
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizes an ingredient item name to make it suitable for keyword matching.
 * E.g., "onion, diced" -> "onion", "kosher salt (plus more)" -> "salt"
 */
function cleanItemNameForMatching(item) {
  if (!item) return '';

  let clean = item.toLowerCase();

  // Remove content in parentheses
  clean = clean.replace(/\([^)]*\)/g, ' ');

  // Remove anything after a comma (commonly "diced", "chopped", etc.)
  if (clean.includes(',')) {
    clean = clean.split(',')[0];
  }

  // Remove common cooking stop words
  const words = clean.split(/[\s\-]+/);
  const filteredWords = words.filter(word => {
    const w = word.trim().replace(/[^a-z]/g, '');
    return w.length > 0 && !STOP_WORDS.has(w);
  });

  // Reassemble clean name
  let cleaned = filteredWords.join(' ').trim();

  // Standardize common ingredient terms if they are empty or too generic
  if (cleaned === 'black pepper' || cleaned === 'white pepper') {
    cleaned = 'pepper';
  }
  if (cleaned === 'kosher salt' || cleaned === 'sea salt') {
    cleaned = 'salt';
  }

  // Fallback to original item if we filtered everything out
  return cleaned || item.toLowerCase();
}

/**
 * Maps flat ingredients list to instructions step by step.
 * @param {Array<string>} instructions 
 * @param {Array<{item: string}>} flatIngredients 
 * @returns {Array<Array<number>>} 2D array of ingredient indices per instruction step
 */
function mapStepsToIngredients(instructions, flatIngredients) {
  if (!instructions || !Array.isArray(instructions) || !flatIngredients || !Array.isArray(flatIngredients)) {
    return [];
  }

  // Clean all ingredient items first
  const cleanedIngredients = flatIngredients.map((ing, index) => {
    return {
      index,
      original: ing.item,
      cleaned: cleanItemNameForMatching(ing.item)
    };
  });

  return instructions.map(step => {
    const stepText = step.toLowerCase();
    const matches = new Set();

    cleanedIngredients.forEach(ing => {
      if (!ing.cleaned) return;

      // 1. Check exact sub-phrase match first
      // E.g. "olive oil" matches "heat olive oil in a pan"
      const exactRegex = new RegExp('\\b' + escapeRegExp(ing.cleaned) + '\\b', 'i');
      if (exactRegex.test(stepText)) {
        matches.add(ing.index);
        return;
      }

      // 2. If it's a multi-word ingredient, check if the key nouns are mentioned.
      // E.g., "bell peppers" -> if step mentions "peppers", match it.
      // E.g., "chicken thighs" -> if step mentions "chicken", match it.
      const words = ing.cleaned.split(/\s+/).filter(w => w.length > 3);
      if (words.length > 1) {
        // Check if any of the key words are mentioned with word boundaries
        const matchedWord = words.some(word => {
          // Avoid matching extremely generic words like "broth", "water", "sauce" if they are part of other things,
          // but for things like "chicken", "beef", "peppers", "onion", it's a good match.
          const wordRegex = new RegExp('\\b' + escapeRegExp(word) + '\\b', 'i');
          return wordRegex.test(stepText);
        });

        if (matchedWord) {
          matches.add(ing.index);
        }
      }
    });

    return Array.from(matches).sort((a, b) => a - b);
  });
}

module.exports = {
  mapStepsToIngredients,
  cleanItemNameForMatching
};
