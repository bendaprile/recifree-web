import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { SavedRecipesProvider, useSavedRecipes, SavedRecipesContext } from './SavedRecipesContext';
import * as savedRecipeService from '../services/savedRecipeService';

// Mock all service functions
vi.mock('../services/savedRecipeService', () => ({
    getUserSavedRecipes: vi.fn(),
    updateRecipeListsInFirestore: vi.fn(),
    unsaveRecipeFromFirestore: vi.fn(),
    getUserCustomLists: vi.fn(),
    addCustomListToFirestore: vi.fn(),
    deleteCustomListFromFirestore: vi.fn(),
    renameCustomListInFirestore: vi.fn()
}));

// Prevent Firebase from initializing and creating emulator connections
vi.mock('../config/firebase', () => ({ db: {}, auth: {} }));

// Mock AuthContext — use a stable object so currentUser reference doesn't change
// on each render (which would re-trigger the load useEffect infinitely)
const mockAuthValue = { currentUser: { uid: 'test-user' }, loadingAuth: false };
vi.mock('./AuthContext', () => ({
    AuthProvider: ({ children }) => <div>{children}</div>,
    useAuth: () => mockAuthValue
}));

// localStorage mock
const localStorageMock = (() => {
    let store = {};
    return {
        getItem:    vi.fn(key => store[key] || null),
        setItem:    vi.fn((key, val) => { store[key] = val.toString(); }),
        clear:      vi.fn(() => { store = {}; }),
        removeItem: vi.fn(key => { delete store[key]; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component — exposes buttons that trigger context actions
// This keeps button clicks inside React's event system so act() works
const TestComponent = () => {
    const ctx = useSavedRecipes();

    if (ctx.loading) return <div data-testid="loading">loading</div>;

    return (
        <div>
            <div data-testid="recipe-count">{ctx.savedRecipes.length}</div>
            <div data-testid="lists">{ctx.lists.join(',')}</div>
            <button onClick={() => ctx.toggleSaved('recipe-1')}>Toggle Saved</button>
            <button onClick={() => ctx.toggleListForRecipe('recipe-1', 'Favorites')}>Toggle Favorites</button>
            <button onClick={() => ctx.createCustomList('New List')}>Create List</button>
            <div data-testid="recipe-1-lists">
                {ctx.savedRecipes.find(r => r.recipeId === 'recipe-1')?.listNames?.join(',') ?? 'none'}
            </div>
        </div>
    );
};

// Renders and waits for context to finish bootstrapping
async function renderAndWait() {
    render(<SavedRecipesProvider><TestComponent /></SavedRecipesProvider>);
    await waitFor(() => {
        expect(screen.queryByTestId('loading')).toBeNull();
    }, { timeout: 3000 });
}

// Triggers a button click as a native DOM event (synchronous, no act wrapping),
// then polls waitFor for the result. This avoids act() draining async queues.
// The optimistic React state update flushes in the next microtask, which
// waitFor's polling interval will catch.
function click(text) {
    screen.getByText(text).dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

afterEach(() => cleanup());

describe('SavedRecipesContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        savedRecipeService.getUserSavedRecipes.mockResolvedValue([]);
        savedRecipeService.getUserCustomLists.mockResolvedValue([]);
        savedRecipeService.updateRecipeListsInFirestore.mockResolvedValue();
        savedRecipeService.unsaveRecipeFromFirestore.mockResolvedValue();
        savedRecipeService.addCustomListToFirestore.mockResolvedValue();
        savedRecipeService.renameCustomListInFirestore.mockResolvedValue();
        savedRecipeService.deleteCustomListFromFirestore.mockResolvedValue();
    });

    it('starts with empty savedRecipes and lists', async () => {
        await renderAndWait();
        expect(screen.getByTestId('recipe-count').textContent).toBe('0');
        expect(screen.getByTestId('lists').textContent).toBe('');
    });

    it('migrates legacy "Saved" sentinel out of listNames on load', async () => {
        savedRecipeService.getUserSavedRecipes.mockResolvedValue([
            { recipeId: 'recipe-1', listNames: ['Saved'], savedAt: '2024-01-01' }
        ]);

        await renderAndWait();

        expect(screen.getByTestId('recipe-count').textContent).toBe('1');
        expect(screen.getByTestId('recipe-1-lists').textContent).toBe('');
    });

    it('toggleSaved adds a recipe with empty listNames when not yet saved', async () => {
        await renderAndWait();

        click('Toggle Saved');

        await waitFor(() => {
            expect(screen.getByTestId('recipe-count').textContent).toBe('1');
            expect(screen.getByTestId('recipe-1-lists').textContent).toBe('');
        }, { interval: 50, timeout: 2000 });

        await waitFor(() => {
            expect(savedRecipeService.updateRecipeListsInFirestore).toHaveBeenCalledWith(
                'test-user', 'recipe-1', []
            );
        });
    });

    it('toggleSaved removes a saved recipe entirely', async () => {
        savedRecipeService.getUserSavedRecipes.mockResolvedValue([
            { recipeId: 'recipe-1', listNames: [], savedAt: '2024-01-01' }
        ]);

        await renderAndWait();
        expect(screen.getByTestId('recipe-count').textContent).toBe('1');

        click('Toggle Saved');

        await waitFor(() => {
            expect(screen.getByTestId('recipe-count').textContent).toBe('0');
        }, { interval: 50, timeout: 2000 });

        await waitFor(() => {
            expect(savedRecipeService.unsaveRecipeFromFirestore).toHaveBeenCalledWith(
                'test-user', 'recipe-1'
            );
        });
        expect(savedRecipeService.updateRecipeListsInFirestore).not.toHaveBeenCalled();
    });

    it('toggleListForRecipe adds an unsaved recipe to a custom list', async () => {
        await renderAndWait();

        click('Toggle Favorites');

        await waitFor(() => {
            expect(screen.getByTestId('recipe-1-lists').textContent).toBe('Favorites');
        }, { interval: 50, timeout: 2000 });

        await waitFor(() => {
            expect(savedRecipeService.updateRecipeListsInFirestore).toHaveBeenCalledWith(
                'test-user', 'recipe-1', ['Favorites']
            );
        });
    });

    it('toggleListForRecipe does nothing if listName is "Saved"', async () => {
        await renderAndWait();
        
        render(<SavedRecipesProvider>
            <SavedRecipesContext.Consumer>
                {ctx => (
                    <button onClick={() => ctx.toggleListForRecipe('recipe-1', 'Saved')}>Toggle Saved List</button>
                )}
            </SavedRecipesContext.Consumer>
        </SavedRecipesProvider>);
        
        await waitFor(() => expect(screen.queryByText('Toggle Saved List')).toBeDefined());
        screen.getByText('Toggle Saved List').click();
        
        expect(savedRecipeService.updateRecipeListsInFirestore).not.toHaveBeenCalled();
    });

    it('toggleListForRecipe removes a recipe from a custom list but keeps it saved', async () => {
        savedRecipeService.getUserSavedRecipes.mockResolvedValue([
            { recipeId: 'recipe-1', listNames: ['Favorites'], savedAt: '2024-01-01' }
        ]);

        await renderAndWait();

        click('Toggle Favorites');

        await waitFor(() => {
            expect(screen.getByTestId('recipe-count').textContent).toBe('1');
            expect(screen.getByTestId('recipe-1-lists').textContent).toBe('');
        }, { interval: 50, timeout: 2000 });

        await waitFor(() => {
            expect(savedRecipeService.updateRecipeListsInFirestore).toHaveBeenCalledWith(
                'test-user', 'recipe-1', []
            );
        });
        expect(savedRecipeService.unsaveRecipeFromFirestore).not.toHaveBeenCalled();
    });

    it('createCustomList adds the list name to state', async () => {
        await renderAndWait();

        click('Create List');

        await waitFor(() => {
            expect(screen.getByTestId('lists').textContent).toBe('New List');
        }, { interval: 50, timeout: 2000 });
    });

    it('createCustomList does nothing for invalid names or duplicates', async () => {
        render(<SavedRecipesProvider>
            <SavedRecipesContext.Consumer>
                {ctx => (
                    <div>
                        <button onClick={() => ctx.createCustomList('')}>Create Empty</button>
                        <button onClick={() => ctx.createCustomList('Saved')}>Create Saved</button>
                        <button onClick={() => ctx.createCustomList('Duplicate')}>Create 1</button>
                        <button onClick={() => ctx.createCustomList('Duplicate')}>Create 2</button>
                    </div>
                )}
            </SavedRecipesContext.Consumer>
        </SavedRecipesProvider>);
        
        await waitFor(() => expect(screen.queryByText('Create Empty')).toBeDefined());
        
        screen.getByText('Create Empty').click();
        screen.getByText('Create Saved').click();
        expect(savedRecipeService.addCustomListToFirestore).not.toHaveBeenCalled();

        screen.getByText('Create 1').click();
        await waitFor(() => {
            expect(savedRecipeService.addCustomListToFirestore).toHaveBeenCalledWith('test-user', 'Duplicate');
        });
        
        vi.clearAllMocks();
        
        screen.getByText('Create 2').click();
        // Wait a bit to ensure it's NOT called
        await new Promise(r => setTimeout(r, 100));
        expect(savedRecipeService.addCustomListToFirestore).not.toHaveBeenCalled();
    });

    describe('Guest Mode (Unauthenticated)', () => {
        beforeEach(() => {
            // Change mock to reflect no user
            mockAuthValue.currentUser = null;
        });

        afterEach(() => {
            mockAuthValue.currentUser = { uid: 'test-user' };
        });

        it('loads saved recipes and lists from localStorage', async () => {
            const guestSaves = [{ recipeId: 'recipe-guest', listNames: ['Guest List'], savedAt: '2024-01-01' }];
            const guestLists = ['Guest List'];
            localStorage.setItem('recifree_saved_recipes', JSON.stringify(guestSaves));
            localStorage.setItem('recifree_custom_lists', JSON.stringify(guestLists));

            await renderAndWait();

            expect(screen.getByTestId('recipe-count').textContent).toBe('1');
            expect(screen.getByTestId('lists').textContent).toBe('Guest List');
        });

        it('saves and unsaves recipes to localStorage', async () => {
            await renderAndWait();

            click('Toggle Saved');

            await waitFor(() => {
                expect(screen.getByTestId('recipe-count').textContent).toBe('1');
                const stored = JSON.parse(localStorage.getItem('recifree_saved_recipes'));
                expect(stored).toHaveLength(1);
                expect(stored[0].recipeId).toBe('recipe-1');
            });

            click('Toggle Saved');

            await waitFor(() => {
                expect(screen.getByTestId('recipe-count').textContent).toBe('0');
                const stored = JSON.parse(localStorage.getItem('recifree_saved_recipes'));
                expect(stored).toHaveLength(0);
            });
        });

        it('toggles lists in localStorage', async () => {
            await renderAndWait();

            click('Toggle Favorites');

            await waitFor(() => {
                expect(screen.getByTestId('recipe-1-lists').textContent).toBe('Favorites');
                const stored = JSON.parse(localStorage.getItem('recifree_saved_recipes'));
                expect(stored[0].listNames).toContain('Favorites');
            });
        });

        it('creates custom lists in localStorage', async () => {
            await renderAndWait();

            click('Create List');

            await waitFor(() => {
                expect(screen.getByTestId('lists').textContent).toBe('New List');
                const stored = JSON.parse(localStorage.getItem('recifree_custom_lists'));
                expect(stored).toContain('New List');
            });
        });

        it('renames and deletes custom lists in localStorage', async () => {
            localStorage.setItem('recifree_custom_lists', JSON.stringify(['Old Name']));
            localStorage.setItem('recifree_saved_recipes', JSON.stringify([
                { recipeId: 'recipe-1', listNames: ['Old Name'] }
            ]));

            await renderAndWait();

            render(<SavedRecipesProvider>
                <SavedRecipesContext.Consumer>
                    {ctx => (
                        <div>
                            <button onClick={() => ctx.renameCustomList('Old Name', 'New Name')}>Rename Guest</button>
                            <button onClick={() => ctx.deleteCustomList('New Name', 'move')}>Delete Guest</button>
                        </div>
                    )}
                </SavedRecipesContext.Consumer>
            </SavedRecipesProvider>);

            await waitFor(() => expect(screen.queryByText('Rename Guest')).toBeDefined());
            screen.getByText('Rename Guest').click();

            await waitFor(() => {
                const storedLists = JSON.parse(localStorage.getItem('recifree_custom_lists'));
                expect(storedLists).toContain('New Name');
                const storedSaves = JSON.parse(localStorage.getItem('recifree_saved_recipes'));
                expect(storedSaves[0].listNames).toContain('New Name');
            });

            screen.getByText('Delete Guest').click();

            await waitFor(() => {
                const storedLists = JSON.parse(localStorage.getItem('recifree_custom_lists'));
                expect(storedLists).not.toContain('New Name');
            });
        });

        it('handles deletion of list in localStorage with mixed recipes', async () => {
            localStorage.setItem('recifree_custom_lists', JSON.stringify(['List A']));
            localStorage.setItem('recifree_saved_recipes', JSON.stringify([
                { recipeId: 'in-list', listNames: ['List A'] },
                { recipeId: 'not-in-list', listNames: [] }
            ]));

            await renderAndWait();

            render(<SavedRecipesProvider>
                <SavedRecipesContext.Consumer>
                    {ctx => (
                        <button onClick={() => ctx.deleteCustomList('List A', 'move')}>Delete Guest Mixed</button>
                    )}
                </SavedRecipesContext.Consumer>
            </SavedRecipesProvider>);

            await waitFor(() => expect(screen.queryByText('Delete Guest Mixed')).toBeDefined());
            screen.getByText('Delete Guest Mixed').click();

            await waitFor(() => {
                const stored = JSON.parse(localStorage.getItem('recifree_saved_recipes'));
                expect(stored).toHaveLength(2);
                expect(stored.find(r => r.recipeId === 'in-list').listNames).toHaveLength(0);
                expect(stored.find(r => r.recipeId === 'not-in-list').listNames).toHaveLength(0);
            });
        });
    });

    describe('Migration (Guest to Auth)', () => {
        it('migrates legacy local storage format (listName instead of listNames)', async () => {
            const guestSaves = [{ recipeId: 'recipe-legacy', listName: 'Old List' }];
            localStorage.setItem('recifree_saved_recipes', JSON.stringify(guestSaves));

            await renderAndWait();

            await waitFor(() => {
                expect(savedRecipeService.updateRecipeListsInFirestore).toHaveBeenCalledWith('test-user', 'recipe-legacy', ['Old List']);
            });
        });

        it('migrates local storage data to Firestore on login', async () => {
            const guestSaves = [{ recipeId: 'recipe-mig', listNames: ['Mig List'] }];
            const guestLists = ['Mig List'];
            localStorage.setItem('recifree_saved_recipes', JSON.stringify(guestSaves));
            localStorage.setItem('recifree_custom_lists', JSON.stringify(guestLists));

            // Component renders with currentUser (from mockAuthValue)
            await renderAndWait();

            // Should have called firestore services for migration
            await waitFor(() => {
                expect(savedRecipeService.addCustomListToFirestore).toHaveBeenCalledWith('test-user', 'Mig List');
                expect(savedRecipeService.updateRecipeListsInFirestore).toHaveBeenCalledWith('test-user', 'recipe-mig', ['Mig List']);
            });

            // Local storage should be cleared
            expect(localStorage.getItem('recifree_saved_recipes')).toBeNull();
            expect(localStorage.getItem('recifree_custom_lists')).toBeNull();
        });
    });

    describe('Advanced List Management', () => {
        it('renames a custom list in Firestore', async () => {
            savedRecipeService.getUserCustomLists.mockResolvedValue(['Old Name']);
            savedRecipeService.getUserSavedRecipes.mockResolvedValue([
                { recipeId: 'recipe-1', listNames: ['Old Name'] }
            ]);

            render(<SavedRecipesProvider>
                <SavedRecipesContext.Consumer>
                    {ctx => (
                        <div>
                            <div data-testid="lists">{ctx.lists.join(',')}</div>
                            <div data-testid="recipe-lists">{ctx.savedRecipes[0]?.listNames.join(',')}</div>
                            <button onClick={() => ctx.renameCustomList('Old Name', 'New Name')}>Rename</button>
                        </div>
                    )}
                </SavedRecipesContext.Consumer>
            </SavedRecipesProvider>);

            await waitFor(() => expect(screen.queryByText('Rename')).toBeDefined());
            
            screen.getByText('Rename').click();

            await waitFor(() => {
                expect(screen.getByTestId('lists').textContent).toBe('New Name');
                expect(screen.getByTestId('recipe-lists').textContent).toBe('New Name');
                expect(savedRecipeService.renameCustomListInFirestore).toHaveBeenCalledWith('test-user', 'Old Name', 'New Name');
            });
        });

        it('deletes a custom list and moves recipes to uncategorized', async () => {
            savedRecipeService.getUserCustomLists.mockResolvedValue(['List 1']);
            savedRecipeService.getUserSavedRecipes.mockResolvedValue([
                { recipeId: 'recipe-1', listNames: ['List 1'] }
            ]);

            render(<SavedRecipesProvider>
                <SavedRecipesContext.Consumer>
                    {ctx => (
                        <div>
                            <div data-testid="lists">{ctx.lists.join(',')}</div>
                            <div data-testid="recipe-count">{ctx.savedRecipes.length}</div>
                            <div data-testid="recipe-lists">{ctx.savedRecipes[0]?.listNames.join(',')}</div>
                            <button onClick={() => ctx.deleteCustomList('List 1', 'move')}>Delete Move</button>
                        </div>
                    )}
                </SavedRecipesContext.Consumer>
            </SavedRecipesProvider>);

            await waitFor(() => expect(screen.queryByText('Delete Move')).toBeDefined());
            
            screen.getByText('Delete Move').click();

            await waitFor(() => {
                expect(screen.getByTestId('lists').textContent).toBe('');
                expect(screen.getByTestId('recipe-count').textContent).toBe('1');
                expect(screen.getByTestId('recipe-lists').textContent).toBe('');
                expect(savedRecipeService.deleteCustomListFromFirestore).toHaveBeenCalledWith('test-user', 'List 1', 'move');
            });
        });

        it('deletes a custom list and deletes recipes that were only in that list', async () => {
            savedRecipeService.getUserCustomLists.mockResolvedValue(['List 1']);
            savedRecipeService.getUserSavedRecipes.mockResolvedValue([
                { recipeId: 'recipe-1', listNames: ['List 1'] },
                { recipeId: 'recipe-2', listNames: ['Other'] } // To cover line 271 (recipe not in list)
            ]);

            render(<SavedRecipesProvider>
                <SavedRecipesContext.Consumer>
                    {ctx => (
                        <div>
                            <div data-testid="recipe-count">{ctx.savedRecipes.length}</div>
                            <button onClick={() => ctx.deleteCustomList('List 1', 'delete')}>Delete All</button>
                        </div>
                    )}
                </SavedRecipesContext.Consumer>
            </SavedRecipesProvider>);

            await waitFor(() => expect(screen.queryByText('Delete All')).toBeDefined());
            
            screen.getByText('Delete All').click();

            await waitFor(() => {
                expect(screen.getByTestId('recipe-count').textContent).toBe('1'); // recipe-2 remains
                expect(savedRecipeService.deleteCustomListFromFirestore).toHaveBeenCalledWith('test-user', 'List 1', 'delete');
            });
        });

        it('renameCustomList guards against invalid names', async () => {
            await renderAndWait();
            
            render(<SavedRecipesProvider>
                <SavedRecipesContext.Consumer>
                    {ctx => (
                        <button onClick={() => ctx.renameCustomList('Old', 'Saved')}>Rename to Saved</button>
                    )}
                </SavedRecipesContext.Consumer>
            </SavedRecipesProvider>);
            
            await waitFor(() => expect(screen.queryByText('Rename to Saved')).toBeDefined());
            screen.getByText('Rename to Saved').click();
            
            expect(savedRecipeService.renameCustomListInFirestore).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling and Rollback', () => {
        it('rolls back state if unsaving fails', async () => {
            savedRecipeService.getUserSavedRecipes.mockResolvedValue([
                { recipeId: 'recipe-1', listNames: [], savedAt: '2024-01-01' }
            ]);
            savedRecipeService.unsaveRecipeFromFirestore.mockRejectedValue(new Error('Unsave failed'));
            
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await renderAndWait();
            expect(screen.getByTestId('recipe-count').textContent).toBe('1');

            click('Toggle Saved');

            // Expect it to temporarily disappear (optimistic) then reappear
            await waitFor(() => {
                expect(screen.getByTestId('recipe-count').textContent).toBe('0');
            });

            await waitFor(() => {
                expect(screen.getByTestId('recipe-count').textContent).toBe('1');
                expect(consoleSpy).toHaveBeenCalled();
            });
            
            consoleSpy.mockRestore();
        });

        it('rolls back state if saving fails', async () => {
            savedRecipeService.updateRecipeListsInFirestore.mockRejectedValue(new Error('Save failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await renderAndWait();
            click('Toggle Saved');

            await waitFor(() => {
                expect(screen.getByTestId('recipe-count').textContent).toBe('1');
            });

            await waitFor(() => {
                expect(screen.getByTestId('recipe-count').textContent).toBe('0');
                expect(consoleSpy).toHaveBeenCalled();
            });
            
            consoleSpy.mockRestore();
        });

        it('logs error if list deletion fails', async () => {
            savedRecipeService.deleteCustomListFromFirestore.mockRejectedValue(new Error('Delete list failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await renderAndWait();
            
            render(<SavedRecipesProvider>
                <SavedRecipesContext.Consumer>
                    {ctx => (
                        <button onClick={() => ctx.deleteCustomList('List 1', 'move')}>Fail Delete</button>
                    )}
                </SavedRecipesContext.Consumer>
            </SavedRecipesProvider>);

            await waitFor(() => expect(screen.queryByText('Fail Delete')).toBeDefined());
            screen.getByText('Fail Delete').click();

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to delete list', expect.any(Error));
            });
            
            consoleSpy.mockRestore();
        });
    });
});
