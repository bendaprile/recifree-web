const { parse } = require('node-html-parser');

/**
 * ISO 8601 Duration Parser
 * Converts durations like "PT1H30M" or "PT45M" into "1 hr 30 mins" or "45 mins"
 */
function parseDuration(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return '';

  const regex = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i;
  const match = durationStr.match(regex);

  if (!match) {
    // If it's already a human readable string like "15 minutes" or "1 hour", clean it slightly and return
    return durationStr.replace(/\bminutes\b/i, 'mins').replace(/\bhour\b/i, 'hr').replace(/\bhours\b/i, 'hrs');
  }

  const days = parseInt(match[1] || 0, 10);
  const hours = parseInt(match[2] || 0, 10);
  const minutes = parseInt(match[3] || 0, 10);

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);

  return parts.join(' ') || '';
}

/**
 * Recursively extracts instruction strings from schema.org recipeInstructions structure.
 * Handles strings, HowToStep objects, and nested HowToSection objects.
 */
function extractInstructions(instructions) {
  if (!instructions) return [];
  if (typeof instructions === 'string') {
    // Sometimes it's a single massive string separated by newlines
    return instructions.split('\n').map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(instructions)) {
    return [];
  }

  const list = [];
  for (const item of instructions) {
    if (typeof item === 'string') {
      list.push(item.trim());
    } else if (item && typeof item === 'object') {
      const type = item['@type'];
      if (type === 'HowToStep') {
        const text = item.text || item.description || '';
        if (text) list.push(text.trim());
      } else if (type === 'HowToSection') {
        // If it's a section, recurse into its items (usually under itemListElement)
        const subSteps = extractInstructions(item.itemListElement || item.recipeInstructions);
        list.push(...subSteps);
      } else if (item.text) {
        list.push(item.text.trim());
      }
    }
  }
  return list.filter(Boolean);
}

/**
 * Extracts a single clean image URL from the schema image field.
 * Handles strings, arrays, and nested objects.
 */
function extractImage(imageField) {
  if (!imageField) return '';
  if (typeof imageField === 'string') return imageField;
  if (Array.isArray(imageField)) {
    // Prefer larger sizes or just take the first
    return extractImage(imageField[0]);
  }
  if (typeof imageField === 'object') {
    return imageField.url || '';
  }
  return '';
}

/**
 * Parses the yield/servings count from recipeYield field.
 */
function parseServings(yieldField) {
  if (!yieldField) return null;
  if (typeof yieldField === 'number') return yieldField;
  
  let val = yieldField;
  if (Array.isArray(yieldField)) {
    val = yieldField[0];
  }
  
  if (typeof val === 'string') {
    const match = val.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

/**
 * Traverses a JSON object/array to find any object with @type = "Recipe"
 */
function findRecipeInJson(obj) {
  if (!obj || typeof obj !== 'object') return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findRecipeInJson(item);
      if (found) return found;
    }
    return null;
  }

  // Check if this object is a Recipe
  const type = obj['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    return obj;
  }

  // Check @graph array
  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    const found = findRecipeInJson(obj['@graph']);
    if (found) return found;
  }

  // Recursively search all properties
  for (const key of Object.keys(obj)) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = findRecipeInJson(obj[key]);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Parses HTML to extract recipe data from ld+json script tags.
 * @param {string} htmlText 
 * @returns {object|null} Raw recipe object from schema, or null if not found
 */
function parseLdJson(htmlText) {
  if (!htmlText) return null;

  const root = parse(htmlText);
  const scriptTags = root.querySelectorAll('script[type="application/ld+json"]');

  for (const tag of scriptTags) {
    try {
      const json = JSON.parse(tag.innerHTML.trim());
      const recipeSchema = findRecipeInJson(json);
      
      if (recipeSchema) {
        // Map the fields from schema.org Recipe format to an intermediate format
        return {
          title: recipeSchema.name || '',
          description: recipeSchema.description || '',
          ingredients: recipeSchema.recipeIngredient || [],
          instructions: extractInstructions(recipeSchema.recipeInstructions),
          prepTime: parseDuration(recipeSchema.prepTime),
          cookTime: parseDuration(recipeSchema.cookTime),
          totalTime: parseDuration(recipeSchema.totalTime),
          servings: parseServings(recipeSchema.recipeYield || recipeSchema.yield),
          image: extractImage(recipeSchema.image),
          nutrition: recipeSchema.nutrition || null,
          source: {
            name: recipeSchema.author?.name || '',
            url: '' // Will be populated by the caller
          }
        };
      }
    } catch (e) {
      // Ignore parsing errors on individual script tags and continue
      console.warn('Error parsing single ld+json script block:', e.message);
    }
  }

  return null;
}

module.exports = {
  parseLdJson,
  parseDuration,
  extractInstructions,
  extractImage,
  parseServings
};
