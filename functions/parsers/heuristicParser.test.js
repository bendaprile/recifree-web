import { describe, it, expect } from 'vitest';
import { parseHeuristics } from './heuristicParser';

describe('heuristicParser', () => {
  it('parses WP Recipe Maker (WPRM) structure successfully', () => {
    const html = `
      <div class="wprm-recipe-container">
        <h2 class="wprm-recipe-name">WPRM Turmeric Soup</h2>
        <div class="wprm-recipe-summary">A simple nourishing soup.</div>
        <span class="wprm-recipe-prep_time">15 mins</span>
        <span class="wprm-recipe-cook_time">30 mins</span>
        <span class="wprm-recipe-servings">4</span>
        <div class="wprm-recipe-ingredient">1 tbsp oil</div>
        <div class="wprm-recipe-ingredient">1 onion</div>
        <div class="wprm-recipe-instruction">Heat oil in a pan.</div>
        <div class="wprm-recipe-instruction">Add onion and sauté.</div>
      </div>
    `;

    const result = parseHeuristics(html);
    expect(result).not.toBeNull();
    expect(result.title).toBe('WPRM Turmeric Soup');
    expect(result.description).toBe('A simple nourishing soup.');
    expect(result.prepTime).toBe('15 mins');
    expect(result.cookTime).toBe('30 mins');
    expect(result.servings).toBe(4);
    expect(result.ingredients).toEqual(['1 tbsp oil', '1 onion']);
    expect(result.instructions).toEqual(['Heat oil in a pan.', 'Add onion and sauté.']);
  });

  it('parses Tasty Recipes structure successfully', () => {
    const html = `
      <div class="tasty-recipes">
        <h2 class="tasty-recipes-title">Tasty Garlic Shrimp</h2>
        <div class="tasty-recipes-description">Sautéed shrimp with garlic.</div>
        <span class="tasty-recipes-prep-time">10 mins</span>
        <span class="tasty-recipes-cook-time">10 mins</span>
        <span class="tasty-recipes-yield">2 servings</span>
        <div class="tasty-recipes-ingredients">
          <ul>
            <li>1 lb shrimp</li>
            <li>4 cloves garlic</li>
          </ul>
        </div>
        <div class="tasty-recipes-instructions">
          <ol>
            <li>Clean the shrimp.</li>
            <li>Sauté with garlic.</li>
          </ol>
        </div>
      </div>
    `;

    const result = parseHeuristics(html);
    expect(result).not.toBeNull();
    expect(result.title).toBe('Tasty Garlic Shrimp');
    expect(result.prepTime).toBe('10 mins');
    expect(result.cookTime).toBe('10 mins');
    expect(result.servings).toBe(2);
    expect(result.ingredients).toEqual(['1 lb shrimp', '4 cloves garlic']);
    expect(result.instructions).toEqual(['Clean the shrimp.', 'Sauté with garlic.']);
  });

  it('falls back to generic heuristics for basic non-plugin pages with standard lists', () => {
    const html = `
      <html>
        <body>
          <h1>My Simple Salad</h1>
          <h2>Ingredients</h2>
          <ul>
            <li>1 head lettuce</li>
            <li>1 tomato</li>
          </ul>
          <h2>Instructions</h2>
          <ol>
            <li>Chop lettuce and tomato.</li>
            <li>Toss together.</li>
          </ol>
        </body>
      </html>
    `;

    const result = parseHeuristics(html);
    expect(result).not.toBeNull();
    expect(result.title).toBe('My Simple Salad');
    expect(result.ingredients).toEqual(['1 head lettuce', '1 tomato']);
    expect(result.instructions).toEqual(['Chop lettuce and tomato.', 'Toss together.']);
  });

  it('returns null if no headings or lists can be found on a generic page', () => {
    const html = `
      <html>
        <body>
          <h1>Just a regular blog post</h1>
          <p>No list elements or recipe words here.</p>
        </body>
      </html>
    `;
    expect(parseHeuristics(html)).toBeNull();
  });
});
