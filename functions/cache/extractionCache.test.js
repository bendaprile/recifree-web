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

const { normalizeUrl, hashUrl, checkCache, saveToCache } = require('./extractionCache');

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
