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
        expect(screen.getByText(/All flavor./i)).toBeInTheDocument();
        expect(screen.getByText(/No fluff./i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Your kitchen, zero pop-ups. Search recipes...')).toBeInTheDocument();
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
        const searchInput = screen.getByPlaceholderText('Your kitchen, zero pop-ups. Search recipes...');
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
        const searchInput = screen.getByPlaceholderText('Your kitchen, zero pop-ups. Search recipes...');
        fireEvent.change(searchInput, { target: { value: 'Pizza' } });

        expect(screen.getByText('No recipes found')).toBeInTheDocument();
        expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('clears filters when clear button is clicked', () => {
        renderHome();
        const searchInput = screen.getByPlaceholderText('Your kitchen, zero pop-ups. Search recipes...');
        fireEvent.change(searchInput, { target: { value: 'Pizza' } });

        const clearButton = screen.getByText('Clear filters');
        fireEvent.click(clearButton);

        expect(screen.getByText('Showing 2 recipes')).toBeInTheDocument();
        expect(searchInput.value).toBe('');
    });

    it('changes grid layout when column buttons are clicked', () => {
        const { container } = renderHome();
        
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
