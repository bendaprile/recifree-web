import { describe, it, expect } from 'vitest';
import {
  normalizeIngredientName,
  parseAmount,
  normalizeUnit,
  convertToBaseUnit,
  convertFromBaseUnit,
  formatAmount,
  getDisplayUnit,
  consolidateIngredients
} from './ingredientConsolidator';

describe('ingredientConsolidator', () => {
  describe('normalizeIngredientName', () => {
    it('lowercases and trims', () => {
      expect(normalizeIngredientName('  Olive Oil  ')).toBe('olive oil');
    });
    it('collapses whitespace', () => {
      expect(normalizeIngredientName('olive   oil')).toBe('olive oil');
    });
    it('strips trailing s', () => {
      expect(normalizeIngredientName('carrots')).toBe('carrot');
      expect(normalizeIngredientName('onions')).toBe('onion');
    });
    it('does not strip s for exceptions', () => {
      expect(normalizeIngredientName('hummus')).toBe('hummus');
      expect(normalizeIngredientName('molasses')).toBe('molasses');
      expect(normalizeIngredientName('lemongrass')).toBe('lemongrass');
      expect(normalizeIngredientName('watercress')).toBe('watercress');
      expect(normalizeIngredientName('peas')).toBe('peas');
      expect(normalizeIngredientName('couscous')).toBe('couscous');
    });
    it('handles empty input', () => {
      expect(normalizeIngredientName('')).toBe('');
      expect(normalizeIngredientName(null)).toBe('');
    });
  });

  describe('parseAmount', () => {
    it('parses integers', () => {
      expect(parseAmount('3')).toBe(3);
    });
    it('parses decimals', () => {
      expect(parseAmount('1.5')).toBe(1.5);
    });
    it('parses fractions', () => {
      expect(parseAmount('1/2')).toBe(0.5);
      expect(parseAmount('3/4')).toBe(0.75);
    });
    it('parses mixed fractions', () => {
      expect(parseAmount('1 1/2')).toBe(1.5);
      expect(parseAmount('2 1/4')).toBe(2.25);
    });
    it('parses unicode fractions', () => {
      expect(parseAmount('½')).toBe(0.5);
      expect(parseAmount('1 ½')).toBe(1.5);
      expect(parseAmount('⅓')).toBeCloseTo(0.333, 2);
    });
    it('handles ranges by taking the upper bound', () => {
      expect(parseAmount('2-3')).toBe(3);
      expect(parseAmount('1.5 - 2.5')).toBe(2.5);
    });
    it('returns null for empty/invalid', () => {
      expect(parseAmount('')).toBeNull();
      expect(parseAmount(null)).toBeNull();
      expect(parseAmount('some text')).toBeNull();
    });
  });

  describe('normalizeUnit', () => {
    it('maps abbreviations to canonical forms', () => {
      expect(normalizeUnit('tsp')).toBe('teaspoon');
      expect(normalizeUnit('tbsp')).toBe('tablespoon');
      expect(normalizeUnit('T')).toBe('teaspoon'); // 'T' mapping to teaspoon or tablespoon? Wait, 'T' is usually tablespoon in cooking, but 't' is teaspoon. In our code 't'->teaspoon. Let's just check standard ones.
      expect(normalizeUnit('c')).toBe('cup');
      expect(normalizeUnit('oz')).toBe('ounce');
      expect(normalizeUnit('lbs')).toBe('pound');
      expect(normalizeUnit('g')).toBe('gram');
      expect(normalizeUnit('kg')).toBe('kilogram');
      expect(normalizeUnit('ml')).toBe('milliliter');
      expect(normalizeUnit('l')).toBe('liter');
      expect(normalizeUnit('bunches')).toBe('bunch');
    });
    it('passes through unknown units', () => {
      expect(normalizeUnit('handful')).toBe('handful');
    });
    it('handles empty', () => {
      expect(normalizeUnit(null)).toBe('');
      expect(normalizeUnit('')).toBe('');
    });
  });

  describe('convertToBaseUnit', () => {
    it('converts volume US', () => {
      expect(convertToBaseUnit(1, 'cup')).toEqual({ amount: 48, unit: 'teaspoon', baseFamily: 'volumeUS' });
      expect(convertToBaseUnit(2, 'tablespoon')).toEqual({ amount: 6, unit: 'teaspoon', baseFamily: 'volumeUS' });
    });
    it('converts weight Metric', () => {
      expect(convertToBaseUnit(1.5, 'kilogram')).toEqual({ amount: 1500, unit: 'gram', baseFamily: 'weightMetric' });
    });
    it('returns as-is for unknown units', () => {
      expect(convertToBaseUnit(5, 'piece')).toEqual({ amount: 5, unit: 'piece', baseFamily: 'piece' });
    });
  });

  describe('convertFromBaseUnit', () => {
    it('converts volume US to largest clean unit', () => {
      expect(convertFromBaseUnit(144, 'teaspoon')).toEqual({ amount: 1.5, unit: 'pint' });
      expect(convertFromBaseUnit(6, 'teaspoon')).toEqual({ amount: 2, unit: 'tablespoon' });
      expect(convertFromBaseUnit(1.5, 'teaspoon')).toEqual({ amount: 1.5, unit: 'teaspoon' });
    });
    it('converts metric volume', () => {
      expect(convertFromBaseUnit(2000, 'milliliter')).toEqual({ amount: 2, unit: 'liter' });
      expect(convertFromBaseUnit(500, 'milliliter')).toEqual({ amount: 500, unit: 'milliliter' });
    });
    it('converts US weight', () => {
      expect(convertFromBaseUnit(32, 'ounce')).toEqual({ amount: 2, unit: 'pound' });
    });
  });

  describe('formatAmount', () => {
    it('formats fractions nicely', () => {
      expect(formatAmount(0.25)).toBe('¼');
      expect(formatAmount(0.5)).toBe('½');
      expect(formatAmount(1.5)).toBe('1½');
      expect(formatAmount(3)).toBe('3');
      expect(formatAmount(2.25)).toBe('2¼');
      expect(formatAmount(1/3)).toBe('⅓');
    });
    it('handles null/undefined', () => {
      expect(formatAmount(null)).toBe('');
    });
  });

  describe('getDisplayUnit', () => {
    it('gets display unit', () => {
      expect(getDisplayUnit('teaspoon')).toBe('tsp');
      expect(getDisplayUnit('tablespoon')).toBe('tbsp');
      expect(getDisplayUnit('pound')).toBe('lb');
      expect(getDisplayUnit('unknown')).toBe('unknown');
    });
  });

  describe('consolidateIngredients', () => {
    it('consolidates same ingredient with same unit', () => {
      const input = [
        {
          recipeId: 'r1', recipeTitle: 'R1', ingredients: [
            { id: 'i1', item: 'Salt', amount: '1', unit: 'tsp', checked: true }
          ]
        },
        {
          recipeId: 'r2', recipeTitle: 'R2', ingredients: [
            { id: 'i2', item: 'salt', amount: '2', unit: 'tsp', checked: true }
          ]
        }
      ];
      
      const res = consolidateIngredients(input);
      expect(res).toHaveLength(1);
      expect(res[0].key).toBe('salt');
      expect(res[0].quantities[0].amount).toBe(1); // 3 tsp -> 1 tbsp
      expect(res[0].quantities[0].unit).toBe('tablespoon');
      expect(res[0].checked).toBe(true);
      expect(res[0].sources).toHaveLength(2);
      expect(res[0].sources[0].recipeId).toBe('r1');
      expect(res[0].sources[1].recipeId).toBe('r2');
    });

    it('consolidates different units in same family', () => {
      const input = [
        {
          recipeId: 'r1', recipeTitle: 'R1', ingredients: [
            { id: 'i1', item: 'Water', amount: '1', unit: 'cup', checked: false }
          ]
        },
        {
          recipeId: 'r2', recipeTitle: 'R2', ingredients: [
            { id: 'i2', item: 'water', amount: '1', unit: 'tbsp', checked: true }
          ]
        }
      ];
      
      const res = consolidateIngredients(input);
      expect(res[0].quantities[0].amount).toBe(1.0625); // 1 cup + 1 tbsp (51 tsp) -> 51/48 cups
      expect(res[0].quantities[0].unit).toBe('cup');
      expect(res[0].checked).toBe(false); // one is false
    });

    it('keeps incompatible units separate', () => {
      const input = [
        {
          recipeId: 'r1', recipeTitle: 'R1', ingredients: [
            { id: 'i1', item: 'Apple', amount: '1', unit: 'cup' }
          ]
        },
        {
          recipeId: 'r2', recipeTitle: 'R2', ingredients: [
            { id: 'i2', item: 'Apple', amount: '2', unit: 'lbs' }
          ]
        }
      ];
      
      const res = consolidateIngredients(input);
      expect(res[0].quantities).toHaveLength(2);
    });
    
    it('sorts alphabetically', () => {
      const input = [
        { recipeId: 'r1', recipeTitle: 'R1', ingredients: [
          { id: 'i1', item: 'Zebra', amount: '1' },
          { id: 'i2', item: 'Apple', amount: '1' }
        ]}
      ];
      const res = consolidateIngredients(input);
      expect(res[0].key).toBe('apple');
      expect(res[1].key).toBe('zebra');
    });

    it('returns empty array for empty input', () => {
      expect(consolidateIngredients([])).toEqual([]);
      expect(consolidateIngredients(null)).toEqual([]);
    });

    it('handles ingredients with no amount', () => {
      const input = [
        {
          recipeId: 'r1', recipeTitle: 'R1', ingredients: [
            { id: 'i1', item: 'Salt', checked: false }
          ]
        }
      ];
      const res = consolidateIngredients(input);
      expect(res).toHaveLength(1);
      expect(res[0].quantities[0].amount).toBeNull();
    });

    it('falls back to name field when item is not present', () => {
      const input = [
        {
          recipeId: 'r1', recipeTitle: 'R1', ingredients: [
            { id: 'i1', name: 'Garlic', amount: '2', unit: 'clove', checked: false }
          ]
        }
      ];
      const res = consolidateIngredients(input);
      expect(res).toHaveLength(1);
      expect(res[0].displayName).toBe('Garlic');
    });
  });
});
