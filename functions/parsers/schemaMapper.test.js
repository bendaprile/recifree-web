import { describe, it, expect } from 'vitest';
import { mapToRecifreeSchema, slugify, decodeHtmlEntities, deepCleanHtmlEntities } from './schemaMapper';

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

  describe('decodeHtmlEntities', () => {
    it('decodes decimal numeric entities like &#8211; (en-dash)', () => {
      expect(decodeHtmlEntities('6&#8211;12 minutes')).toBe('6\u201312 minutes');
    });

    it('decodes hex numeric entities like &#x2013;', () => {
      expect(decodeHtmlEntities('6&#x2013;12 minutes')).toBe('6\u201312 minutes');
    });

    it('decodes common named entities (&amp;, &quot;, &apos;)', () => {
      expect(decodeHtmlEntities('Salt &amp; Pepper')).toBe('Salt & Pepper');
      expect(decodeHtmlEntities('&quot;Hello&quot;')).toBe('"Hello"');
    });

    it('decodes &ndash; and &mdash; named entities', () => {
      expect(decodeHtmlEntities('6&ndash;12 minutes')).toBe('6\u201312 minutes');
      expect(decodeHtmlEntities('Wait&mdash;really?')).toBe('Wait\u2014really?');
    });

    it('decodes &#39; (single quote) entities', () => {
      expect(decodeHtmlEntities("it&#39;s great")).toBe("it's great");
    });

    it('handles strings with no entities unchanged', () => {
      expect(decodeHtmlEntities('plain text')).toBe('plain text');
    });

    it('returns non-string inputs as-is', () => {
      expect(decodeHtmlEntities(null)).toBe(null);
      expect(decodeHtmlEntities(undefined)).toBe(undefined);
      expect(decodeHtmlEntities(42)).toBe(42);
    });

    it('handles multiple entities in one string', () => {
      expect(decodeHtmlEntities('6&#8211;12 mins &amp; &#39;crispy&#39;'))
        .toBe("6\u201312 mins & 'crispy'");
    });
  });

  describe('deepCleanHtmlEntities', () => {
    it('recursively decodes strings inside nested objects', () => {
      const input = {
        title: 'Mac &#8211; Cheese',
        instructions: ['Step 1 &amp; 2', 'Bake at 350&#176;F'],
        nested: { desc: 'It&#39;s great' }
      };
      const result = deepCleanHtmlEntities(input);
      expect(result.title).toBe('Mac \u2013 Cheese');
      expect(result.instructions[0]).toBe('Step 1 & 2');
      expect(result.instructions[1]).toBe('Bake at 350\u00B0F');
      expect(result.nested.desc).toBe("It's great");
    });

    it('handles null and undefined gracefully', () => {
      expect(deepCleanHtmlEntities(null)).toBe(null);
      expect(deepCleanHtmlEntities(undefined)).toBe(undefined);
    });

    it('passes numbers and booleans through unchanged', () => {
      expect(deepCleanHtmlEntities(42)).toBe(42);
      expect(deepCleanHtmlEntities(true)).toBe(true);
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

    it('decodes HTML entities in raw data during schema mapping', () => {
      const rawData = {
        title: 'Coconut Curry Salmon',
        description: 'A delicious &#8211; and healthy &#8211; salmon recipe.',
        ingredients: [
          '1 tbsp olive oil',
          '2 tsp curry powder'
        ],
        instructions: [
          'Bake for 6&#8211;12 minutes (depends on thickness &#8211; I opt for 8&#8211;10 minutes).',
          'Season with salt &amp; pepper.'
        ],
        source: {
          name: 'pinchofyum.com',
          url: 'https://pinchofyum.com/coconut-curry-salmon'
        }
      };

      const result = mapToRecifreeSchema(rawData);

      expect(result.description).toBe('A delicious \u2013 and healthy \u2013 salmon recipe.');
      expect(result.instructions[0]).toBe(
        'Bake for 6\u201312 minutes (depends on thickness \u2013 I opt for 8\u201310 minutes).'
      );
      expect(result.instructions[1]).toBe('Season with salt & pepper.');
    });
  });
});
