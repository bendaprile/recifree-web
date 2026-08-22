import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { slugify, validate } = require('./publishRecipe');

const base64OfBytes = (n) => 'A'.repeat(Math.ceil((n * 4) / 3));

const goodPayload = (overrides = {}) => ({
  recipe: {
    title: 'Kale Salad',
    ingredients: [{ amount: '1', unit: 'cup', item: 'kale' }],
    instructions: ['Toss it.'],
    triedAndTrue: true,
    ...(overrides.recipe || {})
  },
  image: {
    contentType: 'image/jpeg',
    data: base64OfBytes(1024),
    ...(overrides.image || {})
  },
  ...(overrides.top || {})
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Kale Salad Recipe')).toBe('kale-salad-recipe');
  });

  it('drops punctuation that would break a URL', () => {
    expect(slugify("Dad's Greek Salad!")).toBe('dads-greek-salad');
  });

  it('collapses repeated and trailing separators', () => {
    expect(slugify('  Spicy   Salmon -- Bowls  ')).toBe('spicy-salmon-bowls');
  });

  it('survives a missing title without throwing', () => {
    expect(slugify(undefined)).toBe('');
  });
});

describe('validate', () => {
  it('accepts a complete recipe with a photo', () => {
    expect(validate(goodPayload())).toBeNull();
  });

  it('rejects a recipe with no photo, which is the whole point of the gate', () => {
    const payload = goodPayload();
    delete payload.image;
    expect(validate(payload)).toMatch(/photo/i);
  });

  it('rejects a recipe the user has not confirmed cooking', () => {
    expect(validate(goodPayload({ recipe: { triedAndTrue: false } }))).toMatch(/cooked/i);
  });

  it('rejects a missing title', () => {
    expect(validate(goodPayload({ recipe: { title: '   ' } }))).toMatch(/title/i);
  });

  it('rejects an empty ingredient list', () => {
    expect(validate(goodPayload({ recipe: { ingredients: [] } }))).toMatch(/ingredient/i);
  });

  it('rejects an empty instruction list', () => {
    expect(validate(goodPayload({ recipe: { instructions: [] } }))).toMatch(/instruction/i);
  });

  it('rejects a non-image upload, so the bucket cannot be used for arbitrary files', () => {
    expect(validate(goodPayload({ image: { contentType: 'application/pdf' } }))).toMatch(/JPEG|PNG|WebP/i);
  });

  it('rejects a photo over 5MB, measured after base64 decoding', () => {
    expect(validate(goodPayload({ image: { data: base64OfBytes(6 * 1024 * 1024) } }))).toMatch(/too large/i);
  });

  it('accepts a photo just under the limit', () => {
    expect(validate(goodPayload({ image: { data: base64OfBytes(4.9 * 1024 * 1024) } }))).toBeNull();
  });

  it('rejects an empty body without throwing', () => {
    expect(validate(undefined)).toMatch(/recipe/i);
    expect(validate({})).toMatch(/recipe/i);
  });
});
