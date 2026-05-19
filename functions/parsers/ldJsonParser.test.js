import { describe, it, expect } from 'vitest';
import { parseLdJson, parseDuration, extractInstructions, parseServings } from './ldJsonParser';

describe('ldJsonParser', () => {
  describe('parseDuration', () => {
    it('converts ISO 8601 duration strings successfully', () => {
      expect(parseDuration('PT15M')).toBe('15 mins');
      expect(parseDuration('PT1H')).toBe('1 hr');
      expect(parseDuration('PT1H30M')).toBe('1 hr 30 mins');
      expect(parseDuration('PT2H5M')).toBe('2 hrs 5 mins');
    });

    it('cleans and normalizes standard text duration strings', () => {
      expect(parseDuration('15 minutes')).toBe('15 mins');
      expect(parseDuration('2 hours')).toBe('2 hrs');
    });
  });

  describe('parseServings', () => {
    it('extracts numbers from various yield formats', () => {
      expect(parseServings(4)).toBe(4);
      expect(parseServings('6 servings')).toBe(6);
      expect(parseServings(['8 people'])).toBe(8);
      expect(parseServings('serves 12')).toBe(12);
    });
  });

  describe('extractInstructions', () => {
    it('handles simple string array recipeInstructions', () => {
      const input = ['Step 1 text', 'Step 2 text'];
      expect(extractInstructions(input)).toEqual(['Step 1 text', 'Step 2 text']);
    });

    it('handles nested HowToStep objects', () => {
      const input = [
        { '@type': 'HowToStep', text: 'Step 1 text' },
        { '@type': 'HowToStep', text: 'Step 2 text' }
      ];
      expect(extractInstructions(input)).toEqual(['Step 1 text', 'Step 2 text']);
    });

    it('handles nested HowToSection objects containing steps', () => {
      const input = [
        {
          '@type': 'HowToSection',
          name: 'Section 1',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Step 1' },
            { '@type': 'HowToStep', text: 'Step 2' }
          ]
        },
        {
          '@type': 'HowToSection',
          name: 'Section 2',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Step 3' }
          ]
        }
      ];
      expect(extractInstructions(input)).toEqual(['Step 1', 'Step 2', 'Step 3']);
    });

    it('splits standard text instructions separated by newlines', () => {
      const input = 'Step 1\nStep 2\nStep 3';
      expect(extractInstructions(input)).toEqual(['Step 1', 'Step 2', 'Step 3']);
    });
  });

  describe('parseLdJson', () => {
    it('extracts recipe object from standard single JSON-LD block', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": "Turmeric Chicken",
                "recipeIngredient": ["1 chicken", "1 tsp turmeric"],
                "recipeInstructions": [
                  {"@type": "HowToStep", "text": "Wash chicken"},
                  {"@type": "HowToStep", "text": "Season with turmeric"}
                ],
                "prepTime": "PT10M",
                "cookTime": "PT40M",
                "recipeYield": "4 servings"
              }
            </script>
          </head>
          <body></body>
        </html>
      `;

      const result = parseLdJson(html);
      expect(result).not.toBeNull();
      expect(result.title).toBe('Turmeric Chicken');
      expect(result.ingredients).toEqual(['1 chicken', '1 tsp turmeric']);
      expect(result.instructions).toEqual(['Wash chicken', 'Season with turmeric']);
      expect(result.prepTime).toBe('10 mins');
      expect(result.cookTime).toBe('40 mins');
      expect(result.servings).toBe(4);
    });

    it('extracts recipe nested inside a Yoast SEO @graph array structure', () => {
      const html = `
        <html>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebPage",
                  "name": "Web Page Title"
                },
                {
                  "@type": "Recipe",
                  "name": "Graph Recipe Soup",
                  "recipeIngredient": ["2 cups water", "1 tsp salt"],
                  "recipeInstructions": ["Boil water", "Add salt"]
                }
              ]
            }
          </script>
        </html>
      `;

      const result = parseLdJson(html);
      expect(result).not.toBeNull();
      expect(result.title).toBe('Graph Recipe Soup');
      expect(result.ingredients).toEqual(['2 cups water', '1 tsp salt']);
      expect(result.instructions).toEqual(['Boil water', 'Add salt']);
    });

    it('returns null when no Recipe type exists in JSON-LD', () => {
      const html = `
        <html>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": "No recipe here!"
            }
          </script>
        </html>
      `;
      expect(parseLdJson(html)).toBeNull();
    });

    it('returns null on invalid html or malformed JSON', () => {
      expect(parseLdJson(null)).toBeNull();
      expect(parseLdJson('<html><script type="application/ld+json">{invalid json}</script></html>')).toBeNull();
    });
  });
});
