import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { SavedRecipesProvider, useSavedRecipes } from './SavedRecipesContext';
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
});
