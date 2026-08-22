import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { slugify, validate, publisherNameFrom, lookupPublisherName, sourceUrlHashFor, buildPublishedDoc } = require('./publishRecipe');

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

describe('publisherNameFrom', () => {
  it('prefers the name on the profile over the one from the auth provider', () => {
    expect(publisherNameFrom(['Ben', 'Benjamin D'])).toBe('Ben');
  });

  it('falls back to the auth provider name when the profile has none', () => {
    // createUserProfile defaults displayName to '', so this is the common case
    // for anyone who signed up with Google.
    expect(publisherNameFrom(['', 'Benjamin D'])).toBe('Benjamin D');
  });

  it('never returns an email, because the byline is published to everyone', () => {
    expect(publisherNameFrom(['cook@example.com'])).toBeNull();
    expect(publisherNameFrom(['cook@example.com', 'Ben'])).toBe('Ben');
  });

  it('returns null when there is no usable name, rather than a placeholder', () => {
    expect(publisherNameFrom([])).toBeNull();
    expect(publisherNameFrom([null, undefined, '   '])).toBeNull();
  });

  it('caps a long name, which is free text the user typed', () => {
    expect(publisherNameFrom(['a'.repeat(200)])).toHaveLength(60);
  });
});

describe('lookupPublisherName', () => {
  const fakeDb = (profile) => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: Boolean(profile), data: () => profile })
      })
    })
  });
  const fakeAuth = (user) => ({ getUser: async () => user });

  it('reads the profile name', async () => {
    const name = await lookupPublisherName(fakeDb({ displayName: 'Ben' }), fakeAuth(null), 'uid-1');
    expect(name).toBe('Ben');
  });

  it('falls back to the auth record when no profile document exists', async () => {
    const name = await lookupPublisherName(fakeDb(null), fakeAuth({ displayName: 'Benjamin D' }), 'uid-1');
    expect(name).toBe('Benjamin D');
  });

  it('returns null without reading anything when there is no uid', async () => {
    const exploding = { collection: () => { throw new Error('should not be reached'); } };
    await expect(lookupPublisherName(exploding, fakeAuth(null), null)).resolves.toBeNull();
  });

  it('survives an auth lookup failure, which is its own promise', async () => {
    const brokenAuth = { getUser: async () => { throw new Error('user-not-found'); } };
    const name = await lookupPublisherName(fakeDb({ displayName: 'Ben' }), brokenAuth, 'uid-1');
    expect(name).toBe('Ben');
  });

  it('returns null when Firestore fails, so a publish is never lost to a byline', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const brokenDb = {
      collection: () => ({ doc: () => ({ get: async () => { throw new Error('unavailable'); } }) })
    };

    await expect(lookupPublisherName(brokenDb, fakeAuth(null), 'uid-1')).resolves.toBeNull();
    warn.mockRestore();
  });
});

describe('sourceUrlHashFor', () => {
  const { normalizeUrl, hashUrl } = require('./cache/extractionCache');
  const expected = (url) => hashUrl(normalizeUrl(url));

  it('hashes the source URL with the same key the extraction path uses', () => {
    const url = 'https://example.com/kale-salad';
    expect(sourceUrlHashFor({ source: { url } })).toBe(expected(url));
  });

  it('matches across the URL variations normalization exists to absorb', () => {
    const canonical = sourceUrlHashFor({ source: { url: 'https://example.com/kale-salad' } });

    expect(sourceUrlHashFor({ source: { url: 'https://example.com/kale-salad/' } })).toBe(canonical);
    expect(sourceUrlHashFor({ source: { url: 'https://example.com/kale-salad?utm_source=pinterest' } })).toBe(canonical);
    expect(sourceUrlHashFor({ source: { url: 'https://example.com/kale-salad#ingredients' } })).toBe(canonical);
  });

  it('distinguishes two different recipes on one site', () => {
    expect(sourceUrlHashFor({ source: { url: 'https://example.com/kale-salad' } }))
      .not.toBe(sourceUrlHashFor({ source: { url: 'https://example.com/potato-salad' } }));
  });

  it('returns null for a manual entry, which has no source to deduplicate on', () => {
    expect(sourceUrlHashFor({})).toBeNull();
    expect(sourceUrlHashFor({ source: {} })).toBeNull();
    expect(sourceUrlHashFor(undefined)).toBeNull();
  });

  it('returns null rather than throwing on an unparseable source URL', () => {
    expect(sourceUrlHashFor({ source: { url: 'not a url' } })).toBeNull();
  });
});

describe('buildPublishedDoc', () => {
  const draft = {
    title: 'Kale Salad',
    ingredients: [{ item: 'kale' }],
    instructions: ['Toss it.'],
    source: { name: 'Original Cook', url: 'https://example.com/kale-salad' }
  };

  const build = (recipe, overrides = {}) => buildPublishedDoc({
    recipe,
    slug: 'kale-salad',
    imageUrl: 'https://firebasestorage.googleapis.com/kale.jpg',
    publishedByName: 'Ben D',
    uid: 'uid-1',
    timestamp: 'SERVER_TIME',
    ...overrides
  });

  it('stores the deduplication key, so a later paste of that URL finds this recipe', () => {
    const { normalizeUrl, hashUrl } = require('./cache/extractionCache');

    expect(build(draft).sourceUrlHash).toBe(hashUrl(normalizeUrl('https://example.com/kale-salad')));
  });

  it('stores both halves of the attribution', () => {
    const doc = build(draft);

    expect(doc.publishedByName).toBe('Ben D');
    expect(doc.publishedByUid).toBe('uid-1');
    expect(doc.source.url).toBe('https://example.com/kale-salad');
  });

  it('overrides anything the client tried to set for itself', () => {
    const crafted = {
      ...draft,
      publishedByName: 'Someone Else',
      publishedByUid: 'uid-victim',
      sourceUrlHash: 'forged',
      slug: 'not-this-slug',
      image: 'https://evil.example/hotlinked.jpg'
    };
    const doc = build(crafted);

    expect(doc.publishedByName).toBe('Ben D');
    expect(doc.publishedByUid).toBe('uid-1');
    expect(doc.sourceUrlHash).not.toBe('forged');
    expect(doc.slug).toBe('kale-salad');
    expect(doc.image).toBe('https://firebasestorage.googleapis.com/kale.jpg');
  });

  it('drops extraction metadata rather than publishing it', () => {
    const doc = build({ ...draft, _extractionMeta: { cacheHit: true } });

    expect(doc._extractionMeta).toBeUndefined();
  });

  it('stringifies stepIngredients, which Firestore cannot store as nested arrays', () => {
    const doc = build({ ...draft, stepIngredients: [[0, 1], [2]] });

    expect(doc.stepIngredients).toBe('[[0,1],[2]]');
  });

  it('leaves a manual entry with no deduplication key', () => {
    const manual = { title: 'Grandma Mug Cake', ingredients: [], instructions: [] };

    expect(build(manual).sourceUrlHash).toBeNull();
  });
});
