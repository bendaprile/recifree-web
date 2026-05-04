import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestoreModule from 'firebase/firestore';
import { 
    getUserSavedRecipes, 
    updateRecipeListsInFirestore, 
    unsaveRecipeFromFirestore, 
    getUserCustomLists, 
    addCustomListToFirestore, 
    renameCustomListInFirestore, 
    deleteCustomListFromFirestore 
} from './savedRecipeService';

// Mock Firestore module
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    arrayUnion: vi.fn((val) => ({ type: 'arrayUnion', val })),
    arrayRemove: vi.fn((val) => ({ type: 'arrayRemove', val })),
    writeBatch: vi.fn(),
    deleteField: vi.fn(() => 'DELETE_FIELD'),
}));

vi.mock('../config/firebase', () => ({ db: 'MOCK_DB' }));

describe('savedRecipeService', () => {
    const uid = 'test-uid';
    const recipeId = 'test-recipe-id';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getUserSavedRecipes', () => {
        it('returns empty array if no uid provided', async () => {
            const result = await getUserSavedRecipes(null);
            expect(result).toEqual([]);
        });

        it('returns mapped recipes with migrated legacy listName', async () => {
            const mockDocs = [
                {
                    id: 'recipe1',
                    data: () => ({ listNames: ['List1'], title: 'Recipe 1' })
                },
                {
                    id: 'recipe2',
                    data: () => ({ listName: 'LegacyList', title: 'Recipe 2' })
                },
                {
                    id: 'recipe3',
                    data: () => ({ listNames: ['List2'], listName: 'LegacyList', title: 'Recipe 3' })
                }
            ];
            firestoreModule.getDocs.mockResolvedValue({ docs: mockDocs });
            
            const result = await getUserSavedRecipes(uid);
            
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ recipeId: 'recipe1', listNames: ['List1'], title: 'Recipe 1' });
            expect(result[1]).toEqual({ recipeId: 'recipe2', listName: 'LegacyList', listNames: ['LegacyList'], title: 'Recipe 2' });
            expect(result[2]).toEqual({ recipeId: 'recipe3', listNames: ['List2', 'LegacyList'], listName: 'LegacyList', title: 'Recipe 3' });
        });

        it('does not duplicate listName if it is already in listNames', async () => {
            const mockDocs = [
                {
                    id: 'recipe1',
                    data: () => ({ listNames: ['LegacyList'], listName: 'LegacyList' })
                }
            ];
            firestoreModule.getDocs.mockResolvedValue({ docs: mockDocs });
            
            const result = await getUserSavedRecipes(uid);
            expect(result[0].listNames).toEqual(['LegacyList']);
        });

        it('handles missing listNames field in getUserSavedRecipes', async () => {
            const mockDocs = [
                {
                    id: 'recipe1',
                    data: () => ({ title: 'No Lists' })
                }
            ];
            firestoreModule.getDocs.mockResolvedValue({ docs: mockDocs });
            
            const result = await getUserSavedRecipes(uid);
            expect(result[0].listNames).toEqual([]);
        });

        it('handles errors and returns empty array', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            firestoreModule.getDocs.mockRejectedValue(new Error('Firestore Error'));
            
            const result = await getUserSavedRecipes(uid);
            
            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('updateRecipeListsInFirestore', () => {
        it('throws error if no uid provided', async () => {
            await expect(updateRecipeListsInFirestore(null, recipeId, []))
                .rejects.toThrow('User must be authenticated to save to Firestore');
        });

        it('creates new doc if it does not exist', async () => {
            firestoreModule.doc.mockReturnValue('doc-ref');
            firestoreModule.getDoc.mockResolvedValue({ exists: () => false });
            
            await updateRecipeListsInFirestore(uid, recipeId, ['List1']);
            
            expect(firestoreModule.setDoc).toHaveBeenCalledWith('doc-ref', {
                listNames: ['List1'],
                savedAt: 'MOCK_TIMESTAMP'
            });
        });

        it('updates existing doc and cleans up legacy field', async () => {
            firestoreModule.doc.mockReturnValue('doc-ref');
            firestoreModule.getDoc.mockResolvedValue({ exists: () => true });
            
            await updateRecipeListsInFirestore(uid, recipeId, ['List1']);
            
            expect(firestoreModule.setDoc).toHaveBeenCalledWith('doc-ref', {
                listNames: ['List1'],
                listName: 'DELETE_FIELD'
            }, { merge: true });
        });

        it('handles and rethrows errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            firestoreModule.getDoc.mockRejectedValue(new Error('Firestore Error'));
            
            await expect(updateRecipeListsInFirestore(uid, recipeId, []))
                .rejects.toThrow('Firestore Error');
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('unsaveRecipeFromFirestore', () => {
        it('throws error if no uid provided', async () => {
            await expect(unsaveRecipeFromFirestore(null, recipeId))
                .rejects.toThrow('User must be authenticated to unsave a recipe');
        });

        it('deletes the document', async () => {
            firestoreModule.doc.mockReturnValue('doc-ref');
            
            await unsaveRecipeFromFirestore(uid, recipeId);
            
            expect(firestoreModule.deleteDoc).toHaveBeenCalledWith('doc-ref');
        });

        it('handles and rethrows errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            firestoreModule.deleteDoc.mockRejectedValue(new Error('Firestore Error'));
            
            await expect(unsaveRecipeFromFirestore(uid, recipeId))
                .rejects.toThrow('Firestore Error');
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('getUserCustomLists', () => {
        it('returns empty array if no uid provided', async () => {
            const result = await getUserCustomLists(null);
            expect(result).toEqual([]);
        });

        it('returns custom lists if they exist', async () => {
            firestoreModule.getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({ customLists: ['List1', 'List2'] })
            });
            
            const result = await getUserCustomLists(uid);
            expect(result).toEqual(['List1', 'List2']);
        });

        it('returns empty array if doc does not exist', async () => {
            firestoreModule.getDoc.mockResolvedValue({ exists: () => false });
            const result = await getUserCustomLists(uid);
            expect(result).toEqual([]);
        });

        it('returns empty array if customLists field is missing', async () => {
            firestoreModule.getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({})
            });
            const result = await getUserCustomLists(uid);
            expect(result).toEqual([]);
        });

        it('handles errors and returns empty array', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            firestoreModule.getDoc.mockRejectedValue(new Error('Firestore Error'));
            
            const result = await getUserCustomLists(uid);
            
            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('addCustomListToFirestore', () => {
        it('throws error if no uid provided', async () => {
            await expect(addCustomListToFirestore(null, 'New List'))
                .rejects.toThrow('User must be authenticated to save custom list');
        });

        it('adds list using arrayUnion', async () => {
            firestoreModule.doc.mockReturnValue('doc-ref');
            
            await addCustomListToFirestore(uid, 'New List');
            
            expect(firestoreModule.setDoc).toHaveBeenCalledWith('doc-ref', {
                customLists: { type: 'arrayUnion', val: 'New List' }
            }, { merge: true });
        });

        it('handles and rethrows errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            firestoreModule.setDoc.mockRejectedValue(new Error('Firestore Error'));
            
            await expect(addCustomListToFirestore(uid, 'New List'))
                .rejects.toThrow('Firestore Error');
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('renameCustomListInFirestore', () => {
        it('throws error if no uid provided', async () => {
            await expect(renameCustomListInFirestore(null, 'Old', 'New'))
                .rejects.toThrow('User must be authenticated to rename list');
        });

        it('performs batch rename for lists and recipes', async () => {
            const batchMock = {
                set: vi.fn(),
                update: vi.fn(),
                commit: vi.fn().mockResolvedValue(),
            };
            firestoreModule.writeBatch.mockReturnValue(batchMock);
            firestoreModule.doc.mockReturnValue('user-doc-ref');
            
            // Mock recipe search results
            const mockRecipeDocs = [
                {
                    ref: 'recipe-ref-1',
                    data: () => ({ listNames: ['Old', 'Other'] })
                }
            ];
            const mockLegacyDocs = [
                {
                    ref: 'recipe-ref-2',
                    data: () => ({ listName: 'Old' })
                }
            ];
            
            firestoreModule.getDocs
                .mockResolvedValueOnce({ docs: mockRecipeDocs }) // First query for listNames
                .mockResolvedValueOnce({ docs: mockLegacyDocs }); // Second query for legacy listName
            
            await renameCustomListInFirestore(uid, 'Old', 'New');
            
            // User doc updates
            expect(batchMock.set).toHaveBeenCalledWith('user-doc-ref', {
                customLists: { type: 'arrayRemove', val: 'Old' }
            }, { merge: true });
            expect(batchMock.set).toHaveBeenCalledWith('user-doc-ref', {
                customLists: { type: 'arrayUnion', val: 'New' }
            }, { merge: true });
            
            // Recipe updates
            expect(batchMock.update).toHaveBeenCalledWith('recipe-ref-1', {
                listNames: ['Other', 'New']
            });
            
            // Legacy recipe updates
            expect(batchMock.update).toHaveBeenCalledWith('recipe-ref-2', {
                listName: '',
                listNames: { type: 'arrayUnion', val: 'New' }
            });
            
            expect(batchMock.commit).toHaveBeenCalled();
        });

        it('handles missing listNames and existing newName in renameCustomListInFirestore', async () => {
            const batchMock = {
                set: vi.fn(),
                update: vi.fn(),
                commit: vi.fn().mockResolvedValue(),
            };
            firestoreModule.writeBatch.mockReturnValue(batchMock);
            
            const mockRecipeDocs = [
                {
                    ref: 'recipe-ref-1',
                    data: () => ({ listNames: null }) // Missing listNames
                },
                {
                    ref: 'recipe-ref-2',
                    data: () => ({ listNames: ['Old', 'New'] }) // New already exists
                }
            ];
            
            firestoreModule.getDocs
                .mockResolvedValueOnce({ docs: mockRecipeDocs })
                .mockResolvedValueOnce({ docs: [] });
            
            await renameCustomListInFirestore(uid, 'Old', 'New');
            
            expect(batchMock.update).toHaveBeenCalledWith('recipe-ref-1', {
                listNames: ['New']
            });
            expect(batchMock.update).toHaveBeenCalledWith('recipe-ref-2', {
                listNames: ['New']
            });
        });

        it('handles and rethrows errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            firestoreModule.writeBatch.mockImplementation(() => {
                throw new Error('Batch Error');
            });
            
            await expect(renameCustomListInFirestore(uid, 'Old', 'New'))
                .rejects.toThrow('Batch Error');
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('deleteCustomListFromFirestore', () => {
        it('throws error if no uid provided', async () => {
            await expect(deleteCustomListFromFirestore(null, 'List'))
                .rejects.toThrow('User must be authenticated to delete list');
        });

        it('deletes list and moves recipes (default)', async () => {
            const batchMock = {
                set: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                commit: vi.fn().mockResolvedValue(),
            };
            firestoreModule.writeBatch.mockReturnValue(batchMock);
            
            const mockRecipeDocs = [
                {
                    ref: 'recipe-ref-1',
                    data: () => ({ listNames: ['List', 'Other'] })
                }
            ];
            firestoreModule.getDocs
                .mockResolvedValueOnce({ docs: mockRecipeDocs })
                .mockResolvedValueOnce({ docs: [] }); // Legacy
            
            await deleteCustomListFromFirestore(uid, 'List');
            
            expect(batchMock.update).toHaveBeenCalledWith('recipe-ref-1', {
                listNames: ['Other']
            });
            expect(batchMock.commit).toHaveBeenCalled();
        });

        it('deletes list and fully unsaves recipes if action is delete', async () => {
            const batchMock = {
                set: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                commit: vi.fn().mockResolvedValue(),
            };
            firestoreModule.writeBatch.mockReturnValue(batchMock);
            
            const mockRecipeDocs = [
                {
                    ref: 'recipe-ref-only',
                    data: () => ({ listNames: ['List'] })
                },
                {
                    ref: 'recipe-ref-multi',
                    data: () => ({ listNames: ['List', 'Other'] })
                }
            ];
            firestoreModule.getDocs
                .mockResolvedValueOnce({ docs: mockRecipeDocs })
                .mockResolvedValueOnce({ docs: [] }); // Legacy
            
            await deleteCustomListFromFirestore(uid, 'List', 'delete');
            
            expect(batchMock.delete).toHaveBeenCalledWith('recipe-ref-only');
            expect(batchMock.update).toHaveBeenCalledWith('recipe-ref-multi', {
                listNames: ['Other']
            });
        });

        it('handles legacy recipes in delete mode', async () => {
            const batchMock = {
                set: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                commit: vi.fn().mockResolvedValue(),
            };
            firestoreModule.writeBatch.mockReturnValue(batchMock);
            
            firestoreModule.getDocs
                .mockResolvedValueOnce({ docs: [] }) // Normal
                .mockResolvedValueOnce({ docs: [{ ref: 'legacy-ref', data: () => ({}) }] }); // Legacy
            
            await deleteCustomListFromFirestore(uid, 'Legacy', 'delete');
            
            expect(batchMock.delete).toHaveBeenCalledWith('legacy-ref');
        });

        it('handles legacy recipes in move mode', async () => {
            const batchMock = {
                set: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                commit: vi.fn().mockResolvedValue(),
            };
            firestoreModule.writeBatch.mockReturnValue(batchMock);
            
            firestoreModule.getDocs
                .mockResolvedValueOnce({ docs: [] }) // Normal
                .mockResolvedValueOnce({ docs: [{ ref: 'legacy-ref', data: () => ({}) }] }); // Legacy
            
            await deleteCustomListFromFirestore(uid, 'Legacy', 'move');
            
            expect(batchMock.update).toHaveBeenCalledWith('legacy-ref', {
                listName: '',
                listNames: ['Saved']
            });
        });

        it('handles and rethrows errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            firestoreModule.writeBatch.mockImplementation(() => {
                throw new Error('Batch Error');
            });
            
            await expect(deleteCustomListFromFirestore(uid, 'List'))
                .rejects.toThrow('Batch Error');
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
