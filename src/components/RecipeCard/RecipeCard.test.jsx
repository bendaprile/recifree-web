import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecipeCard from './RecipeCard';
import { ShoppingListProvider } from '../../context/ShoppingListContext';
import { AuthProvider } from '../../context/AuthContext';
import { SavedRecipesProvider } from '../../context/SavedRecipesContext';

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

const mockRecipe = {
    id: 'test-recipe',
    title: 'Test Recipe',
    image: 'test-image.jpg',
    totalTime: '30 min',
    servings: 4,
    tags: ['Healthy', 'Dinner'],
    difficulty: 'Easy'
};

const mockRecipeNoImage = {
    ...mockRecipe,
    image: null
};

describe('RecipeCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderCard = (recipe = mockRecipe, props = {}) => {
        return render(
            <AuthProvider>
                <SavedRecipesProvider>
                    <ShoppingListProvider>
                        <BrowserRouter>
                            <RecipeCard recipe={recipe} {...props} />
                        </BrowserRouter>
                    </ShoppingListProvider>
                </SavedRecipesProvider>
            </AuthProvider>
        );
    };

    describe('rating', () => {
        it('shows the stars, the average, and the count when the recipe has reviews', () => {
            renderCard(mockRecipe, { rating: { count: 3, average: 4.7 } });

            expect(screen.getByRole('img', { name: '4.7 out of 5 stars' })).toBeInTheDocument();
            expect(screen.getByText('4.7 (3)')).toBeInTheDocument();
        });

        it('shows nothing for a recipe nobody has reviewed', () => {
            renderCard(mockRecipe, { rating: { count: 0, average: null } });

            expect(screen.queryByText(/out of 5 stars/)).not.toBeInTheDocument();
        });

        it('shows nothing when the grid has no rating for it', () => {
            // Recipes with no reviews are absent from the summaries map, so the
            // prop arrives undefined rather than zeroed.
            renderCard(mockRecipe);

            expect(screen.queryByText(/out of 5 stars/)).not.toBeInTheDocument();
        });
    });

    it('renders recipe details correctly', () => {
        renderCard();
        expect(screen.getByText(mockRecipe.title)).toBeInTheDocument();
        expect(screen.getByText(mockRecipe.totalTime)).toBeInTheDocument();
        expect(screen.getByText(`${mockRecipe.servings} servings`)).toBeInTheDocument();
        expect(screen.getByText(mockRecipe.difficulty)).toBeInTheDocument();
    });

    it('renders tags correctly', () => {
        renderCard();
        mockRecipe.tags.forEach(tag => {
            expect(screen.getByText(tag)).toBeInTheDocument();
        });
    });

    it('uses the provided image', () => {
        renderCard();
        const img = screen.getByAltText(mockRecipe.title);
        expect(img).toHaveAttribute('src', 'test-image.jpg');
    });

    it('uses default image when no image is provided', () => {
        renderCard(mockRecipeNoImage);
        const img = screen.getByAltText(mockRecipe.title);
        expect(img.src).toContain('unsplash');
    });

    it('links to the correct recipe page', () => {
        renderCard();
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', `/recipe/${mockRecipe.id}`);
    });
});
