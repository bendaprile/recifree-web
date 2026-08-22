import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestoreModule from 'firebase/firestore';
import { getUserShelf, addToShelf, removeFromShelf } from './shelfService';

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getDocs: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

vi.mock('../config/firebase', () => ({ db: 'MOCK_DB' }));

describe('shelfService', () => {
    const uid = 'test-uid';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getUserShelf', () => {
        it('returns an empty array when no uid is given', async () => {
            expect(await getUserShelf(null)).toEqual([]);
            expect(firestoreModule.getDocs).not.toHaveBeenCalled();
        });

        it('reads from the user-scoped shelf path', async () => {
            firestoreModule.getDocs.mockResolvedValueOnce({ docs: [] });
            await getUserShelf(uid);
            expect(firestoreModule.collection).toHaveBeenCalledWith('MOCK_DB', `users/${uid}/shelf`);
        });

        it('maps documents into recipes keyed by document id', async () => {
            firestoreModule.getDocs.mockResolvedValueOnce({
                docs: [{ id: 'cookies', data: () => ({ title: 'Cookies' }) }]
            });

            const shelf = await getUserShelf(uid);
            expect(shelf).toEqual([{ id: 'cookies', title: 'Cookies' }]);
        });

        it('reconstitutes stringified stepIngredients so callers get clean schema', async () => {
            firestoreModule.getDocs.mockResolvedValueOnce({
                docs: [{ id: 'cookies', data: () => ({ stepIngredients: '[[0,1],[2]]' }) }]
            });

            const shelf = await getUserShelf(uid);
            expect(shelf[0].stepIngredients).toEqual([[0, 1], [2]]);
        });

        it('falls back to an empty array rather than throwing on malformed stepIngredients', async () => {
            firestoreModule.getDocs.mockResolvedValueOnce({
                docs: [{ id: 'cookies', data: () => ({ stepIngredients: 'not json' }) }]
            });

            const shelf = await getUserShelf(uid);
            expect(shelf[0].stepIngredients).toEqual([]);
        });

        it('degrades to an empty shelf when Firestore is unavailable', async () => {
            firestoreModule.getDocs.mockRejectedValueOnce(new Error('offline'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            expect(await getUserShelf(uid)).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('addToShelf', () => {
        it('refuses to write without an authenticated user', async () => {
            await expect(addToShelf(null, { id: 'cookies' })).rejects.toThrow('authenticated');
            expect(firestoreModule.setDoc).not.toHaveBeenCalled();
        });

        it('refuses a recipe with no id, which would create an unaddressable document', async () => {
            await expect(addToShelf(uid, { title: 'No id' })).rejects.toThrow('id');
            expect(firestoreModule.setDoc).not.toHaveBeenCalled();
        });

        it('writes to the user-scoped path using the recipe id as document id', async () => {
            firestoreModule.setDoc.mockResolvedValueOnce();
            await addToShelf(uid, { id: 'cookies', title: 'Cookies' });

            expect(firestoreModule.doc).toHaveBeenCalledWith('MOCK_DB', `users/${uid}/shelf`, 'cookies');
        });

        it('stringifies stepIngredients, which Firestore cannot store as nested arrays', async () => {
            firestoreModule.setDoc.mockResolvedValueOnce();
            await addToShelf(uid, { id: 'cookies', stepIngredients: [[0, 1], [2]] });

            const written = firestoreModule.setDoc.mock.calls[0][1];
            expect(written.stepIngredients).toBe('[[0,1],[2]]');
        });

        it('does not mutate the caller\'s recipe object', async () => {
            firestoreModule.setDoc.mockResolvedValueOnce();
            const original = { id: 'cookies', stepIngredients: [[0, 1]] };
            await addToShelf(uid, original);

            expect(original.stepIngredients).toEqual([[0, 1]]);
            expect(original.id).toBe('cookies');
        });

        it('does not duplicate the id inside the document body', async () => {
            firestoreModule.setDoc.mockResolvedValueOnce();
            await addToShelf(uid, { id: 'cookies', title: 'Cookies' });

            const written = firestoreModule.setDoc.mock.calls[0][1];
            expect(written.id).toBeUndefined();
            expect(written.title).toBe('Cookies');
            expect(written.shelvedAt).toBe('MOCK_TIMESTAMP');
        });
    });

    describe('removeFromShelf', () => {
        it('refuses to delete without an authenticated user', async () => {
            await expect(removeFromShelf(null, 'cookies')).rejects.toThrow('authenticated');
            expect(firestoreModule.deleteDoc).not.toHaveBeenCalled();
        });

        it('deletes from the user-scoped path', async () => {
            firestoreModule.deleteDoc.mockResolvedValueOnce();
            await removeFromShelf(uid, 'cookies');

            expect(firestoreModule.doc).toHaveBeenCalledWith('MOCK_DB', `users/${uid}/shelf`, 'cookies');
            expect(firestoreModule.deleteDoc).toHaveBeenCalled();
        });
    });
});
