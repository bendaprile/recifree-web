import { describe, it, expect } from 'vitest';
import { mapToRecifreeSchema, slugify } from './schemaMapper';

describe('schemaMapper', () => {
  describe('slugify', () => {
    it('creates correct kebab-case strings', () => {
      expect(slugify('Anti-Inflammatory Turmeric Chicken Soup')).toBe('anti-inflammatory-turmeric-chicken-soup');
      expect(slugify('Lemony Garlic Shrimp Pasta!')).toBe('lemony-garlic-shrimp-pasta');
    });

    it('handles empty titles gracefully', () => {
      expect(slugify('')).toBe('extracted-recipe');
    });
  });

  describe('mapToRecifreeSchema', () => {
    it('fully normalizes raw parsed intermediate data into Recifree JSON format', () => {
      const rawData = {
        title: 'Mouthwatering Potato Soup',
        description: 'Warm and comforting potato soup.',
        prepTime: '20 minutes',
        cookTime: '30 minutes',
        totalTime: '50 minutes',
        servings: '6',
        ingredients: [
          '4 cups potatoes, cubed',
          '1 cup yellow onion, chopped',
          '2 tbsp olive oil',
          '1 tsp kosher salt'
        ],
        instructions: [
          'Heat olive oil in a pot and add chopped onion.',
          'Add cubed potatoes and cover with water.',
          'Simmer for 20 minutes and season with salt.'
        ],
        source: {
          name: 'Classic Eats',
          url: 'https://classiceats.com/potato-soup'
        },
        nutrition: {
          calories: '320 kcal',
          protein: '6g',
          carbs: '40g',
          fat: '10g'
        }
      };

      const result = mapToRecifreeSchema(rawData);

      // Verify general metadata
      expect(result.id).toBe('mouthwatering-potato-soup');
      expect(result.title).toBe('Mouthwatering Potato Soup');
      expect(result.description).toBe('Warm and comforting potato soup.');
      expect(result.prepTime).toBe('20 mins');
      expect(result.cookTime).toBe('30 mins');
      expect(result.totalTime).toBe('50 mins');
      expect(result.servings).toBe(6);
      expect(result.difficulty).toBe('Easy'); // 3 steps -> Easy
      
      // Verify processed ingredients
      expect(result.ingredients[0]).toEqual({ amount: '4', unit: 'cup', item: 'potatoes, cubed' });
      expect(result.ingredients[2]).toEqual({ amount: '2', unit: 'tbsp', item: 'olive oil' });
      
      // Verify source
      expect(result.source).toEqual({
        name: 'Classic Eats',
        url: 'https://classiceats.com/potato-soup'
      });

      // Verify nutrition
      expect(result.nutrition).toEqual({
        calories: 320,
        protein: '6g',
        carbs: '40g',
        fat: '10g'
      });

      // Verify tags (inferred based on soup word in title)
      expect(result.tags).toContain('Dinner');
      expect(result.tags).toContain('Soup');

      // Verify stepIngredients mappings
      // Step 1: "Heat olive oil in a pot and add chopped onion." -> oil (index 2), onion (index 1)
      expect(result.stepIngredients[0]).toEqual([1, 2]);
      // Step 2: "Add cubed potatoes..." -> potatoes (index 0)
      expect(result.stepIngredients[1]).toEqual([0]);
      // Step 3: "...season with salt." -> salt (index 3)
      expect(result.stepIngredients[2]).toEqual([3]);
    });
  });
});
