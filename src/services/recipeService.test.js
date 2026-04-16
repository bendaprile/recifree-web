import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firestore module before importing the service
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

vi.mock('../config/firebase', () => ({ db: {} }));

import * as firestoreModule from 'firebase/firestore';
import { getAllRecipes, getRecipeBySlug, isSlugTaken, generateUniqueSlug } from './recipeService';

const mockRecipeA = {
  id: 'test-pasta',
  slug: 'test-pasta',
  title: 'Test Pasta',
  tags: ['Dinner'],
  description: 'A test pasta recipe.',
};

const mockRecipeB = {
  id: 'test-soup',
  slug: 'test-soup',
  title: 'Test Soup',
  tags: ['Lunch'],
  description: 'A test soup recipe.',
};

function makeSnapshot(docs) {
  return {
    empty: docs.length === 0,
    docs: docs.map(data => ({ id: 'auto-doc-id', data: () => data })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  firestoreModule.collection.mockReturnValue('recipes-ref');
  firestoreModule.query.mockReturnValue('query-ref');
  firestoreModule.where.mockReturnValue('where-ref');
});

// ─── getAllRecipes ───────────────────────────────────────────────────────────
describe('getAllRecipes', () => {
  it('returns recipes from Firestore sorted by title', async () => {
    firestoreModule.getDocs.mockResolvedValue(makeSnapshot([mockRecipeB, mockRecipeA]));
    const result = await getAllRecipes();
    expect(result[0].title).toBe('Test Pasta');
    expect(result[1].title).toBe('Test Soup');
  });

  it('falls back to static data when Firestore snapshot is empty', async () => {
    firestoreModule.getDocs.mockResolvedValue(makeSnapshot([]));
    const result = await getAllRecipes();
    // staticRecipes has 30 recipes, result should be array
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to static data when Firestore throws', async () => {
    firestoreModule.getDocs.mockRejectedValue(new Error('Network error'));
    const result = await getAllRecipes();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── getRecipeBySlug ─────────────────────────────────────────────────────────
describe('getRecipeBySlug', () => {
  it('returns a recipe when found in Firestore', async () => {
    firestoreModule.getDocs.mockResolvedValue(makeSnapshot([mockRecipeA]));
    const result = await getRecipeBySlug('test-pasta');
    expect(result.slug).toBe('test-pasta');
    expect(result.title).toBe('Test Pasta');
  });

  it('returns null when slug is not in Firestore', async () => {
    firestoreModule.getDocs.mockResolvedValue(makeSnapshot([]));
    const result = await getRecipeBySlug('non-existent-slug');
    expect(result).toBeNull();
  });

  it('falls back to static data when Firestore throws', async () => {
    firestoreModule.getDocs.mockRejectedValue(new Error('Unavailable'));
    // 'hot-honey-feta-chicken' exists in static data
    const result = await getRecipeBySlug('hot-honey-feta-chicken');
    expect(result).not.toBeNull();
    expect(result.id).toBe('hot-honey-feta-chicken');
  });

  it('returns null from static data for unknown slug when Firestore throws', async () => {
    firestoreModule.getDocs.mockRejectedValue(new Error('Unavailable'));
    const result = await getRecipeBySlug('totally-unknown-xyz');
    expect(result).toBeNull();
  });
});

// ─── isSlugTaken ─────────────────────────────────────────────────────────────
describe('isSlugTaken', () => {
  it('returns true when a matching doc exists', async () => {
    firestoreModule.getDocs.mockResolvedValue(makeSnapshot([mockRecipeA]));
    expect(await isSlugTaken('test-pasta')).toBe(true);
  });

  it('returns false when no matching doc exists', async () => {
    firestoreModule.getDocs.mockResolvedValue(makeSnapshot([]));
    expect(await isSlugTaken('new-slug')).toBe(false);
  });

  it('returns false on Firestore error (safe default)', async () => {
    firestoreModule.getDocs.mockRejectedValue(new Error('fail'));
    expect(await isSlugTaken('any-slug')).toBe(false);
  });
});

// ─── generateUniqueSlug ──────────────────────────────────────────────────────
describe('generateUniqueSlug', () => {
  it('returns the base slug when it is not taken', async () => {
    firestoreModule.getDocs.mockResolvedValue(makeSnapshot([]));
    const result = await generateUniqueSlug('chicken-soup');
    expect(result).toBe('chicken-soup');
  });

  it('appends -2 when base slug is taken once', async () => {
    firestoreModule.getDocs
      .mockResolvedValueOnce(makeSnapshot([mockRecipeA])) // 'chicken-soup' taken
      .mockResolvedValueOnce(makeSnapshot([]));            // 'chicken-soup-2' free
    const result = await generateUniqueSlug('chicken-soup');
    expect(result).toBe('chicken-soup-2');
  });

  it('increments suffix until a free slug is found', async () => {
    firestoreModule.getDocs
      .mockResolvedValueOnce(makeSnapshot([mockRecipeA])) // taken
      .mockResolvedValueOnce(makeSnapshot([mockRecipeA])) // taken
      .mockResolvedValueOnce(makeSnapshot([]));            // free
    const result = await generateUniqueSlug('chicken-soup');
    expect(result).toBe('chicken-soup-3');
  });
});

// ─── mapRecipeFromFirestore logic (implicit) ─────────────────────────────────
describe('Firestore Data Mapping', () => {
  it('parses stringified stepIngredients back into an array', async () => {
    const mockRecipeStr = {
      ...mockRecipeA,
      stepIngredients: JSON.stringify([['salt', 'pepper']]),
    };
    firestoreModule.getDocs.mockResolvedValue(makeSnapshot([mockRecipeStr]));
    const result = await getRecipeBySlug('test-pasta');
    expect(result.stepIngredients).toEqual([['salt', 'pepper']]);
  });

  it('handles invalid stringified stepIngredients gracefully', async () => {
    const mockRecipeInvalid = {
      ...mockRecipeA,
      stepIngredients: 'invalid-json',
    };
    firestoreModule.getDocs.mockResolvedValue(makeSnapshot([mockRecipeInvalid]));
    const result = await getRecipeBySlug('test-pasta');
    expect(result.stepIngredients).toBe('invalid-json');
  });
});
