import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { getReviews, saveReview, deleteReview, summarizeReviews, validateReview, MAX_REVIEW_TEXT } from './reviewService';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, path) => ({ path })),
  doc: vi.fn((db, path, id) => ({ path, id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP')
}));

const currentUser = { uid: 'uid-1', emailVerified: true, displayName: 'Ben D' };
vi.mock('../config/firebase', () => ({
  db: 'MOCK_DB',
  auth: { get currentUser() { return globalThis.__testUser; } }
}));

const snapshotOf = (entries) => ({
  docs: entries.map(([id, data]) => ({ id, data: () => data }))
});

describe('reviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.__testUser = { ...currentUser };
  });

  describe('getReviews', () => {
    it('reads one recipe\'s reviews, keyed by the reviewer uid', async () => {
      firestore.getDocs.mockResolvedValue(snapshotOf([['uid-1', { rating: 5, text: 'Great.' }]]));

      const reviews = await getReviews('kale-salad');

      expect(firestore.collection).toHaveBeenCalledWith('MOCK_DB', 'reviews/kale-salad/entries');
      expect(reviews).toEqual([{ uid: 'uid-1', rating: 5, text: 'Great.' }]);
    });

    it('returns newest first', async () => {
      firestore.getDocs.mockResolvedValue(snapshotOf([
        ['old', { rating: 3, createdAt: { toMillis: () => 1000 } }],
        ['new', { rating: 4, createdAt: { toMillis: () => 5000 } }]
      ]));

      const reviews = await getReviews('kale-salad');

      expect(reviews.map(r => r.uid)).toEqual(['new', 'old']);
    });

    it('returns nothing rather than throwing, so the recipe still renders', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      firestore.getDocs.mockRejectedValue(new Error('unavailable'));

      await expect(getReviews('kale-salad')).resolves.toEqual([]);
      error.mockRestore();
    });

    it('returns nothing without querying when there is no slug', async () => {
      await expect(getReviews(undefined)).resolves.toEqual([]);
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });
  });

  describe('saveReview', () => {
    it('writes the review under the reviewer uid', async () => {
      firestore.getDoc.mockResolvedValue({ exists: () => false });

      await saveReview('kale-salad', { rating: 5, text: '  Made it twice.  ' });

      expect(firestore.doc).toHaveBeenCalledWith('MOCK_DB', 'reviews/kale-salad/entries', 'uid-1');
      const written = firestore.setDoc.mock.calls[0][1];
      expect(written).toMatchObject({ rating: 5, text: 'Made it twice.', authorName: 'Ben D' });
    });

    it('takes the author name from the signed-in user, never from the caller', async () => {
      // firestore.rules pins authorName to the identity provider's name, so a
      // caller-supplied one would only ever be rejected.
      globalThis.__testUser = { ...currentUser, displayName: 'Real Name' };
      firestore.getDoc.mockResolvedValue({ exists: () => false });

      await saveReview('kale-salad', { rating: 4, text: 'Good.', authorName: 'Gordon Ramsay' });

      expect(firestore.setDoc.mock.calls[0][1].authorName).toBe('Real Name');
    });

    it('stores no name for an account that has none', async () => {
      globalThis.__testUser = { ...currentUser, displayName: '' };
      firestore.getDoc.mockResolvedValue({ exists: () => false });

      await saveReview('kale-salad', { rating: 4, text: 'Good.' });

      expect(firestore.setDoc.mock.calls[0][1].authorName).toBeNull();
    });

    it('keeps the original date when a review is edited', async () => {
      firestore.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ createdAt: 'ORIGINAL' }) });

      await saveReview('kale-salad', { rating: 2, text: 'Changed my mind.' });

      const written = firestore.setDoc.mock.calls[0][1];
      expect(written.createdAt).toBe('ORIGINAL');
      expect(written.updatedAt).toBe('MOCK_TIMESTAMP');
    });

    it('refuses a signed-out caller', async () => {
      globalThis.__testUser = null;
      await expect(saveReview('kale-salad', { rating: 5, text: '' })).rejects.toThrow(/signed in/i);
      expect(firestore.setDoc).not.toHaveBeenCalled();
    });

    it('refuses an unverified account, matching the rule', async () => {
      globalThis.__testUser = { ...currentUser, emailVerified: false };
      await expect(saveReview('kale-salad', { rating: 5, text: '' })).rejects.toThrow(/verify/i);
      expect(firestore.setDoc).not.toHaveBeenCalled();
    });

    it('refuses a rating the rules would reject, with a sentence a person can act on', async () => {
      await expect(saveReview('kale-salad', { rating: 6, text: '' })).rejects.toThrow(/1 to 5/);
      await expect(saveReview('kale-salad', { rating: 4.5, text: '' })).rejects.toThrow(/1 to 5/);
      expect(firestore.setDoc).not.toHaveBeenCalled();
    });
  });

  describe('deleteReview', () => {
    it('removes the signed-in user\'s own review', async () => {
      await deleteReview('kale-salad');

      expect(firestore.deleteDoc).toHaveBeenCalledWith({ path: 'reviews/kale-salad/entries', id: 'uid-1' });
    });

    it('refuses a signed-out caller', async () => {
      globalThis.__testUser = null;
      await expect(deleteReview('kale-salad')).rejects.toThrow(/signed in/i);
    });
  });

  describe('validateReview', () => {
    it('accepts a rating with no text, because stars alone are a review', () => {
      expect(validateReview({ rating: 4, text: '' })).toBeNull();
    });

    it('rejects text past the limit the rule enforces', () => {
      expect(validateReview({ rating: 4, text: 'x'.repeat(MAX_REVIEW_TEXT + 1) })).toMatch(/under 1000/);
      expect(validateReview({ rating: 4, text: 'x'.repeat(MAX_REVIEW_TEXT) })).toBeNull();
    });

    it('rejects an empty call without throwing', () => {
      expect(validateReview()).toMatch(/rating/i);
    });
  });

  describe('summarizeReviews', () => {
    it('averages the ratings and counts them', () => {
      expect(summarizeReviews([{ rating: 5 }, { rating: 4 }])).toEqual({ count: 2, average: 4.5 });
    });

    it('rounds to one decimal', () => {
      expect(summarizeReviews([{ rating: 5 }, { rating: 4 }, { rating: 4 }]).average).toBe(4.3);
    });

    it('reports no average for a recipe nobody has reviewed', () => {
      expect(summarizeReviews([])).toEqual({ count: 0, average: null });
      expect(summarizeReviews()).toEqual({ count: 0, average: null });
    });

    it('ignores an entry with no usable rating', () => {
      expect(summarizeReviews([{ rating: 5 }, { text: 'no stars' }])).toEqual({ count: 1, average: 5 });
    });
  });
});
