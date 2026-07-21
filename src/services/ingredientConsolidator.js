export function normalizeIngredientName(name) {
  if (!name) return '';
  let normalized = name.toLowerCase().trim().replace(/\s+/g, ' ');
  
  const noStrip = ['hummus', 'molasses', 'couscous', 'lemongrass', 'watercress', 'citrus', 'peas'];
  
  if (normalized.endsWith('s') && !normalized.endsWith('ss') && !normalized.endsWith('us')) {
    const isException = noStrip.some(exc => normalized === exc || normalized.endsWith(' ' + exc));
    if (!isException) {
      normalized = normalized.slice(0, -1);
    }
  }
  
  return normalized;
}

export function parseAmount(amountStr) {
  if (!amountStr || typeof amountStr !== 'string') return typeof amountStr === 'number' ? amountStr : null;
  
  let str = amountStr.trim().toLowerCase();
  if (str === '') return null;
  
  // Handle ranges, take the upper bound
  if (str.includes('-')) {
    const parts = str.split('-');
    str = parts[parts.length - 1].trim();
  }
  
  // Handle unicode fractions
  const unicodeFractions = {
    '½': 0.5,
    '¼': 0.25,
    '¾': 0.75,
    '⅓': 1/3,
    '⅔': 2/3,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
  };
  
  let total = 0;
  let hasNumber = false;
  
  // Check if string contains unicode fraction
  for (const [char, val] of Object.entries(unicodeFractions)) {
    if (str.includes(char)) {
      total += val;
      str = str.replace(char, '').trim();
      hasNumber = true;
    }
  }
  
  if (str === '' && hasNumber) return total;
  
  // Handle space-separated mixed fractions like "1 1/2"
  const spaceParts = str.split(/\s+/);
  for (const part of spaceParts) {
    if (part.includes('/')) {
      const [num, den] = part.split('/');
      const n = parseFloat(num);
      const d = parseFloat(den);
      if (!isNaN(n) && !isNaN(d) && d !== 0) {
        total += n / d;
        hasNumber = true;
      }
    } else {
      const num = parseFloat(part);
      if (!isNaN(num)) {
        total += num;
        hasNumber = true;
      }
    }
  }
  
  return hasNumber ? total : null;
}

export function normalizeUnit(unit) {
  if (!unit) return '';
  const normalized = unit.toLowerCase().trim();
  
  const mappings = {
    'tsp': 'teaspoon',
    't': 'teaspoon',
    'teaspoon': 'teaspoon',
    'teaspoons': 'teaspoon',
    
    'tbsp': 'tablespoon',
    'tbs': 'tablespoon',
    'tablespoon': 'tablespoon',
    'tablespoons': 'tablespoon',
    
    'c': 'cup',
    'cup': 'cup',
    'cups': 'cup',
    
    'oz': 'ounce',
    'ounce': 'ounce',
    'ounces': 'ounce',
    
    'lb': 'pound',
    'lbs': 'pound',
    'pound': 'pound',
    'pounds': 'pound',
    
    'g': 'gram',
    'gram': 'gram',
    'grams': 'gram',
    
    'kg': 'kilogram',
    'kilogram': 'kilogram',
    'kilograms': 'kilogram',
    
    'ml': 'milliliter',
    'milliliter': 'milliliter',
    'milliliters': 'milliliter',
    
    'l': 'liter',
    'liter': 'liter',
    'liters': 'liter',
    'litre': 'liter',
    'litres': 'liter',
    
    'pt': 'pint',
    'pint': 'pint',
    'pints': 'pint',
    
    'qt': 'quart',
    'quart': 'quart',
    'quarts': 'quart',
    
    'gal': 'gallon',
    'gallon': 'gallon',
    'gallons': 'gallon',
    
    'clove': 'clove',
    'cloves': 'clove',
    
    'can': 'can',
    'cans': 'can',
    
    'bunch': 'bunch',
    'bunches': 'bunch',
    
    'pinch': 'pinch',
    'pinches': 'pinch',
    
    'dash': 'dash',
    'dashes': 'dash',
    
    'whole': 'whole',
    'piece': 'piece',
    'pieces': 'piece',
  };
  
  return mappings[normalized] || normalized;
}

export function convertToBaseUnit(amount, normalizedUnit) {
  if (amount === null || amount === undefined) return { amount, unit: normalizedUnit, baseFamily: null };
  
  // Volume (US) -> teaspoon
  const volumeUS = {
    'teaspoon': 1,
    'tablespoon': 3,
    'cup': 48,
    'pint': 96,
    'quart': 192,
    'gallon': 768
  };
  
  if (volumeUS[normalizedUnit]) {
    return { amount: amount * volumeUS[normalizedUnit], unit: 'teaspoon', baseFamily: 'volumeUS' };
  }
  
  // Volume (Metric) -> milliliter
  const volumeMetric = {
    'milliliter': 1,
    'liter': 1000
  };
  
  if (volumeMetric[normalizedUnit]) {
    return { amount: amount * volumeMetric[normalizedUnit], unit: 'milliliter', baseFamily: 'volumeMetric' };
  }
  
  // Weight (US) -> ounce
  const weightUS = {
    'ounce': 1,
    'pound': 16
  };
  
  if (weightUS[normalizedUnit]) {
    return { amount: amount * weightUS[normalizedUnit], unit: 'ounce', baseFamily: 'weightUS' };
  }
  
  // Weight (Metric) -> gram
  const weightMetric = {
    'gram': 1,
    'kilogram': 1000
  };
  
  if (weightMetric[normalizedUnit]) {
    return { amount: amount * weightMetric[normalizedUnit], unit: 'gram', baseFamily: 'weightMetric' };
  }
  
  return { amount, unit: normalizedUnit, baseFamily: normalizedUnit };
}

export function convertFromBaseUnit(amount, baseUnit) {
  if (amount === null || amount === undefined) return { amount, unit: baseUnit };
  
  const epsilon = 0.01;
  const isClean = (num) => {
    const n = Math.abs(num);
    const diff = n - Math.floor(n);
    // Is it close to an integer, 0.5, 0.25, 0.75, 0.33, 0.66, 0.125, 0.375, 0.625, 0.875
    const cleanFractions = [0, 0.25, 0.5, 0.75, 1/3, 2/3, 0.125, 0.375, 0.625, 0.875, 1];
    return cleanFractions.some(f => Math.abs(diff - f) < epsilon);
  };

  if (baseUnit === 'teaspoon') {
    const gallon = amount / 768;
    if (gallon >= 1 && isClean(gallon)) return { amount: gallon, unit: 'gallon' };
    
    const quart = amount / 192;
    if (quart >= 1 && isClean(quart)) return { amount: quart, unit: 'quart' };
    
    const pint = amount / 96;
    if (pint >= 1 && isClean(pint)) return { amount: pint, unit: 'pint' };
    
    const cups = amount / 48;
    if (cups >= 0.25 && isClean(cups)) return { amount: cups, unit: 'cup' };
    
    const tbsps = amount / 3;
    const isCleanTbsp = Math.abs(tbsps - Math.floor(tbsps)) < epsilon || Math.abs(tbsps - Math.floor(tbsps) - 0.5) < epsilon;
    if (tbsps >= 1 && tbsps < 16 && isCleanTbsp) return { amount: tbsps, unit: 'tablespoon' };
    
    // Fallback for non-clean fractions: prefer decimal cups for grocery lists (e.g. 0.58 cup)
    if (cups >= 0.25) return { amount: cups, unit: 'cup' };
    
    return { amount, unit: 'teaspoon' };
  }
  
  if (baseUnit === 'milliliter') {
    if (amount >= 1000) return { amount: amount / 1000, unit: 'liter' };
    return { amount, unit: 'milliliter' };
  }
  
  if (baseUnit === 'ounce') {
    const lbs = amount / 16;
    if (lbs >= 0.25 && isClean(lbs)) return { amount: lbs, unit: 'pound' };
    if (lbs >= 0.25) return { amount: lbs, unit: 'pound' }; // Prefer decimal pounds over many ounces
    return { amount, unit: 'ounce' };
  }
  
  if (baseUnit === 'gram') {
    if (amount >= 1000) return { amount: amount / 1000, unit: 'kilogram' };
    return { amount, unit: 'gram' };
  }
  
  return { amount, unit: baseUnit };
}

export function formatAmount(decimalAmount) {
  if (decimalAmount === null || decimalAmount === undefined) return '';
  if (typeof decimalAmount !== 'number') return String(decimalAmount);
  
  const epsilon = 0.01;
  const whole = Math.floor(decimalAmount);
  const remainder = decimalAmount - whole;
  
  if (remainder < epsilon) return String(whole);
  
  const fractions = [
    { value: 1/3, str: '⅓' },
    { value: 2/3, str: '⅔' },
    { value: 0.25, str: '¼' },
    { value: 0.5, str: '½' },
    { value: 0.75, str: '¾' },
    { value: 0.125, str: '⅛' },
    { value: 0.375, str: '⅜' },
    { value: 0.625, str: '⅝' },
    { value: 0.875, str: '⅞' }
  ];
  
  let closest = null;
  let minDiff = 1;
  
  for (const frac of fractions) {
    const diff = Math.abs(remainder - frac.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = frac.str;
    }
  }
  
  if (minDiff < epsilon) {
    return whole === 0 ? closest : `${whole}${closest}`;
  }
  
  // If no common fraction is close, return decimal formatted nicely
  return Number(decimalAmount.toFixed(2)).toString();
}

export function getDisplayUnit(canonicalUnit) {
  const displayMap = {
    'teaspoon': 'tsp',
    'tablespoon': 'tbsp',
    'cup': 'cup',
    'ounce': 'oz',
    'pound': 'lb',
    'gram': 'g',
    'kilogram': 'kg',
    'milliliter': 'ml',
    'liter': 'L'
  };
  
  return displayMap[canonicalUnit] || canonicalUnit;
}

export function consolidateIngredients(recipeGroups) {
  if (!recipeGroups || !Array.isArray(recipeGroups)) return [];
  
  const consolidated = new Map();
  
  for (const group of recipeGroups) {
    if (!group.ingredients) continue;
    
    for (const ing of group.ingredients) {
      const ingredientName = ing.item || ing.name;
      if (!ingredientName) continue;
      
      const key = normalizeIngredientName(ingredientName);
      if (!key) continue;
      
      if (!consolidated.has(key)) {
        consolidated.set(key, {
          key,
          displayName: ingredientName.trim(), // Use first casing found
          quantities: [], // Will hold objects with baseAmount, baseFamily, unit (if no family)
          sources: [],
          checked: true // Will be true only if all are true
        });
      }
      
      const entry = consolidated.get(key);
      
      // Update checked state
      if (!ing.checked) {
        entry.checked = false;
      }
      
      // Add source
      entry.sources.push({
        recipeId: group.recipeId || group.id,
        recipeTitle: group.recipeTitle || group.title,
        ingredientId: ing.id,
        originalAmount: ing.amount,
        originalUnit: ing.unit
      });
      
      const numAmount = parseAmount(ing.amount);
      const normUnit = normalizeUnit(ing.unit);
      const baseInfo = convertToBaseUnit(numAmount, normUnit);
      
      const family = baseInfo.baseFamily;
      
      if (numAmount !== null) {
        let existingQty = entry.quantities.find(q => q.family === family);
        if (existingQty) {
          existingQty.amount += baseInfo.amount;
        } else {
          entry.quantities.push({
            family,
            amount: baseInfo.amount,
            baseUnit: baseInfo.unit
          });
        }
      } else {
        // If amount is null, maybe just track it as unit or no amount
        let existingQty = entry.quantities.find(q => q.amount === null && q.baseUnit === baseInfo.unit);
        if (!existingQty) {
           entry.quantities.push({
             family,
             amount: null,
             baseUnit: baseInfo.unit
           });
        }
      }
    }
  }
  
  const result = [];
  
  for (const [key, entry] of consolidated.entries()) {
    const finalQuantities = entry.quantities.map(q => {
      if (q.amount === null) {
        return {
          amount: null,
          displayAmount: '',
          unit: q.baseUnit,
          displayUnit: getDisplayUnit(q.baseUnit)
        };
      }
      
      const converted = convertFromBaseUnit(q.amount, q.baseUnit);
      return {
        amount: converted.amount,
        displayAmount: formatAmount(converted.amount),
        unit: converted.unit,
        displayUnit: getDisplayUnit(converted.unit)
      };
    });
    
    result.push({
      key: entry.key,
      displayName: entry.displayName,
      quantities: finalQuantities,
      sources: entry.sources,
      checked: entry.sources.length > 0 ? entry.checked : false
    });
  }
  
  return result.sort((a, b) => a.key.localeCompare(b.key));
}
