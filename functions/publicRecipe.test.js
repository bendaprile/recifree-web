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
});
