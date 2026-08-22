// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import http from 'http';

/**
 * These drive the real ssrRecipe handler: the same routing, JSON-LD build, and
 * HTML injection that deploys. Only Firestore is stubbed, because the thing
 * under test is what reaches the page, not the read.
 *
 * index.js calls admin.initializeApp() and admin.firestore() at module scope,
 * so both are replaced before it is required.
 */
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

let fixture = null;

const fakeDb = {
  collection: () => ({
    where: () => ({
      limit: () => ({
        get: async () => ({
          empty: fixture === null,
          docs: fixture === null ? [] : [{ data: () => fixture }]
        })
      })
    })
  })
};

// Both are getter-only on the admin namespace, so they need defineProperty.
Object.defineProperty(admin, 'initializeApp', { value: () => ({}), configurable: true });
Object.defineProperty(admin, 'firestore', { value: () => fakeDb, configurable: true });

const { ssrRecipe } = require('./index.js');

// A title that closes the script tag it is rendered inside. Recipe titles come
// from third-party pages, so this is the shape an attack would take.
const HOSTILE_TITLE = '</script><script>alert(1)</script>';

const publishedRecipe = {
  id: 'kale-salad',
  slug: 'kale-salad',
  title: 'Kale Salad',
  description: 'Crisp and green.',
  image: 'https://firebasestorage.googleapis.com/example.jpg',
  ingredients: [{ item: 'kale', amount: '1', unit: 'cup' }],
  instructions: ['Toss it.'],
  publishedByUid: 'uid-1',
  publishedByName: 'Ben D',
  source: { name: 'Original Cook', url: 'https://example.com/kale' }
};

let server;
let baseUrl;

beforeAll(async () => {
  server = http.createServer((req, res) => ssrRecipe(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return () => server.close();
});

async function renderPage(recipe) {
  fixture = recipe;
  const response = await fetch(`${baseUrl}/recipe/${recipe.slug}`);
  return response.text();
}

function jsonLdFrom(html) {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return block ? JSON.parse(block[1]) : null;
}

describe('ssrRecipe dual attribution', () => {
  it('credits the publisher as the author of this version', async () => {
    const jsonLd = jsonLdFrom(await renderPage(publishedRecipe));

    expect(jsonLd.author).toEqual({ '@type': 'Person', name: 'Ben D' });
  });

  it('credits the original page as what the recipe is based on', async () => {
    const jsonLd = jsonLdFrom(await renderPage(publishedRecipe));

    expect(jsonLd.isBasedOn).toBe('https://example.com/kale');
  });

  it('sends the byline to the client, so the page renders it without a second read', async () => {
    const html = await renderPage(publishedRecipe);

    expect(html).toMatch(/window\.__INITIAL_RECIPE__ = .*"publishedByName":"Ben D"/);
  });

  it('falls back to Recifree for recipes published before bylines existed', async () => {
    const legacy = { ...publishedRecipe };
    delete legacy.publishedByName;
    delete legacy.source;
    const jsonLd = jsonLdFrom(await renderPage(legacy));

    expect(jsonLd.author).toEqual({ '@type': 'Organization', name: 'Recifree' });
    expect(jsonLd.isBasedOn).toBeUndefined();
  });
});

describe('ssrRecipe script-tag safety', () => {
  it('a hostile title cannot close the JSON-LD script tag', async () => {
    const html = await renderPage({ ...publishedRecipe, title: HOSTILE_TITLE });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(jsonLdFrom(html).name).toBe(HOSTILE_TITLE);
  });

  it('a hostile byline cannot close the JSON-LD script tag', async () => {
    // The byline is capped and stripped of emails at publish time, but it is
    // still user-typed text arriving in a script block.
    const html = await renderPage({ ...publishedRecipe, publishedByName: HOSTILE_TITLE });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(jsonLdFrom(html).author.name).toBe(HOSTILE_TITLE);
  });
});
