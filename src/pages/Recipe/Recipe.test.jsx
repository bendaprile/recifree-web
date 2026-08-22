import { render, screen, fireEvent, act } from '@testing-library/react';
import { within } from '@testing-library/dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Recipe from './Recipe';
import { ShoppingListProvider } from '../../context/ShoppingListContext';
import { AuthProvider } from '../../context/AuthContext';
import { SavedRecipesProvider } from '../../context/SavedRecipesContext';
import { ShelfProvider } from '../../context/ShelfContext';
import { ThemeProvider } from '../../context/ThemeContext';

// Prevent any real Firebase/Firestore SDK initialization
vi.mock('../../config/firebase', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    addDoc: vi.fn(),
    serverTimestamp: vi.fn(),
    connectFirestoreEmulator: vi.fn(),
}));
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    connectAuthEmulator: vi.fn(),
    // Resolve immediately as signed out. A listener that never fires leaves
    // AuthContext's loadingAuth stuck true, which stalls every context that
    // waits on it — ShelfContext included.
    onAuthStateChanged: vi.fn((auth, cb) => { cb(null); return () => {}; }),
}));

// Mock localStorage
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        clear: vi.fn(() => {
            store = {};
        })
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

const mockTestRecipe = {
    id: 'test-recipe',
    slug: 'test-recipe',
    title: 'Test Recipe',
    description: 'Test Description',
    prepTime: '10 min',
    cookTime: '20 min',
    totalTime: '30 min',
    servings: 4,
    ingredients: [
        { item: 'Flour', amount: '2', unit: 'cups' },
        { item: 'Sugar', amount: '1', unit: 'cup' }
    ],
    instructions: [
        'Mix ingredients',
        'Add sugar carefully',
        'Rest for 10 mins'
    ],
    stepIngredients: [
        [0, 1],
        [{ "id": 1, "amount": "1/2", "unit": "cup" }],
        []
    ],
    difficulty: 'Easy',
    tags: ['TestTag']
};

const mockSectionedRecipe = {
    id: 'sectioned-recipe',
    slug: 'sectioned-recipe',
    title: 'Sectioned Test Recipe',
    description: 'Test Description',
    prepTime: '10 min',
    cookTime: '20 min',
    totalTime: '30 min',
    servings: 4,
    ingredients: [
        {
            title: 'Sauce',
            items: [
                { item: 'Soy Sauce', amount: '2', unit: 'tbsp' },
                { item: 'Ginger', amount: '1', unit: 'tsp' }
            ]
        },
        {
            title: 'Main',
            items: [
                { item: 'Chicken', amount: '1', unit: 'lb' },
                { item: 'Rice', amount: '1', unit: 'cup' }
            ]
        }
    ],
    instructions: [
        'Make sauce',
        'Cook chicken',
        'Serve'
    ],
    stepIngredients: [
        [0, 1],
        [2],
        [3]
    ],
    difficulty: 'Medium',
    tags: ['Sectioned']
};

// Mock recipeService — avoids Firestore entirely
vi.mock('../../services/recipeService', () => ({
    getRecipeBySlug: vi.fn(),
}));

import { getRecipeBySlug } from '../../services/recipeService';

describe('Recipe Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRecipeBySlug.mockImplementation(async (slug) => {
            if (slug === 'test-recipe') return mockTestRecipe;
            if (slug === 'sectioned-recipe') return mockSectionedRecipe;
            return null;
        });
    });

    // Helper to render component with router and theme context
    const renderRecipe = async (id = 'test-recipe') => {
        window.scrollTo = vi.fn();
        let result;
        await act(async () => {
            result = render(
                <ThemeProvider>
                    <AuthProvider>
                        <SavedRecipesProvider>
                            <ShelfProvider>
                                <ShoppingListProvider>
                                    <MemoryRouter initialEntries={[`/recipe/${id}`]}>
                                        <Routes>
                                            <Route path="/recipe/:id" element={<Recipe />} />
                                        </Routes>
                                    </MemoryRouter>
                                </ShoppingListProvider>
                            </ShelfProvider>
                        </SavedRecipesProvider>
                    </AuthProvider>
                </ThemeProvider>
            );
        });
        return result;
    };

    it('renders recipe details and metadata successfully', async () => {
        await renderRecipe();
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('Prep:')).toBeInTheDocument();
        expect(screen.getByText('10 min')).toBeInTheDocument();
    });

    it('activates step and highlights step ingredients on click and hover', async () => {
        await renderRecipe();

        const ingredientsPanel = document.getElementById('ingredients');
        const step1 = screen.getByTestId('instruction-item-0');
        const step2 = screen.getByTestId('instruction-item-1');

        // Step 0 is active by default
        expect(step1).toHaveClass('active');
        const flourIng = within(ingredientsPanel).getByText(/Flour/).closest('li');
        expect(flourIng).toHaveClass('step-highlight');

        // Click step 1 (2nd step: "Add sugar carefully")
        fireEvent.click(step2);

        expect(step2).toHaveClass('active');
        expect(step1).not.toHaveClass('active');

        // Hover over step 0 temporarily previews step 0
        fireEvent.mouseEnter(step1);
        expect(flourIng).toHaveClass('step-highlight');

        // Leave step 0 restores step 1 (Sugar only)
        fireEvent.mouseLeave(step1);
        expect(flourIng).not.toHaveClass('step-highlight');
    });

    it('scales ingredient amounts when scaler buttons are clicked', async () => {
        await renderRecipe();

        // Initial 1x: 2 cups Flour
        expect(screen.getByText('2 cups')).toBeInTheDocument();

        // Click 2x button
        const btn2x = screen.getByRole('button', { name: '2x' });
        fireEvent.click(btn2x);

        // Scaled to 4 cups Flour & 8 Servings
        expect(screen.getByText('4 cups')).toBeInTheDocument();
        expect(screen.getByText('8 Servings')).toBeInTheDocument();

        // Click 3x button
        const btn3x = screen.getByRole('button', { name: '3x' });
        fireEvent.click(btn3x);

        expect(screen.getByText('6 cups')).toBeInTheDocument();
        expect(screen.getByText('12 Servings')).toBeInTheDocument();
    });

    it('toggles ingredient checkboxes', async () => {
        await renderRecipe();

        const flourItem = screen.getByText(/Flour/).closest('li');
        expect(flourItem).not.toHaveClass('checked');

        fireEvent.click(flourItem);
        expect(flourItem).toHaveClass('checked');
    });

    it('renders "Back to recipes" link that points to home', async () => {
        await renderRecipe();
        const backLink = screen.getByText(/Back to recipes/i);
        expect(backLink).toBeInTheDocument();
        expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });
});

describe('Recipe Page from the shelf', () => {
    const shelfRecipe = {
        id: 'shelf-only',
        slug: 'shelf-only',
        title: 'Shelf Only Recipe',
        description: 'Never published',
        totalTime: '20 mins',
        servings: 2,
        ingredients: ['1 cup flour'],
        instructions: ['Mix it.']
    };

    const renderFromShelf = async (shelf = [shelfRecipe]) => {
        window.scrollTo = vi.fn();
        let result;
        await act(async () => {
            result = render(
                <ThemeProvider>
                    <AuthProvider>
                        <SavedRecipesProvider>
                            <ShelfProvider>
                                <ShoppingListProvider>
                                    <MemoryRouter initialEntries={[`/shelf/${shelfRecipe.id}`]}>
                                        <Routes>
                                            <Route path="/shelf/:id" element={<Recipe fromShelf />} />
                                        </Routes>
                                    </MemoryRouter>
                                </ShoppingListProvider>
                            </ShelfProvider>
                        </SavedRecipesProvider>
                    </AuthProvider>
                </ThemeProvider>
            );
        });
        return result;
    };

    beforeEach(() => {
        window.localStorage.clear();
    });

    it('renders a recipe that exists only on the shelf', async () => {
        window.localStorage.setItem('recifree_shelf', JSON.stringify([shelfRecipe]));
        await renderFromShelf();
        expect(screen.getByText('Shelf Only Recipe')).toBeTruthy();
    });

    it('hides the save button, which would store an unresolvable recipe id', async () => {
        window.localStorage.setItem('recifree_shelf', JSON.stringify([shelfRecipe]));
        await renderFromShelf();
        expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
    });

    it('does not fall back to the public catalog for a missing shelf recipe', async () => {
        window.localStorage.setItem('recifree_shelf', JSON.stringify([]));
        await renderFromShelf([]);
        expect(screen.queryByText('Shelf Only Recipe')).toBeNull();
    });
});

describe('Recipe Page SSR hydration', () => {
    afterEach(() => { delete window.__INITIAL_RECIPE__; });

    const hydrated = {
        id: 'ssr-recipe',
        slug: 'ssr-recipe',
        title: 'Server Rendered Recipe',
        description: 'Came from ssrRecipe',
        ingredients: ['1 cup flour'],
        instructions: ['Mix.', 'Bake.'],
        // Firestore stores this as a JSON string; the hydration payload is the
        // raw document, so it arrives unparsed.
        stepIngredients: '[[0],[1]]'
    };

    const renderHydrated = async () => {
        window.scrollTo = vi.fn();
        await act(async () => {
            render(
                <ThemeProvider>
                    <AuthProvider>
                        <SavedRecipesProvider>
                            <ShelfProvider>
                                <ShoppingListProvider>
                                    <MemoryRouter initialEntries={['/recipe/ssr-recipe']}>
                                        <Routes>
                                            <Route path="/recipe/:id" element={<Recipe />} />
                                        </Routes>
                                    </MemoryRouter>
                                </ShoppingListProvider>
                            </ShelfProvider>
                        </SavedRecipesProvider>
                    </AuthProvider>
                </ThemeProvider>
            );
        });
    };

    it('renders without crashing when stepIngredients arrives as a JSON string', async () => {
        // Calling .map on a string took down every recipe page the moment
        // ssrRecipe became publicly reachable.
        window.__INITIAL_RECIPE__ = { ...hydrated };
        await renderHydrated();

        expect(screen.getByText('Server Rendered Recipe')).toBeTruthy();
    });

    it('survives a malformed stepIngredients string rather than throwing', async () => {
        window.__INITIAL_RECIPE__ = { ...hydrated, stepIngredients: 'not json' };
        await renderHydrated();

        expect(screen.getByText('Server Rendered Recipe')).toBeTruthy();
    });
});
