import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { findPublishedByUrlHash } = require('./publishedLookup');

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
