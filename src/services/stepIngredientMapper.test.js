import { describe, it, expect } from 'vitest';
import { mapStepsToIngredients, cleanItemNameForMatching } from './stepIngredientMapper';

describe('stepIngredientMapper', () => {
  describe('cleanItemNameForMatching', () => {
    it('removes parenthetical text and trailing commas', () => {
      expect(cleanItemNameForMatching('onion, diced')).toBe('onion');
      expect(cleanItemNameForMatching('kosher salt (plus more to taste)')).toBe('salt');
    });

    it('filters out common cooking stop words', () => {
      expect(cleanItemNameForMatching('extra-virgin olive oil')).toBe('olive oil');
      expect(cleanItemNameForMatching('boneless skinless chicken thighs')).toBe('chicken thighs');
      expect(cleanItemNameForMatching('organic whole milk')).toBe('milk');
    });

    it('standardizes key kitchen items', () => {
      expect(cleanItemNameForMatching('sea salt')).toBe('salt');
      expect(cleanItemNameForMatching('freshly ground black pepper')).toBe('pepper');
    });
  });

  describe('mapStepsToIngredients', () => {
    const ingredients = [
      { item: 'extra-virgin olive oil' }, // Index 0
      { item: 'yellow onion, diced' },     // Index 1
      { item: 'garlic cloves, minced' },   // Index 2
      { item: 'low-sodium chicken broth' },// Index 3
      { item: 'dried pasta' },             // Index 4
      { item: 'kosher salt' }              // Index 5
    ];

    it('associates ingredients with instruction steps using text keywords', () => {
      const instructions = [
        'Heat olive oil in a soup pot.',
        'Add diced onion and garlic, and sauté until tender.',
        'Pour in the chicken broth and bring to a boil.',
        'Stir in the pasta and cook for 10 minutes.',
        'Remove from heat and serve hot.'
      ];

      const mapping = mapStepsToIngredients(instructions, ingredients);

      expect(mapping[0]).toEqual([0]);    // oil
      expect(mapping[1]).toEqual([1, 2]); // onion, garlic
      expect(mapping[2]).toEqual([3]);    // broth
      expect(mapping[3]).toEqual([4]);    // pasta
      expect(mapping[4]).toEqual([]);     // nothing mentioned
    });

    it('handles long-phrase multi-word item fuzzy matching', () => {
      const instructions = [
        'Add the chicken and boil.',
        'Season with salt and pepper.'
      ];
      
      const complexIngredients = [
        { item: 'boneless skinless chicken thighs' }, // Index 0
        { item: 'fine sea salt' },                     // Index 1
        { item: 'black pepper' }                      // Index 2
      ];

      const mapping = mapStepsToIngredients(instructions, complexIngredients);
      expect(mapping[0]).toEqual([0]);    // chicken thighs matches "chicken"
      expect(mapping[1]).toEqual([1, 2]); // salt, pepper
    });
  });
});
