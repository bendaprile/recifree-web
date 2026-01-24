import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Home from './Home';

// Mock the recipe data
vi.mock('../../data/recipes', () => {
    return {
        default: [
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
        ]
    };
});

// Mock RecipeCard to simplify testing
vi.mock('../../components/RecipeCard/RecipeCard', () => {
    return {
        default: ({ recipe }) => <div data-testid="recipe-card">{recipe.title}</div>
    };
});

describe('Home Page', () => {
    const renderHome = () => {
        return render(
            <BrowserRouter>
                <Home />
            </BrowserRouter>
        );
    };

    it('renders the hero section', () => {
        renderHome();
        expect(screen.getByText(/Recipes Without/i)).toBeInTheDocument();
        expect(screen.getByText(/the Clutter/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search for a recipe...')).toBeInTheDocument();
    });

    it('renders all unique tags including "All"', () => {
        renderHome();
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Italian')).toBeInTheDocument();
        expect(screen.getByText('American')).toBeInTheDocument();
        expect(screen.getByText('Dinner')).toBeInTheDocument();
    });

    it('renders all recipes initially', () => {
        renderHome();
        expect(screen.getByText('Showing 2 recipes')).toBeInTheDocument();
        expect(screen.getAllByTestId('recipe-card')).toHaveLength(2);
    });

    it('filters recipes by search query', () => {
        renderHome();
        const searchInput = screen.getByPlaceholderText('Search for a recipe...');
        fireEvent.change(searchInput, { target: { value: 'Pasta' } });

        expect(screen.getByText('Showing 1 recipe matching "Pasta"')).toBeInTheDocument();
        expect(screen.getAllByTestId('recipe-card')).toHaveLength(1);
        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Burger')).not.toBeInTheDocument();
    });

    it('filters recipes by tag', () => {
        renderHome();
        const italianTag = screen.getByText('Italian');
        fireEvent.click(italianTag);

        expect(screen.getByText('Showing 1 recipe in "Italian"')).toBeInTheDocument();
        expect(screen.getAllByTestId('recipe-card')).toHaveLength(1);
        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Burger')).not.toBeInTheDocument();
    });

    it('shows no recipes found message when no matches', () => {
        renderHome();
        const searchInput = screen.getByPlaceholderText('Search for a recipe...');
        fireEvent.change(searchInput, { target: { value: 'Pizza' } });

        expect(screen.getByText('No recipes found')).toBeInTheDocument();
        expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('clears filters when clear button is clicked', () => {
        renderHome();
        const searchInput = screen.getByPlaceholderText('Search for a recipe...');
        fireEvent.change(searchInput, { target: { value: 'Pizza' } });

        const clearButton = screen.getByText('Clear filters');
        fireEvent.click(clearButton);

        expect(screen.getByText('Showing 2 recipes')).toBeInTheDocument();
        expect(searchInput.value).toBe('');
    });
});
