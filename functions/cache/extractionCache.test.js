import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const mockDocRef = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockCollectionRef = {
  doc: vi.fn(() => mockDocRef),
};

const mockDb = {
  collection: vi.fn(() => mockCollectionRef),
};

// Stub firebase-admin's firestore method using defineProperty
Object.defineProperty(admin, 'firestore', {
  get: () => () => mockDb,
  configurable: true
});

const { normalizeUrl, hashUrl, checkCache, saveToCache, stripExtractorIdentity } = require('./extractionCache');

describe('extractionCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeUrl', () => {
    it('converts hostname to lowercase', () => {
      expect(normalizeUrl('https://SUNDAYBAKER.CO/best-chocolate-chip-cookies'))
        .toBe('https://sundaybaker.co/best-chocolate-chip-cookies');
    });

    it('strips trailing slashes from pathnames', () => {
      expect(normalizeUrl('https://sundaybaker.co/best-chocolate-chip-cookies/'))
        .toBe('https://sundaybaker.co/best-chocolate-chip-cookies');
    });

    it('strips anchor hashes', () => {
      expect(normalizeUrl('https://sundaybaker.co/best-cookies#print-recipe'))
        .toBe('https://sundaybaker.co/best-cookies');
    });

    it('removes marketing and analytics parameters (UTM, gclid, fbclid)', () => {
      const complexUrl = 'https://sundaybaker.co/cookies?' +
        'utm_source=newsletter' +
        '&utm_medium=email' +
        '&utm_campaign=cookie_fest' +
        '&utm_term=chocolate' +
        '&utm_content=footer' +
        '&gclid=XYZ123' +
        '&fbclid=ABC456' +
        '&recipe_id=987';
      expect(normalizeUrl(complexUrl)).toBe('https://sundaybaker.co/cookies?recipe_id=987');
    });

    it('sorts remaining query parameters deterministically', () => {
      const url = 'https://example.com/search?z=third&a=first&m=second';
      expect(normalizeUrl(url)).toBe('https://example.com/search?a=first&m=second&z=third');
    });

    it('throws error for invalid or empty URL', () => {
      expect(() => normalizeUrl('')).toThrow('URL must be a non-empty string');
      expect(() => normalizeUrl(123)).toThrow('URL must be a non-empty string');
      expect(() => normalizeUrl('not-a-valid-url')).toThrow('Invalid URL');
    });
  });

  describe('hashUrl', () => {
    it('generates a valid hex SHA-256 hash of correct length', () => {
      const hash = hashUrl('https://example.com/cookies');
      expect(hash).toHaveLength(64); // SHA-256 hex is 64 characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces identical hashes for identical inputs', () => {
      const hash1 = hashUrl('https://example.com/cookies');
      const hash2 = hashUrl('https://example.com/cookies');
      expect(hash1).toBe(hash2);
    });

    it('throws on invalid URL input', () => {
      expect(() => hashUrl('')).toThrow('Normalized URL must be a non-empty string');
      expect(() => hashUrl(null)).toThrow('Normalized URL must be a non-empty string');
    });
  });

  describe('Firestore Cache Integration', () => {
    const mockRecipe = {
      id: 'best-cookies',
      title: 'Best Cookies',
      ingredients: [],
      instructions: []
    };

    describe('checkCache', () => {
      it('returns null on cache miss (document does not exist)', async () => {
        mockDocRef.get.mockResolvedValueOnce({
          exists: false,
          data: () => null
        });

        const result = await checkCache('some-hash');
        expect(result).toBeNull();
        expect(mockDb.collection).toHaveBeenCalledWith('extraction_cache');
      });

      it('returns recipe data with cacheHit metadata on cache hit (document exists)', async () => {
        mockDocRef.get.mockResolvedValueOnce({
          exists: true,
          data: () => ({ ...mockRecipe })
        });

        const result = await checkCache('some-hash');
        expect(result).not.toBeNull();
        expect(result.id).toBe('best-cookies');
        expect(result._extractionMeta).toBeDefined();
        expect(result._extractionMeta.cacheHit).toBe(true);
      });

      it('parses stringified stepIngredients on cache hit', async () => {
        mockDocRef.get.mockResolvedValueOnce({
          exists: true,
          data: () => ({
            ...mockRecipe,
            stepIngredients: '[[0,1],[2]]'
          })
        });

        const result = await checkCache('some-hash');
        expect(result.stepIngredients).toEqual([[0, 1], [2]]);
      });

      it('preserves existing _extractionMeta when adding cacheHit', async () => {
        mockDocRef.get.mockResolvedValueOnce({
          exists: true,
          data: () => ({
            ...mockRecipe,
            _extractionMeta: {
              method: 'ld+json',
              parsedAt: '2026-05-19T00:00:00Z'
            }
          })
        });

        const result = await checkCache('some-hash');
        expect(result._extractionMeta.method).toBe('ld+json');
        expect(result._extractionMeta.cacheHit).toBe(true);
      });

      it('does not leak the extracting user to the next caller (legacy documents)', async () => {
        // A document written before stripExtractorIdentity existed still carries the
        // email of whoever ran the extraction. The cache is shared across all users,
        // so returning it hands one user's identity to another.
        mockDocRef.get.mockResolvedValueOnce({
          exists: true,
          data: () => ({
            ...mockRecipe,
            _extractionMeta: {
              method: 'ld+json',
              parsedAt: '2026-05-19T00:00:00Z',
              extractedBy: 'first-user@example.com'
            }
          })
        });

        const result = await checkCache('some-hash');
        expect(result._extractionMeta.extractedBy).toBeUndefined();
        expect(JSON.stringify(result)).not.toContain('first-user@example.com');
        // The non-identifying diagnostics survive.
        expect(result._extractionMeta.method).toBe('ld+json');
        expect(result._extractionMeta.cacheHit).toBe(true);
      });

      it('handles Firestore error gracefully and returns null', async () => {
        mockDocRef.get.mockRejectedValueOnce(new Error('Firestore unavailable'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = await checkCache('some-hash');
        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('saveToCache', () => {
      it('successfully saves recipe data to Firestore extraction_cache document', async () => {
        mockDocRef.set.mockResolvedValueOnce();

        await saveToCache('some-hash', mockRecipe);
        expect(mockDocRef.set).toHaveBeenCalledWith(mockRecipe);
      });

      it('stringifies stepIngredients array before saving to Firestore', async () => {
        mockDocRef.set.mockResolvedValueOnce();
        const recipeWithSteps = {
          ...mockRecipe,
          stepIngredients: [[0, 1], [2]]
        };

        await saveToCache('some-hash', recipeWithSteps);
        expect(mockDocRef.set).toHaveBeenCalledWith({
          ...mockRecipe,
          stepIngredients: '[[0,1],[2]]'
        });
      });

      it('handles Firestore save error gracefully without throwing', async () => {
        mockDocRef.set.mockRejectedValueOnce(new Error('Write forbidden'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(saveToCache('some-hash', mockRecipe)).resolves.not.toThrow();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });
});

describe('extractionCache identity scrubbing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never writes the extracting user into the shared cache', async () => {
    mockDocRef.set.mockResolvedValueOnce();

    await saveToCache('some-hash', {
      id: 'best-cookies',
      _extractionMeta: {
        method: 'llm',
        parsedAt: '2026-05-19T00:00:00Z',
        extractedBy: 'uploader@example.com'
      }
    });

    const written = mockDocRef.set.mock.calls[0][0];
    expect(written._extractionMeta.extractedBy).toBeUndefined();
    expect(written._extractionMeta.method).toBe('llm');
    expect(JSON.stringify(written)).not.toContain('uploader@example.com');
  });

  it('does not mutate the caller\'s object while scrubbing', async () => {
    mockDocRef.set.mockResolvedValueOnce();

    const original = {
      id: 'best-cookies',
      _extractionMeta: { method: 'llm', extractedBy: 'uploader@example.com' }
    };
    await saveToCache('some-hash', original);

    // extractRecipe.js returns this same object to the client after caching it,
    // so a scrub that mutated in place would be fine here but a shared-reference
    // bug elsewhere would not be. Pin the copy-on-write behavior.
    expect(original._extractionMeta.extractedBy).toBe('uploader@example.com');
  });

  it('tolerates recipes with no extraction metadata at all', () => {
    expect(() => stripExtractorIdentity({ id: 'x' })).not.toThrow();
    expect(() => stripExtractorIdentity(null)).not.toThrow();
    expect(() => stripExtractorIdentity(undefined)).not.toThrow();
  });
});
