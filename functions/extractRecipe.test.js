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

let publishedMatches = [];

const fakeDb = {
  // Rate limiting writes here.
  runTransaction: async (fn) => fn({
    get: async () => ({ exists: false, data: () => ({}) }),
    set: () => {}
  }),
  collection: (name) => ({
    doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }), set: async () => {} }),
    where: () => ({
      limit: () => ({
        get: async () => ({
          empty: name !== 'recipes' || publishedMatches.length === 0,
          docs: name === 'recipes' ? publishedMatches : []
        })
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
    publishedMatches = [];
    globalThis.fetch = vi.fn(() => {
      throw new Error('the page must not be fetched for a URL that is already published');
    });
  });

  it('routes a duplicate paste to the published recipe', async () => {
    publishedMatches = [{ data: () => ({ slug: 'kale-salad', title: 'Kale Salad' }) }];
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://example.com/kale-salad'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ duplicate: true, slug: 'kale-salad' });
  });

  it('never fetches the page for a duplicate, which is the point of checking first', async () => {
    publishedMatches = [{ data: () => ({ slug: 'kale-salad', title: 'Kale Salad' }) }];

    await extractRecipeOrchestrator(postUrl('https://example.com/kale-salad'), fakeRes());

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('matches a paste that carries tracking parameters the canonical URL lacks', async () => {
    publishedMatches = [{ data: () => ({ slug: 'kale-salad', title: 'Kale Salad' }) }];
    const res = fakeRes();

    await extractRecipeOrchestrator(postUrl('https://example.com/kale-salad/?utm_source=pinterest'), res);

    expect(res.body.duplicate).toBe(true);
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
    publishedMatches = [];
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
