import { describe, it, expect } from 'vitest';
import { parseIngredient, normalizeUnicodeFractions } from './ingredientParser';

describe('ingredientParser', () => {
  describe('normalizeUnicodeFractions', () => {
    it('normalizes common unicode fractions to text equivalents', () => {
      expect(normalizeUnicodeFractions('½')).toBe('1/2');
      expect(normalizeUnicodeFractions('¼ cup')).toBe('1/4 cup');
      expect(normalizeUnicodeFractions('¾ tsp')).toBe('3/4 tsp');
    });

    it('returns the same string if no unicode fractions are present', () => {
      expect(normalizeUnicodeFractions('1 1/2 cups')).toBe('1 1/2 cups');
    });
  });

  describe('parseIngredient', () => {
    it('handles simple standard ingredient strings', () => {
      const res = parseIngredient('2 cups all-purpose flour');
      expect(res).toEqual({
        amount: '2',
        unit: 'cup',
        item: 'all-purpose flour'
      });
    });

    it('normalizes and standardizes units', () => {
      const res = parseIngredient('3 Tablespoons unsalted butter');
      expect(res).toEqual({
        amount: '3',
        unit: 'tbsp',
        item: 'unsalted butter'
      });
    });

    it('handles fraction amounts', () => {
      const res = parseIngredient('1/2 teaspoon kosher salt');
      expect(res).toEqual({
        amount: '1/2',
        unit: 'tsp',
        item: 'kosher salt'
      });
    });

    it('handles Unicode fractions', () => {
      const res = parseIngredient('½ tsp ground pepper');
      expect(res).toEqual({
        amount: '1/2',
        unit: 'tsp',
        item: 'ground pepper'
      });
    });

    it('handles mixed number quantities', () => {
      const res = parseIngredient('1 1/2 cups granulated sugar');
      expect(res).toEqual({
        amount: '1 1/2',
        unit: 'cup',
        item: 'granulated sugar'
      });
    });

    it('handles parenthetical can/package units', () => {
      const res = parseIngredient('1 can (13.5 oz) full-fat coconut milk');
      expect(res).toEqual({
        amount: '1',
        unit: 'can (13.5 oz)',
        item: 'full-fat coconut milk'
      });
    });

    it('handles range quantities', () => {
      const res = parseIngredient('2 to 3 cloves garlic, minced');
      expect(res).toEqual({
        amount: '2 to 3',
        unit: 'clove',
        item: 'garlic, minced'
      });
    });

    it('handles hyphenated ranges', () => {
      const res = parseIngredient('1-2 tsp red pepper flakes');
      expect(res).toEqual({
        amount: '1-2',
        unit: 'tsp',
        item: 'red pepper flakes'
      });
    });

    it('handles items without quantities or units gracefully', () => {
      const res = parseIngredient('Salt and freshly ground black pepper to taste');
      expect(res).toEqual({
        amount: '',
        unit: '',
        item: 'Salt and freshly ground black pepper to taste'
      });
    });

    it('handles items with only a quantity and no unit', () => {
      const res = parseIngredient('2 large eggs');
      expect(res).toEqual({
        amount: '2',
        unit: '',
        item: 'large eggs'
      });
    });
  });
});
