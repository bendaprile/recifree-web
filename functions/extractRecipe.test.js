import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

/**
 * Drives the real orchestrator for the one path that must never reach the
 * network: a URL someone has already published. Firestore is faked; everything
 * else — caller identification, rate limiting, normalization, the duplicate
 * lookup — is the code that deploys.
 */
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

if (admin.apps.length === 0) admin.initializeApp();

const { normalizeUrl, hashUrl } = require('./cache/extractionCache');

/** The deduplication key for a URL, computed the way the function computes it. */
const keyFor = (url) => hashUrl(normalizeUrl(url));

/**
 * Published recipes, keyed by their sourceUrlHash. Matching on the hash rather
 * than answering every query is the point: a test that redirects to a match has
 * to prove the *alternate* address matched, not the pasted one.
 */
let publishedByHash = {};

/** Extraction cache documents, keyed by their url hash. */
let cachedByHash = {};

const fakeDb = {
  // Rate limiting writes here.
  runTransaction: async (fn) => fn({
    get: async () => ({ exists: false, data: () => ({}) }),
    set: () => {}
  }),
  collection: (name) => ({
    doc: (id) => ({
      get: async () => ({
        exists: name === 'extraction_cache' && Boolean(cachedByHash[id]),
        data: () => cachedByHash[id]
      }),
      set: async () => {}
    }),
    where: (field, op, value) => ({
      limit: () => ({
        get: async () => {
          const hit = name === 'recipes' ? publishedByHash[value] : null;
          return { empty: !hit, docs: hit ? [{ data: () => hit }] : [] };
        }
      })
    })
  })
};

Object.defineProperty(admin, 'firestore', { value: () => fakeDb, configurable: true });

const { extractRecipeOrchestrator, siteName } = require('./extractRecipe');

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    set: vi.fn(),
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    send(payload) { this.body = payload; return this; }
  };
  return res;
}

const postUrl = (url) => ({
  method: 'POST',
  headers: { 'x-forwarded-for': '203.0.113.9' },
  ip: '203.0.113.9',
  body: { url }
});

describe('extractRecipe paste deduplication', () => {
  beforeEach(() => {
    publishedByHash = {};
    cachedByHash = {};
    globalThis.fetch = vi.fn(() => {
      throw new Error('the page must not be fetched for a URL that is already published');
    });
  });

  it('routes a duplicate paste to the published recipe', async () => {
    publishedByHash[keyFor('https://example.com/kale-salad')] = { slug: 'kale-salad' };
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://example.com/kale-salad'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ duplicate: true, slug: 'kale-salad' });
  });

  it('never fetches the page for a duplicate, which is the point of checking first', async () => {
    publishedByHash[keyFor('https://example.com/kale-salad')] = { slug: 'kale-salad' };

    await extractRecipeOrchestrator(postUrl('https://example.com/kale-salad'), fakeRes());

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('matches a paste that carries tracking parameters the canonical URL lacks', async () => {
    publishedByHash[keyFor('https://example.com/kale-salad')] = { slug: 'kale-salad' };
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://example.com/kale-salad/?utm_source=pinterest'), res);

    expect(res.body.duplicate).toBe(true);
  });

  it('hands the deduplication key back with the recipe', async () => {
    // The shelf uses it to recognise a URL the user already holds, without the
    // frontend reimplementing normalizeUrl and drifting from it.
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => `<html><script type="application/ld+json">${JSON.stringify({
        '@type': 'Recipe',
        name: 'Kale Salad',
        recipeIngredient: ['1 cup kale'],
        recipeInstructions: [{ '@type': 'HowToStep', text: 'Toss it.' }]
      })}</script></html>`
    }));
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://example.com/kale-salad'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.sourceUrlHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches a shortened link against the page it redirects to', async () => {
    // The paste and the recipe hash differently; only the address the fetch
    // landed on matches what is in the catalog.
    publishedByHash[keyFor('https://www.gimmesomeoven.com/cajun-seasoning/')] = { slug: 'cajun-seasoning' };
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      url: 'https://www.gimmesomeoven.com/cajun-seasoning/',
      text: async () => '<html></html>'
    }));
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://pin.it/shortlink'), res);

    expect(res.body).toEqual({ duplicate: true, slug: 'cajun-seasoning' });
  });

  it('matches the publisher\'s canonical address', async () => {
    publishedByHash[keyFor('https://www.gimmesomeoven.com/cajun-seasoning/')] = { slug: 'cajun-seasoning' };
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      url: 'https://www.gimmesomeoven.com/?p=1234',
      text: async () => '<html><head><link rel="canonical" href="https://www.gimmesomeoven.com/cajun-seasoning/"/></head></html>'
    }));
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://www.gimmesomeoven.com/?p=1234'), res);

    expect(res.body).toEqual({ duplicate: true, slug: 'cajun-seasoning' });
  });

  it('still deduplicates when the paste is already in the extraction cache', async () => {
    // A cache hit returns before the page is fetched, so the redirect and
    // canonical checks never run. The cached source URL has to carry it.
    const pasted = 'https://pin.it/shortlink';
    cachedByHash[keyFor(pasted)] = {
      title: 'Cajun Seasoning',
      source: { url: 'https://www.gimmesomeoven.com/cajun-seasoning/' }
    };
    publishedByHash[keyFor('https://www.gimmesomeoven.com/cajun-seasoning/')] = { slug: 'cajun-seasoning' };
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl(pasted), res);

    expect(res.body).toEqual({ duplicate: true, slug: 'cajun-seasoning' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns the cached recipe when nothing matches it in the catalog', async () => {
    const pasted = 'https://example.com/kale-salad';
    cachedByHash[keyFor(pasted)] = { title: 'Kale Salad', source: { url: pasted } };
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl(pasted), res);

    expect(res.body.title).toBe('Kale Salad');
    expect(res.body.sourceUrlHash).toBe(keyFor(pasted));
  });

  it('extracts as normal when nothing has been published from that URL', async () => {
    // Nothing matches, so the orchestrator goes on to fetch the page. The stub
    // throws, which is what proves the code got that far.
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://example.com/brand-new'), res);

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(res.body).not.toEqual(expect.objectContaining({ duplicate: true }));
  });
});

describe('extractRecipe manual-entry fallbacks', () => {
  beforeEach(() => {
    publishedByHash = {};
    cachedByHash = {};
  });

  it('names the site when a publisher blocks the fetch', async () => {
    // eatingwell.com sits behind Cloudflare bot management and answers a
    // server-side fetch with a challenge page. There is no recipe to parse.
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 402 }));
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://www.eatingwell.com/recipe/278023/spinach-mushroom-quiche/'), res);

    expect(res.statusCode).toBe(422);
    expect(res.body.error).toContain('eatingwell.com');
    expect(res.body.canRetryManually).toBe(true);
  });

  it('drops the www, because that is not how anyone names a site', async () => {
    expect(siteName('https://www.eatingwell.com/recipe/278023/')).toBe('eatingwell.com');
    expect(siteName('https://inspiredtaste.net/24593/')).toBe('inspiredtaste.net');
  });

  it('does not leak the HTTP status into the message a reader sees', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 402 }));
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://www.eatingwell.com/recipe/278023/'), res);

    expect(res.body.error).not.toMatch(/402/);
  });

  it('offers manual entry when the page loads but carries no recipe data', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => '<html><body>No recipe here.</body></html>' }));
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://example.com/not-a-recipe'), res);

    expect(res.statusCode).toBe(422);
    expect(res.body.error).toContain('example.com');
    expect(res.body.canRetryManually).toBe(true);
  });
});
