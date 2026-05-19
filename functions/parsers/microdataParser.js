const { parse } = require('node-html-parser');
const { parseDuration, parseServings, extractImage } = require('./ldJsonParser');

/**
 * Helper to get the value of a microdata element based on its HTML tag
 */
function getMicrodataValue(el) {
  if (!el) return '';

  const tagName = el.tagName.toLowerCase();
  
  if (tagName === 'meta') {
    return el.getAttribute('content') || '';
  }
  if (tagName === 'audio' || tagName === 'embed' || tagName === 'iframe' || tagName === 'img' || tagName === 'source' || tagName === 'track' || tagName === 'video') {
    return el.getAttribute('src') || '';
  }
  if (tagName === 'a' || tagName === 'area' || tagName === 'link') {
    return el.getAttribute('href') || '';
  }
  if (tagName === 'object') {
    return el.getAttribute('data') || '';
  }
  if (tagName === 'time') {
    return el.getAttribute('datetime') || el.innerText.trim();
  }

  // Fallback to text content
  return el.innerText.trim();
}

/**
 * Parses HTML to extract recipe data from Microdata format.
 * @param {string} htmlText 
 * @returns {object|null} Raw recipe object, or null if not found
 */
function parseMicrodata(htmlText) {
  if (!htmlText) return null;

  const root = parse(htmlText);
  // Look for itemscope with a Recipe type (schema.org/Recipe)
  const recipeContainers = root.querySelectorAll('[itemscope]');
  
  let recipeContainer = null;
  for (const container of recipeContainers) {
    const itemtype = container.getAttribute('itemtype') || '';
    if (itemtype.includes('schema.org/Recipe') || itemtype.includes('schema.org/recipe')) {
      recipeContainer = container;
      break;
    }
  }

  if (!recipeContainer) {
    return null;
  }

  const result = {
    title: '',
    description: '',
    ingredients: [],
    instructions: [],
    prepTime: '',
    cookTime: '',
    totalTime: '',
    servings: null,
    image: '',
    nutrition: null,
    source: { name: '', url: '' }
  };

  const itempropElements = recipeContainer.querySelectorAll('[itemprop]');
  
  // Keep track of instructions items so we can sort/group them if they're separate tags
  const rawInstructions = [];

  for (const el of itempropElements) {
    const itemprop = el.getAttribute('itemprop');
    const value = getMicrodataValue(el);

    if (!itemprop || !value) continue;

    switch (itemprop.toLowerCase()) {
      case 'name':
        // Only set title if not already set (in case of nested microdata like Author)
        if (!result.title) result.title = value;
        break;
      case 'description':
        if (!result.description) result.description = value;
        break;
      case 'recipeingredient':
      case 'ingredients':
        result.ingredients.push(value);
        break;
      case 'recipeinstructions':
      case 'instruction':
        rawInstructions.push(value);
        break;
      case 'preptime':
        result.prepTime = parseDuration(value);
        break;
      case 'cooktime':
        result.cookTime = parseDuration(value);
        break;
      case 'totaltime':
        result.totalTime = parseDuration(value);
        break;
      case 'recipeyield':
      case 'yield':
        result.servings = parseServings(value);
        break;
      case 'image':
        if (!result.image) result.image = value;
        break;
      case 'author':
        // Try to get author name from nested microdata, otherwise use text value
        const authorNameEl = el.querySelector('[itemprop="name"]');
        result.source.name = authorNameEl ? authorNameEl.innerText.trim() : value;
        break;
    }
  }

  // Populate instructions
  if (rawInstructions.length > 0) {
    result.instructions = rawInstructions;
  }

  // Check if we extracted anything substantial
  if (result.title || result.ingredients.length > 0 || result.instructions.length > 0) {
    return result;
  }

  return null;
}

module.exports = {
  parseMicrodata
};
