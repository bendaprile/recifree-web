/**
 * Ingredient Categorization Utilities
 * Maps ingredients to grocery store aisles/categories
 */

/**
 * Category definitions with keywords for matching
 */
export const CATEGORIES = [
    {
        id: 'produce',
        name: 'Produce',
        icon: '🥬',
        keywords: [
            'onion', 'garlic', 'carrot', 'celery', 'pepper', 'bell pepper',
            'tomato', 'lettuce', 'spinach', 'kale', 'leek', 'potato',
            'squash', 'zucchini', 'mushroom', 'ginger', 'cilantro', 'parsley',
            'basil', 'thyme', 'rosemary', 'mint', 'dill', 'chive',
            'lemon', 'lime', 'orange', 'apple', 'berry', 'banana', 'avocado',
            'broccoli', 'cauliflower', 'cabbage', 'corn', 'peas', 'cucumber',
            'jalapeño', 'jalapeno', 'serrano', 'habanero', 'chili', 'chile',
            'scallion', 'shallot', 'green onion', 'spring onion',
            'arugula', 'romaine', 'chard', 'bok choy', 'asparagus',
            'eggplant', 'radish', 'turnip', 'beet', 'sweet potato', 'yam'
        ]
    },
    {
        id: 'meat',
        name: 'Meat & Seafood',
        icon: '🍗',
        keywords: [
            'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal',
            'salmon', 'shrimp', 'fish', 'tuna', 'cod', 'tilapia', 'halibut',
            'sausage', 'bacon', 'ham', 'prosciutto', 'pancetta',
            'ground', 'steak', 'thigh', 'breast', 'tenderloin', 'ribs',
            'drumstick', 'wing', 'chop', 'roast', 'filet', 'fillet',
            'meatball', 'patty', 'crab', 'lobster', 'scallop', 'mussel', 'clam'
        ]
    },
    {
        id: 'dairy',
        name: 'Dairy & Eggs',
        icon: '🥛',
        keywords: [
            'milk', 'cream', 'half and half', 'half-and-half',
            'cheese', 'butter', 'yogurt', 'egg', 'eggs',
            'sour cream', 'crème fraîche', 'creme fraiche',
            'feta', 'parmesan', 'mozzarella', 'cheddar', 'ricotta',
            'goat cheese', 'cream cheese', 'cottage cheese', 'brie', 'gouda',
            'whipping cream', 'heavy cream', 'buttermilk'
        ]
    },
    {
        id: 'pantry',
        name: 'Pantry',
        icon: '🥫',
        keywords: [
            'broth', 'stock', 'oil', 'olive oil', 'vegetable oil', 'sesame oil',
            'vinegar', 'sauce', 'paste', 'tomato paste', 'tomato sauce',
            'flour', 'sugar', 'brown sugar', 'powdered sugar',
            'salt', 'pepper', 'black pepper', 'kosher salt', 'sea salt',
            'cumin', 'paprika', 'turmeric', 'cinnamon', 'nutmeg', 'oregano',
            'chili powder', 'cayenne', 'curry', 'garam masala', 'coriander',
            'honey', 'maple syrup', 'molasses', 'agave',
            'rice', 'pasta', 'noodle', 'orzo', 'quinoa', 'couscous', 'farro',
            'lentil', 'chickpea', 'bean', 'black bean', 'kidney bean', 'white bean',
            'coconut milk', 'diced tomatoes', 'crushed tomatoes',
            'soy sauce', 'worcestershire', 'fish sauce', 'hoisin',
            'mustard', 'ketchup', 'mayo', 'mayonnaise',
            'breadcrumb', 'panko', 'cornstarch', 'baking powder', 'baking soda',
            'vanilla', 'cocoa', 'chocolate', 'peanut butter', 'almond butter',
            'nuts', 'almond', 'walnut', 'pecan', 'cashew', 'peanut', 'pistachio',
            'dried', 'raisin', 'cranberry', 'apricot'
        ]
    },
    {
        id: 'frozen',
        name: 'Frozen',
        icon: '🧊',
        keywords: ['frozen']
    },
    {
        id: 'bakery',
        name: 'Bakery & Bread',
        icon: '🍞',
        keywords: [
            'bread', 'tortilla', 'bun', 'roll', 'pita', 'naan', 'wrap',
            'bagel', 'croissant', 'english muffin', 'flatbread', 'ciabatta',
            'baguette', 'sourdough', 'rye'
        ]
    },
    {
        id: 'other',
        name: 'Other',
        icon: '📦',
        keywords: [] // Fallback category
    }
];

/**
 * Normalize an ingredient item name for comparison/aggregation
 * Removes prep instructions, plurals, and standardizes case
 * @param {string} itemName - The ingredient item field
 * @returns {string} - Normalized name
 */
export function normalizeItemName(itemName) {
    if (!itemName) return '';

    let normalized = itemName.toLowerCase().trim();

    // Remove common prep instructions (after comma or in parentheses)
    normalized = normalized.split(',')[0].trim();
    normalized = normalized.replace(/\(.*?\)/g, '').trim();

    // Remove common prep words
    const prepWords = [
        'diced', 'chopped', 'minced', 'sliced', 'crushed', 'grated',
        'shredded', 'julienned', 'cubed', 'quartered', 'halved',
        'fresh', 'dried', 'ground', 'whole', 'peeled', 'seeded',
        'thinly', 'finely', 'roughly', 'coarsely', 'to taste'
    ];

    prepWords.forEach(word => {
        normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    });

    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

/**
 * Determine the category for an ingredient
 * @param {string} itemName - The ingredient item field
 * @returns {Object} - The matching category object
 */
export function categorizeIngredient(itemName) {
    if (!itemName) return CATEGORIES.find(c => c.id === 'other');

    const normalizedName = normalizeItemName(itemName);

    // Check each category (except 'other' which is fallback)
    for (const category of CATEGORIES) {
        if (category.id === 'other') continue;

        for (const keyword of category.keywords) {
            // Check if keyword appears as a word boundary match
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(normalizedName) || regex.test(itemName.toLowerCase())) {
                return category;
            }
        }
    }

    // Default to 'other'
    return CATEGORIES.find(c => c.id === 'other');
}

/**
 * Group a flat array of ingredients by category
 * @param {Array} ingredients - Array of ingredient objects with { item, amount, unit, checked, id, recipeId, recipeTitle }
 * @returns {Object} - Object keyed by category id with arrays of ingredients
 */
export function groupByCategory(ingredients) {
    const grouped = {};

    // Initialize all categories
    CATEGORIES.forEach(cat => {
        grouped[cat.id] = {
            ...cat,
            items: []
        };
    });

    // Categorize each ingredient
    ingredients.forEach(ing => {
        const category = categorizeIngredient(ing.item);
        grouped[category.id].items.push(ing);
    });

    // Remove empty categories (except we might want to keep them for consistency)
    // For now, filter them out
    const result = {};
    CATEGORIES.forEach(cat => {
        if (grouped[cat.id].items.length > 0) {
            result[cat.id] = grouped[cat.id];
        }
    });

    return result;
}

/**
 * Aggregate ingredients by normalized name within a category
 * Combines quantities from multiple recipes
 * @param {Array} items - Array of ingredient objects
 * @returns {Array} - Aggregated items with sources
 */
export function aggregateIngredients(items) {
    const aggregated = new Map();

    items.forEach(item => {
        const normalizedKey = normalizeItemName(item.item);

        if (aggregated.has(normalizedKey)) {
            const existing = aggregated.get(normalizedKey);
            // Add to quantities array
            existing.quantities.push({
                amount: item.amount,
                unit: item.unit,
                recipeTitle: item.recipeTitle,
                recipeId: item.recipeId,
                id: item.id,
                checked: item.checked
            });
            // Track all source recipes
            if (!existing.sources.includes(item.recipeTitle)) {
                existing.sources.push(item.recipeTitle);
            }
        } else {
            aggregated.set(normalizedKey, {
                displayName: item.item, // Keep first occurrence's display name
                normalizedName: normalizedKey,
                quantities: [{
                    amount: item.amount,
                    unit: item.unit,
                    recipeTitle: item.recipeTitle,
                    recipeId: item.recipeId,
                    id: item.id,
                    checked: item.checked
                }],
                sources: [item.recipeTitle]
            });
        }
    });

    return Array.from(aggregated.values());
}
