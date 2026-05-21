const { parseIngredient } = require('./ingredientParser');
const { mapStepsToIngredients } = require('./stepIngredientMapper');

/**
 * Generates a clean kebab-case slug from a title string.
 */
function slugify(text) {
  if (!text) return 'extracted-recipe';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

/**
 * Estimates difficulty based on number of instruction steps.
 */
function estimateDifficulty(instructionsCount) {
  if (instructionsCount <= 4) return 'Easy';
  if (instructionsCount <= 9) return 'Medium';
  return 'Hard';
}

/**
 * Standardizes time strings (e.g. "15 minutes" -> "15 mins")
 */
function normalizeTime(timeStr, defaultTime) {
  if (!timeStr) return defaultTime;
  
  let cleaned = timeStr.toString().toLowerCase().trim();
  cleaned = cleaned.replace(/\bminutes\b/g, 'mins');
  cleaned = cleaned.replace(/\bminute\b/g, 'min');
  cleaned = cleaned.replace(/\bhours\b/g, 'hrs');
  cleaned = cleaned.replace(/\bhour\b/g, 'hr');
  
  return cleaned;
}

/**
 * Common named HTML entities to their decoded characters.
 * Case-sensitive mappings.
 */
const NAMED_ENTITIES = {
  // Markup & Quotes
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  
  // Punctuation & Layout
  '&ndash;': '\u2013',
  '&mdash;': '\u2014',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&bull;': '\u2022',
  '&hellip;': '\u2026',
  
  // Kitchen/Recipe Units & Math
  '&deg;': '\u00B0',
  '&frac12;': '\u00BD',
  '&frac14;': '\u00BC',
  '&frac34;': '\u00BE',
  '&times;': '\u00D7', // × (multiplication/dimensions)
  '&divide;': '\u00F7', // ÷
  
  // Common Accented Culinary Characters (Lowercase)
  '&aacute;': 'á',
  '&agrave;': 'à',
  '&acirc;': 'â',
  '&auml;': 'ä',
  '&ccedil;': 'ç',
  '&eacute;': 'é',
  '&egrave;': 'è',
  '&ecirc;': 'ê',
  '&euml;': 'ë',
  '&iacute;': 'í',
  '&igrave;': 'ì',
  '&icirc;': 'î',
  '&iuml;': 'ï',
  '&ntilde;': 'ñ',
  '&oacute;': 'ó',
  '&ograve;': 'ò',
  '&ocirc;': 'ô',
  '&ouml;': 'ö',
  '&uacute;': 'ú',
  '&ugrave;': 'ù',
  '&ucirc;': 'û',
  '&uuml;': 'ü',
  
  // Common Accented Culinary Characters (Uppercase)
  '&Aacute;': 'Á',
  '&Agrave;': 'À',
  '&Acirc;': 'Â',
  '&Auml;': 'Ä',
  '&Ccedil;': 'Ç',
  '&Eacute;': 'É',
  '&Egrave;': 'È',
  '&Ecirc;': 'Ê',
  '&Euml;': 'Ë',
  '&Iacute;': 'Í',
  '&Igrave;': 'Ì',
  '&Icirc;': 'Î',
  '&Iuml;': 'Ï',
  '&Ntilde;': 'Ñ',
  '&Oacute;': 'Ó',
  '&Ograve;': 'Ò',
  '&Ocirc;': 'Ô',
  '&Ouml;': 'Ö',
  '&Uacute;': 'Ú',
  '&Ugrave;': 'Ù',
  '&Ucirc;': 'Û',
  '&Uuml;': 'Ü'
};

/**
 * Decodes HTML entities in a string:
 *  - Numeric decimal (&#8211;)
 *  - Numeric hex (&#x2013;)
 *  - Common named entities (&amp;, &ndash;, etc.)
 */
function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str;

  // 1. Replace numeric decimal entities: &#NNN;
  let decoded = str.replace(/&#(\d+);/g, (match, code) => {
    try {
      return String.fromCodePoint(parseInt(code, 10));
    } catch (e) {
      return match;
    }
  });

  // 2. Replace numeric hex entities: &#xHHH;
  decoded = decoded.replace(/&#[xX]([0-9a-fA-F]+);/g, (match, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch (e) {
      return match;
    }
  });

  // 3. Replace common named entities (case-sensitive)
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    decoded = decoded.replace(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), char);
  }

  return decoded;
}

/**
 * Recursively decodes HTML entities in an object, array, or string.
 */
function deepCleanHtmlEntities(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return decodeHtmlEntities(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepCleanHtmlEntities(item));
  }
  
  if (typeof obj === 'object') {
    if (Object.prototype.toString.call(obj) === '[object Object]') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = deepCleanHtmlEntities(value);
      }
      return cleaned;
    }
    return obj;
  }
  
  return obj;
}

/**
 * Maps raw parsed intermediate recipe data to the strict Recifree JSON Schema.
 * @param {object} rawData 
 * @returns {object} Final Recifree-schema compliant recipe object
 */
function mapToRecifreeSchema(rawData) {
  rawData = deepCleanHtmlEntities(rawData);
  const title = rawData.title ? rawData.title.trim() : 'Extracted Recipe';
  const id = slugify(title);
  
  // 1. Process Ingredients: convert raw strings to structured objects
  let parsedIngredients = [];
  if (Array.isArray(rawData.ingredients)) {
    parsedIngredients = rawData.ingredients.map(ing => {
      if (typeof ing === 'string') {
        return parseIngredient(ing);
      } else if (ing && typeof ing === 'object') {
        // If it's already an object, ensure it has all keys
        return {
          amount: ing.amount || '',
          unit: ing.unit || '',
          item: ing.item || ''
        };
      }
      return { amount: '', unit: '', item: '' };
    });
  }

  // 2. Process Instructions
  const instructions = Array.isArray(rawData.instructions)
    ? rawData.instructions.map(step => step.trim()).filter(Boolean)
    : [];

  // 3. Estimate times and difficulty
  const prepTime = normalizeTime(rawData.prepTime, '15 mins');
  const cookTime = normalizeTime(rawData.cookTime, '20 mins');
  const totalTime = normalizeTime(rawData.totalTime, '35 mins');
  const difficulty = rawData.difficulty || estimateDifficulty(instructions.length);

  // 4. Generate stepIngredients mapping
  const stepIngredients = mapStepsToIngredients(instructions, parsedIngredients);

  // 5. Source metadata
  const source = {
    name: rawData.source?.name ? rawData.source.name.trim() : 'Original Source',
    url: rawData.source?.url ? rawData.source.url.trim() : ''
  };

  // 6. Nutrition normalization
  const rawNutrition = rawData.nutrition || {};
  let calories = null;
  if (rawNutrition.calories) {
    calories = parseInt(rawNutrition.calories.toString().replace(/[^\d]/g, ''), 10) || null;
  }

  const nutrition = {
    calories: calories,
    protein: rawNutrition.protein || rawNutrition.proteinContent || '',
    carbs: rawNutrition.carbs || rawNutrition.carbohydrateContent || '',
    fat: rawNutrition.fat || rawNutrition.fatContent || ''
  };

  // 7. Assemble tags
  let tags = [];
  if (Array.isArray(rawData.tags)) {
    tags = rawData.tags.map(t => t.trim()).filter(Boolean);
  } else {
    // Infer default tags based on title/ingredients
    tags.push('Dinner');
    if (title.toLowerCase().includes('soup')) tags.push('Soup');
    if (title.toLowerCase().includes('salad')) tags.push('Salad');
    if (title.toLowerCase().includes('chicken')) tags.push('Chicken');
    if (title.toLowerCase().includes('vegan') || title.toLowerCase().includes('vegetarian')) tags.push('Vegetarian');
  }

  return {
    id,
    title,
    description: rawData.description ? rawData.description.trim() : `A delicious recipe for ${title}.`,
    image: rawData.image || '', // Image URL from source (Task 4 will generate Imagen representation)
    prepTime,
    cookTime,
    totalTime,
    servings: parseInt(rawData.servings, 10) || 4,
    difficulty,
    tags,
    ingredients: parsedIngredients,
    instructions,
    stepIngredients,
    source,
    nutrition
  };
}

module.exports = {
  mapToRecifreeSchema,
  slugify,
  decodeHtmlEntities,
  deepCleanHtmlEntities
};
