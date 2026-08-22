import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { findPublishedByUrlHash, alternateUrlsFor } = require('./publishedLookup');

const fakeDb = (docs) => ({
  collection: () => ({
    where: () => ({
      limit: () => ({
        get: async () => ({ empty: docs.length === 0, docs })
      })
    })
  })
});

const doc = (data) => ({ data: () => data });

describe('findPublishedByUrlHash', () => {
  it('returns the slug of a recipe already published from that URL', async () => {
    const db = fakeDb([doc({ slug: 'kale-salad', title: 'Kale Salad' })]);

    await expect(findPublishedByUrlHash(db, 'abc123')).resolves.toBe('kale-salad');
  });

  it('returns null when nothing matches, which is the common case', async () => {
    await expect(findPublishedByUrlHash(fakeDb([]), 'abc123')).resolves.toBeNull();
  });

  it('returns null without querying when there is no hash', async () => {
    const exploding = { collection: () => { throw new Error('should not be reached'); } };
    await expect(findPublishedByUrlHash(exploding, null)).resolves.toBeNull();
  });

  it('ignores a match with no slug, which there is no way to route to', async () => {
    const db = fakeDb([doc({ title: 'Half-written recipe' })]);
    await expect(findPublishedByUrlHash(db, 'abc123')).resolves.toBeNull();
  });

  it('falls back to extracting when the query fails, rather than dead-ending the paste', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const brokenDb = {
      collection: () => ({
        where: () => ({ limit: () => ({ get: async () => { throw new Error('unavailable'); } }) })
      })
    };

    await expect(findPublishedByUrlHash(brokenDb, 'abc123')).resolves.toBeNull();
    error.mockRestore();
  });
});

describe('alternateUrlsFor', () => {
  const canonicalHtml = (href) => `<html><head><link rel="canonical" href="${href}"/></head><body></body></html>`;

  it('reports the address a redirect landed on', () => {
    // A Pinterest outbound link or a shortener never matches the recipe's own key.
    expect(alternateUrlsFor('https://pin.it/abc', 'https://gimmesomeoven.com/cajun-seasoning/', '<html></html>'))
      .toEqual(['https://gimmesomeoven.com/cajun-seasoning/']);
  });

  it('reports the publisher\'s own canonical address', () => {
    const alternates = alternateUrlsFor(
      'https://gimmesomeoven.com/?p=1234',
      'https://gimmesomeoven.com/?p=1234',
      canonicalHtml('https://gimmesomeoven.com/cajun-seasoning/')
    );

    expect(alternates).toEqual(['https://gimmesomeoven.com/cajun-seasoning/']);
  });

  it('ignores a canonical pointing at another site', () => {
    // A misconfigured tag would otherwise route the reader to someone else's recipe.
    expect(alternateUrlsFor(
      'https://gimmesomeoven.com/cajun-seasoning',
      'https://gimmesomeoven.com/cajun-seasoning',
      canonicalHtml('https://competitor.example/their-recipe')
    )).toEqual([]);
  });

  it('treats www and the bare domain as the same host', () => {
    expect(alternateUrlsFor(
      'https://gimmesomeoven.com/?p=1',
      'https://gimmesomeoven.com/?p=1',
      canonicalHtml('https://www.gimmesomeoven.com/cajun-seasoning')
    )).toEqual(['https://www.gimmesomeoven.com/cajun-seasoning']);
  });

  it('reports nothing when the paste already is the page address', () => {
    const url = 'https://gimmesomeoven.com/cajun-seasoning';
    expect(alternateUrlsFor(url, url, canonicalHtml(url))).toEqual([]);
  });

  it('survives html with no canonical, malformed html, and no html at all', () => {
    const url = 'https://gimmesomeoven.com/cajun-seasoning';
    expect(alternateUrlsFor(url, url, '<html><head>')).toEqual([]);
    expect(alternateUrlsFor(url, url, '')).toEqual([]);
    expect(alternateUrlsFor(url, url, null)).toEqual([]);
  });

  it('ignores an unparseable canonical href', () => {
    const url = 'https://gimmesomeoven.com/cajun-seasoning';
    expect(alternateUrlsFor(url, url, canonicalHtml('not a url'))).toEqual([]);
  });
});
