const { parse } = require('node-html-parser');

/**
 * Clean text by stripping HTML tags and collapsing whitespace.
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Heuristically parses HTML for generic lists when no specific plugins are found.
 * Looks for headings containing "ingredient" or "instruction/direction/step" and captures their list siblings.
 */
function parseGenericHeuristics(root) {
  const result = {
    title: '',
    ingredients: [],
    instructions: []
  };

  // 1. Try to find Title
  const h1 = root.querySelector('h1');
  if (h1) {
    result.title = cleanText(h1.innerText);
  }

  // 2. Find Ingredients
  const headings = root.querySelectorAll('h1, h2, h3, h4');
  let ingredientsHeader = null;
  let instructionsHeader = null;

  for (const h of headings) {
    const text = h.innerText.toLowerCase().trim();
    if (!ingredientsHeader && (text === 'ingredients' || text.includes('ingredient list') || text.includes('what you need'))) {
      ingredientsHeader = h;
    }
    if (!instructionsHeader && (text === 'instructions' || text === 'directions' || text === 'preparation' || text.includes('how to make') || text.includes('method') || text === 'steps')) {
      instructionsHeader = h;
    }
  }

  // Helper to extract list items from next sibling lists
  function extractListFromSibling(headerEl) {
    if (!headerEl) return [];
    let sibling = headerEl.nextElementSibling;
    
    // Scan up to 4 siblings to find a list (ul or ol)
    for (let i = 0; i < 4 && sibling; i++) {
      const tagName = sibling.tagName.toLowerCase();
      if (tagName === 'ul' || tagName === 'ol') {
        return sibling.querySelectorAll('li').map(li => cleanText(li.innerText)).filter(Boolean);
      }
      
      // Sometimes list items are just div elements with a specific class or checkboxes
      const listItems = sibling.querySelectorAll('li');
      if (listItems.length > 0) {
        return listItems.map(li => cleanText(li.innerText)).filter(Boolean);
      }
      
      sibling = sibling.nextElementSibling;
    }
    return [];
  }

  if (ingredientsHeader) {
    result.ingredients = extractListFromSibling(ingredientsHeader);
  }

  if (instructionsHeader) {
    result.instructions = extractListFromSibling(instructionsHeader);
  }

  return result;
}

/**
 * Main Heuristic HTML Parser
 * @param {string} htmlText 
 * @returns {object|null} Parsed intermediate recipe data or null
 */
function parseHeuristics(htmlText) {
  if (!htmlText) return null;

  const root = parse(htmlText);
  let parsed = null;

  // 1. WP Recipe Maker (WPRM) Detection
  const wprmContainer = root.querySelector('.wprm-recipe-container');
  if (wprmContainer) {
    const titleEl = wprmContainer.querySelector('.wprm-recipe-name');
    const descEl = wprmContainer.querySelector('.wprm-recipe-summary');
    const prepEl = wprmContainer.querySelector('.wprm-recipe-prep_time');
    const cookEl = wprmContainer.querySelector('.wprm-recipe-cook_time');
    const totalEl = wprmContainer.querySelector('.wprm-recipe-total_time');
    const servingsEl = wprmContainer.querySelector('.wprm-recipe-servings');
    
    const ingredients = wprmContainer.querySelectorAll('.wprm-recipe-ingredient')
      .map(el => cleanText(el.innerText))
      .filter(Boolean);
      
    const instructions = wprmContainer.querySelectorAll('.wprm-recipe-instruction')
      .map(el => cleanText(el.innerText))
      .filter(Boolean);

    parsed = {
      title: titleEl ? cleanText(titleEl.innerText) : '',
      description: descEl ? cleanText(descEl.innerText) : '',
      prepTime: prepEl ? cleanText(prepEl.innerText) : '',
      cookTime: cookEl ? cleanText(cookEl.innerText) : '',
      totalTime: totalEl ? cleanText(totalEl.innerText) : '',
      servings: servingsEl ? parseInt(cleanText(servingsEl.innerText), 10) || null : null,
      ingredients,
      instructions
    };
  }

  // 2. Tasty Recipes Detection
  if (!parsed) {
    const tastyContainer = root.querySelector('.tasty-recipes');
    if (tastyContainer) {
      const titleEl = tastyContainer.querySelector('.tasty-recipes-title-link, .tasty-recipes-entry-header h2, h2');
      const descEl = tastyContainer.querySelector('.tasty-recipes-description-body, .tasty-recipes-description');
      const prepEl = tastyContainer.querySelector('.tasty-recipes-prep-time');
      const cookEl = tastyContainer.querySelector('.tasty-recipes-cook-time');
      const totalEl = tastyContainer.querySelector('.tasty-recipes-total-time');
      const servingsEl = tastyContainer.querySelector('.tasty-recipes-yield');

      const ingredients = tastyContainer.querySelectorAll('.tasty-recipes-ingredients ul li, .tasty-recipes-ingredients li')
        .map(el => cleanText(el.innerText))
        .filter(Boolean);

      const instructions = tastyContainer.querySelectorAll('.tasty-recipes-instructions ol li, .tasty-recipes-instructions li')
        .map(el => cleanText(el.innerText))
        .filter(Boolean);

      parsed = {
        title: titleEl ? cleanText(titleEl.innerText) : '',
        description: descEl ? cleanText(descEl.innerText) : '',
        prepTime: prepEl ? cleanText(prepEl.innerText) : '',
        cookTime: cookEl ? cleanText(cookEl.innerText) : '',
        totalTime: totalEl ? cleanText(totalEl.innerText) : '',
        servings: servingsEl ? parseInt(cleanText(servingsEl.innerText), 10) || null : null,
        ingredients,
        instructions
      };
    }
  }

  // 3. Create by Mediavine Detection
  if (!parsed) {
    const mvContainer = root.querySelector('.mv-create-card');
    if (mvContainer) {
      const titleEl = mvContainer.querySelector('.mv-create-title');
      const descEl = mvContainer.querySelector('.mv-create-description');
      const prepEl = mvContainer.querySelector('.mv-create-time-prep .mv-create-time-format');
      const cookEl = mvContainer.querySelector('.mv-create-time-active .mv-create-time-format');
      const totalEl = mvContainer.querySelector('.mv-create-time-total .mv-create-time-format');
      const servingsEl = mvContainer.querySelector('.mv-create-yield .mv-create-time-format');

      const ingredients = mvContainer.querySelectorAll('.mv-create-ingredients li')
        .map(el => cleanText(el.innerText))
        .filter(Boolean);

      const instructions = mvContainer.querySelectorAll('.mv-create-instructions li')
        .map(el => cleanText(el.innerText))
        .filter(Boolean);

      parsed = {
        title: titleEl ? cleanText(titleEl.innerText) : '',
        description: descEl ? cleanText(descEl.innerText) : '',
        prepTime: prepEl ? cleanText(prepEl.innerText) : '',
        cookTime: cookEl ? cleanText(cookEl.innerText) : '',
        totalTime: totalEl ? cleanText(totalEl.innerText) : '',
        servings: servingsEl ? parseInt(cleanText(servingsEl.innerText), 10) || null : null,
        ingredients,
        instructions
      };
    }
  }

  // 4. Generic Heuristic Fallback
  if (!parsed) {
    const generic = parseGenericHeuristics(root);
    if (generic.ingredients.length > 0 || generic.instructions.length > 0) {
      parsed = {
        title: generic.title,
        description: '',
        prepTime: '',
        cookTime: '',
        totalTime: '',
        servings: null,
        ingredients: generic.ingredients,
        instructions: generic.instructions
      };
    }
  }

  // Return parsed data if substantial
  if (parsed && (parsed.title || parsed.ingredients.length > 0 || parsed.instructions.length > 0)) {
    return parsed;
  }

  return null;
}

module.exports = {
  parseHeuristics
};
