import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Firebase SDK mocks must come before any module that imports them ────────
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    connectAuthEmulator: vi.fn(),
    onAuthStateChanged: vi.fn(() => () => {}),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendEmailVerification: vi.fn(),
}));
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

// ─── Mock RecipeCard to simplify testing ─────────────────────────────────────
vi.mock('../../components/RecipeCard/RecipeCard', () => ({
    default: ({ recipe }) => <div data-testid="recipe-card">{recipe.title}</div>
}));

// Mock the recipeService so tests never touch Firestore
vi.mock('../../services/recipeService', () => {
    return {
        getAllRecipes: vi.fn().mockResolvedValue([
            {
                id: '1',
                title: 'Pasta',
                description: 'Delicious pasta',
                tags: ['Italian', 'Dinner'],
                totalTime: '30 min',
                servings: 2,
                difficulty: 'Easy',
                image: 'pasta.jpg',
                ingredients: [],
                instructions: []
            },
            {
                id: '2',
                title: 'Burger',
                description: 'Juicy burger',
                tags: ['American', 'Dinner'],
                totalTime: '20 min',
                servings: 1,
                difficulty: 'Medium',
                image: 'burger.jpg',
                ingredients: [],
                instructions: []
            }
        ])
    };
});

// ─── Import modules AFTER mocks are declared ─────────────────────────────────
import Home from './Home';

describe('Home Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Render and wait for async data to load
    const renderHome = async () => {
        let result;
        await act(async () => {
            result = render(
                <BrowserRouter>
                    <Home />
                </BrowserRouter>
            );
        });
        // Wait for async recipes to appear (loading state cleared)
        await screen.findAllByTestId('recipe-card').catch(() => {});
        return result;
    };

    it('renders the hero section', async () => {
        await renderHome();
        expect(screen.getByText(/Recipes Without/i)).toBeInTheDocument();
        expect(screen.getByText(/the Clutter/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search for a recipe...')).toBeInTheDocument();
    });

    it('renders all unique tags including "All"', async () => {
        await renderHome();
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Italian')).toBeInTheDocument();
        expect(screen.getByText('American')).toBeInTheDocument();
        expect(screen.getByText('Dinner')).toBeInTheDocument();
    });

    it('renders all recipes initially', async () => {
        await renderHome();
        expect(screen.getByText('Showing 2 recipes')).toBeInTheDocument();
        expect(screen.getAllByTestId('recipe-card')).toHaveLength(2);
    });

    it('filters recipes by search query', async () => {
        await renderHome();
        const searchInput = screen.getByPlaceholderText('Search for a recipe...');
        fireEvent.change(searchInput, { target: { value: 'Pasta' } });

        expect(screen.getByText('Showing 1 recipe matching "Pasta"')).toBeInTheDocument();
        expect(screen.getAllByTestId('recipe-card')).toHaveLength(1);
        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Burger')).not.toBeInTheDocument();
    });

    it('filters recipes by tag', async () => {
        await renderHome();
        const italianTag = screen.getByText('Italian');
        fireEvent.click(italianTag);

        expect(screen.getByText('Showing 1 recipe in "Italian"')).toBeInTheDocument();
        expect(screen.getAllByTestId('recipe-card')).toHaveLength(1);
        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Burger')).not.toBeInTheDocument();
    });

    it('shows no recipes found message when no matches', async () => {
        await renderHome();
        const searchInput = screen.getByPlaceholderText('Search for a recipe...');
        fireEvent.change(searchInput, { target: { value: 'Pizza' } });

        expect(screen.getByText('No recipes found')).toBeInTheDocument();
        expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('clears filters when clear button is clicked', async () => {
        await renderHome();
        const searchInput = screen.getByPlaceholderText('Search for a recipe...');
        fireEvent.change(searchInput, { target: { value: 'Pizza' } });

        const clearButton = screen.getByText('Clear filters');
        fireEvent.click(clearButton);

        expect(screen.getByText('Showing 2 recipes')).toBeInTheDocument();
        expect(searchInput.value).toBe('');
    });

    it('changes grid layout when column buttons are clicked', async () => {
        const { container } = await renderHome();

        // Grid should default to 3 columns
        const grid = container.querySelector('.recipe-grid');
        expect(grid).toHaveClass('columns-3');

        // Find and click the '5' column button
        const button5 = screen.getByText('5');
        fireEvent.click(button5);

        expect(grid).toHaveClass('columns-5');
        expect(button5).toHaveClass('active');

        // Find and click the '3' column button
        const button3 = screen.getByText('3');
        fireEvent.click(button3);

        expect(grid).toHaveClass('columns-3');
        expect(button3).toHaveClass('active');
        expect(button5).not.toHaveClass('active');
    });
});
