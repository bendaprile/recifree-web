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

// The reviews read is mocked; summarizeReviews stays real, because the header
// rating is exactly that calculation.
vi.mock('../../services/reviewService', async (importOriginal) => ({
    ...(await importOriginal()),
    getReviews: vi.fn(async () => []),
    saveReview: vi.fn(),
    deleteReview: vi.fn(),
}));

import { getRecipeBySlug } from '../../services/recipeService';
import { getReviews } from '../../services/reviewService';

describe('Recipe Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getReviews.mockResolvedValue([]);
        getRecipeBySlug.mockImplementation(async (slug) => {
            if (slug === 'test-recipe') return mockTestRecipe;
            if (slug === 'sectioned-recipe') return mockSectionedRecipe;
            return null;
        });
    });

    // Helper to render component with router and theme context
    const renderRecipe = async (id = 'test-recipe', state = null) => {
        window.scrollTo = vi.fn();
        let result;
        await act(async () => {
            result = render(
                <ThemeProvider>
                    <AuthProvider>
                        <SavedRecipesProvider>
                            <ShelfProvider>
                                <ShoppingListProvider>
                                    <MemoryRouter initialEntries={[{ pathname: `/recipe/${id}`, state }]}>
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

    describe('the header times', () => {
        it('keeps the header to one line: total, yield, rating', async () => {
            // Five labelled pairs pushed this bar wider than the recipe title.
            await renderRecipe();

            const badges = document.querySelector('.hero-badges');
            expect(badges).toHaveTextContent('Total: 30 min');
            expect(badges).toHaveTextContent('Yield: 4 Servings');
            expect(badges).not.toHaveTextContent('prep');
            expect(badges).not.toHaveTextContent('cook');
        });

        it('puts prep and cook beside the steps they describe', async () => {
            await renderRecipe();

            expect(document.querySelector('.swiss-panel-meta')).toHaveTextContent('10 min prep · 20 min cook');
        });

        it('falls back to prep in the header when a recipe has no total', async () => {
            const { totalTime, cookTime, ...noTotal } = mockTestRecipe;
            getRecipeBySlug.mockResolvedValue(noTotal);

            await renderRecipe();

            expect(document.querySelector('.hero-badges')).toHaveTextContent('Prep: 10 min');
        });

        it('shows no instructions meta for a recipe with only a total', async () => {
            const { prepTime, cookTime, ...totalOnly } = mockTestRecipe;
            getRecipeBySlug.mockResolvedValue(totalOnly);

            await renderRecipe();

            expect(document.querySelector('.swiss-panel-meta')).toBeNull();
        });
    });

    describe('the header rating', () => {
        it('shows the average and count beside the other recipe facts', async () => {
            getReviews.mockResolvedValue([{ uid: 'a', rating: 5 }, { uid: 'b', rating: 4 }]);

            await renderRecipe();

            const rating = document.querySelector('.hero-rating');
            expect(rating).toBeInTheDocument();
            expect(rating.textContent).toContain('4.5');
            expect(rating.textContent).toContain('(2)');
        });

        it('reads the same number the reviews section shows, from one fetch', async () => {
            getReviews.mockResolvedValue([{ uid: 'a', rating: 3 }]);

            await renderRecipe();

            // One read serves both the header and the list below it.
            expect(getReviews).toHaveBeenCalledTimes(1);
            expect(document.querySelector('.hero-rating').textContent).toContain('3');
        });

        it('keys reviews on the id when a recipe carries no slug', async () => {
            // Recipes served from the static JSON fallback have an id and no
            // slug. Keying on slug alone asked for reviews of undefined, and
            // the header silently showed nothing.
            const { slug, ...noSlug } = mockTestRecipe;
            getRecipeBySlug.mockResolvedValue(noSlug);
            getReviews.mockResolvedValue([{ uid: 'a', rating: 4 }]);

            await renderRecipe();

            expect(getReviews).toHaveBeenCalledWith('test-recipe');
            expect(document.querySelector('.hero-rating').textContent).toContain('4');
        });

        it('shows no rating for a recipe nobody has reviewed', async () => {
            await renderRecipe();

            expect(document.querySelector('.hero-rating')).toBeNull();
        });

        it('no longer shows a Tried & True badge, which every published recipe has by definition', async () => {
            getRecipeBySlug.mockResolvedValue({ ...mockTestRecipe, triedAndTrue: true });
            await renderRecipe();

            expect(screen.queryByText(/Tried & True/)).not.toBeInTheDocument();
        });
    });

    describe('reviews', () => {
        it('shows the reviews section on a catalog recipe', async () => {
            await renderRecipe();

            expect(screen.getByRole('heading', { name: 'Reviews' })).toBeInTheDocument();
        });

        it('invites a signed-out reader to create an account rather than hiding the section', async () => {
            await renderRecipe();

            expect(screen.getByRole('link', { name: /Create an account/ })).toBeInTheDocument();
        });
    });

    describe('duplicate paste notice', () => {
        it('explains why a paste landed on an existing recipe, and that it was saved', async () => {
            await renderRecipe('test-recipe', { alreadyPublished: { saved: true } });

            expect(screen.getByText(/Recifree already had this one/)).toBeInTheDocument();
            expect(screen.getByText(/added it to your saved recipes/)).toBeInTheDocument();
        });

        it('says nothing was copied when the recipe was already in the saved list', async () => {
            await renderRecipe('test-recipe', { alreadyPublished: { saved: false } });

            expect(screen.getByText(/already in your saved recipes/)).toBeInTheDocument();
        });

        it('explains a paste that reopened the user\'s own draft', async () => {
            await renderRecipe('test-recipe', { alreadyShelved: true });

            expect(screen.getByText(/You already had this one/)).toBeInTheDocument();
            expect(screen.getByText(/opened your draft/)).toBeInTheDocument();
        });

        it('shows no notice on an ordinary visit', async () => {
            await renderRecipe();

            expect(screen.queryByText(/Recifree already had this one/)).not.toBeInTheDocument();
        });
    });

    describe('dual attribution', () => {
        it('credits both the publisher and the original source', async () => {
            getRecipeBySlug.mockResolvedValue({
                ...mockTestRecipe,
                publishedByName: 'Ben D',
                source: { name: 'Original Cook', url: 'https://example.com/kale' }
            });
            await renderRecipe();

            expect(screen.getByText(/Cooked and published by/)).toBeInTheDocument();
            expect(screen.getByText('Ben D')).toBeInTheDocument();

            const sourceLink = screen.getByRole('link', { name: /Original Cook/ });
            expect(sourceLink).toHaveAttribute('href', 'https://example.com/kale');
        });

        it('shows no byline for a recipe published before bylines existed', async () => {
            await renderRecipe();

            expect(screen.queryByText(/Cooked and published by/)).not.toBeInTheDocument();
        });
    });

    it('renders recipe details and metadata successfully', async () => {
        await renderRecipe();
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('Total:')).toBeInTheDocument();
        expect(screen.getByText('30 min')).toBeInTheDocument();
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
        // The count and the word are separate elements now.
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

    it('shows no reviews on a draft, which is not in the catalog for anyone to review', async () => {
        window.localStorage.setItem('recifree_shelf', JSON.stringify([shelfRecipe]));
        await renderFromShelf();

        expect(screen.queryByRole('heading', { name: 'Reviews' })).not.toBeInTheDocument();
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

    it('does not render a published reference as if it were a recipe', async () => {
        // markPublished replaces the draft with a pointer at the catalog copy,
        // keeping the same id. /shelf/<id> stays in history, so the back button
        // after publishing lands here.
        window.localStorage.setItem('recifree_shelf', JSON.stringify([
            { id: shelfRecipe.id, slug: 'shelf-only', status: 'published', publishedAt: '2026-09-11T00:00:00.000Z' }
        ]));
        await renderFromShelf();
        expect(screen.getByText('Recipe Not Found')).toBeTruthy();
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
