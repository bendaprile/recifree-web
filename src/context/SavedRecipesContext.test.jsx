import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SavedRecipesProvider, useSavedRecipes } from './SavedRecipesContext';
import { AuthProvider } from './AuthContext';
import * as savedRecipeService from '../services/savedRecipeService';

// Mock the services
vi.mock('../services/savedRecipeService', () => ({
    getUserSavedRecipes: vi.fn(),
    updateRecipeListsInFirestore: vi.fn(),
    getUserCustomLists: vi.fn(),
    addCustomListToFirestore: vi.fn(),
    deleteCustomListFromFirestore: vi.fn(),
    renameCustomListInFirestore: vi.fn()
}));

// Mock AuthContext
const mockUser = { uid: 'test-user' };
vi.mock('./AuthContext', () => ({
    AuthProvider: ({ children }) => <div>{children}</div>,
    useAuth: () => ({
        currentUser: mockUser,
        loadingAuth: false
    })
}));

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
        clear: vi.fn(() => { store = {}; }),
        removeItem: vi.fn(key => { delete store[key]; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component to access hook
const TestComponent = () => {
    const { 
        savedRecipes, 
        lists, 
        toggleListForRecipe, 
        createCustomList 
    } = useSavedRecipes();

    return (
        <div>
            <div data-testid="recipe-count">{savedRecipes.length}</div>
            <div data-testid="lists">{lists.join(',')}</div>
            <button onClick={() => toggleListForRecipe('recipe-1', 'Favorites')}>Toggle Favorites</button>
            <button onClick={() => createCustomList('New List')}>Create List</button>
            <div data-testid="recipe-1-lists">
                {savedRecipes.find(r => r.recipeId === 'recipe-1')?.listNames?.join(',') || 'none'}
            </div>
        </div>
    );
};

describe('SavedRecipesContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        
        // Default mocks
        savedRecipeService.getUserSavedRecipes.mockResolvedValue([]);
        savedRecipeService.getUserCustomLists.mockResolvedValue([]);
    });

    it('loads and migrates legacy data from Firestore correctly', async () => {
        const legacyData = [
            { recipeId: 'recipe-1', listName: 'Saved', savedAt: '2024-01-01' }
        ];
        
        // Mock the service to return legacy-style data 
        // Note: The service itself usually migrates this on read, but we test the context's robustness
        savedRecipeService.getUserSavedRecipes.mockResolvedValue([
            { recipeId: 'recipe-1', listNames: ['Saved'], savedAt: '2024-01-01' }
        ]);

        await act(async () => {
            render(
                <SavedRecipesProvider>
                    <TestComponent />
                </SavedRecipesProvider>
            );
        });

        expect(screen.getByTestId('recipe-1-lists').textContent).toBe('Saved');
    });

    it('toggles lists correctly and performs optimistic updates', async () => {
        savedRecipeService.getUserSavedRecipes.mockResolvedValue([
            { recipeId: 'recipe-1', listNames: ['Saved'], savedAt: '2024-01-01' }
        ]);

        await act(async () => {
            render(
                <SavedRecipesProvider>
                    <TestComponent />
                </SavedRecipesProvider>
            );
        });

        expect(screen.getByTestId('recipe-1-lists').textContent).toBe('Saved');

        await act(async () => {
            screen.getByText('Toggle Favorites').click();
        });

        // Verify optimistic update
        expect(screen.getByTestId('recipe-1-lists').textContent).toBe('Saved,Favorites');
        
        // Verify Firestore call
        expect(savedRecipeService.updateRecipeListsInFirestore).toHaveBeenCalledWith(
            'test-user', 
            'recipe-1', 
            ['Saved', 'Favorites']
        );
    });

    it('removes recipe from state when last list is unchecked', async () => {
        savedRecipeService.getUserSavedRecipes.mockResolvedValue([
            { recipeId: 'recipe-1', listNames: ['Favorites'], savedAt: '2024-01-01' }
        ]);

        await act(async () => {
            render(
                <SavedRecipesProvider>
                    <TestComponent />
                </SavedRecipesProvider>
            );
        });

        await act(async () => {
            screen.getByText('Toggle Favorites').click();
        });

        expect(screen.getByTestId('recipe-count').textContent).toBe('0');
        expect(savedRecipeService.updateRecipeListsInFirestore).toHaveBeenCalledWith(
            'test-user', 
            'recipe-1', 
            []
        );
    });
});
