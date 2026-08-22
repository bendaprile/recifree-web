import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * ssrRecipe serialises the whole Firestore document into
 * window.__INITIAL_RECIPE__, and the `recipes` collection is world-readable.
 * Anything private stored on a recipe therefore lands in public page source.
 *
 * These assert on the source because index.js builds an Express app at import
 * time and cannot be unit-tested cheaply. Crude, but it fails loudly if the
 * strip is removed or the field list drifts.
 */
const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'index.js'),
  'utf8'
);

describe('ssrRecipe public serialisation', () => {
  it('strips private fields before rendering a recipe', () => {
    expect(source).toContain('toPublicRecipe(snapshot.docs[0].data())');
  });

  it('treats the publisher identity fields as private', () => {
    expect(source).toMatch(/PRIVATE_RECIPE_FIELDS\s*=\s*\[[^\]]*'publishedBy'/);
    expect(source).toMatch(/PRIVATE_RECIPE_FIELDS\s*=\s*\[[^\]]*'extractedBy'/);
    expect(source).toMatch(/PRIVATE_RECIPE_FIELDS\s*=\s*\[[^\]]*'_extractionMeta'/);
  });

  it('never writes an email onto a published recipe', () => {
    const publish = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), 'publishRecipe.js'),
      'utf8'
    );
    // caller.id is the rate-limit key and is an email for signed-in callers.
    expect(publish).not.toMatch(/publishedBy:\s*caller\.id/);
    expect(publish).toMatch(/publishedByUid/);
  });

  it('resolves the byline server-side rather than trusting the client payload', () => {
    const publish = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), 'publishRecipe.js'),
      'utf8'
    );
    // buildPublishedDoc's own tests cover what the document ends up containing.
    // This one covers the wiring: the name comes from the server-side lookup.
    expect(publish).toMatch(/lookupPublisherName\(db, admin\.auth\(\), caller\.uid\)/);
  });

  it('hashes the source URL when a recipe is migrated from JSON', () => {
    // Recipes added through .agent/workflows/recipe.md arrive this way. Without
    // the key they never match a paste of their own source URL, and the catalog
    // grows the duplicate this whole mechanism exists to prevent. Asserted on
    // the source because the script initialises the Admin SDK at import.
    const migrate = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'migrate-to-firestore.js'),
      'utf8'
    );
    expect(migrate).toMatch(/payload\.sourceUrlHash = hashUrl\(normalizeUrl\(recipe\.source\.url\)\)/);
  });

  it('parses stepIngredients before hydrating, so the client never maps a string', () => {
    // Firestore stores it as a JSON string. The hydration payload bypasses
    // recipeService's mapping, so the parse has to happen here.
    expect(source).toMatch(/typeof safe\.stepIngredients === 'string'/);
    expect(source).toMatch(/JSON\.parse\(safe\.stepIngredients\)/);
  });

  it('escapes recipe text before putting it in meta attributes', () => {
    // Titles and descriptions come from third-party pages and from users.
    expect(source).toMatch(/og:title" content="\$\{escapeAttribute\(recipe\.title\)\}/);
    expect(source).toMatch(/og:description" content="\$\{escapeAttribute\(/);
    expect(source).not.toMatch(/content="\$\{recipe\.title\}/);
  });
});
