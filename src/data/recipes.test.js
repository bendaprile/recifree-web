import { describe, it, expect } from 'vitest';
import recipes from './recipes.js';

describe('Recipe JSON Data Integrity', () => {
  it('loads recipes correctly', () => {
    expect(recipes.length).toBeGreaterThan(0);
  });

  it('includes the newly added skirt-steak-with-chimichurri-sauce recipe', () => {
    const found = recipes.find(r => r.id === 'skirt-steak-with-chimichurri-sauce');
    expect(found).toBeDefined();
    expect(found.title).toBe('Skirt Steak with Chimichurri Sauce');
  });

  it('verifies schema structure for all recipes', () => {
    recipes.forEach(recipe => {
      expect(recipe.id).toBeTruthy();
      expect(recipe.title).toBeTruthy();
      expect(recipe.description).toBeTruthy();
      expect(recipe.image).toBeTruthy();
      expect(recipe.prepTime).toBeTruthy();
      expect(recipe.cookTime).toBeTruthy();
      expect(recipe.totalTime).toBeTruthy();
      expect(recipe.servings).toBeGreaterThan(0);
      expect(recipe.difficulty).toBeTruthy();
      expect(Array.isArray(recipe.tags)).toBe(true);
      expect(Array.isArray(recipe.ingredients)).toBe(true);
      expect(Array.isArray(recipe.instructions)).toBe(true);
      expect(Array.isArray(recipe.stepIngredients)).toBe(true);
      expect(recipe.stepIngredients.length).toBe(recipe.instructions.length);
      expect(recipe.source).toBeDefined();
      expect(recipe.source.name).toBeTruthy();
      expect(recipe.source.url).toBeTruthy();
      expect(recipe.nutrition).toBeDefined();
    });
  });
});
