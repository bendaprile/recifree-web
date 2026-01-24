import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Recipe from './Recipe';

vi.mock('../../data/recipes', () => ({
    default: [
        {
            id: 'test-recipe',
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
                'Bake'
            ],
            difficulty: 'Easy',
            tags: ['TestTag']
        }
    ]
}));

describe('Recipe Page', () => {
    // Helper to render component with router context
    const renderRecipe = (id = 'test-recipe') => {
        window.scrollTo = vi.fn(); // Mock scrollTo

        return render(
            <MemoryRouter initialEntries={[`/recipe/${id}`]}>
                <Routes>
                    <Route path="/recipe/:id" element={<Recipe />} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('renders recipe details successfully', () => {
        renderRecipe();
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('10 min')).toBeInTheDocument(); // Prep time
        expect(screen.getByText('30 min')).toBeInTheDocument(); // Total time
    });

    it('renders "Recipe Not Found" for invalid ID', () => {
        renderRecipe('invalid-id');
        expect(screen.getByText('Recipe Not Found')).toBeInTheDocument();
        expect(screen.getByText('Browse All Recipes')).toBeInTheDocument();
    });

    it('toggles ingredient checkboxes', () => {
        renderRecipe();

        // Find list item by text content pattern since it has structure
        // Ingredients contain "2 cups Flour"
        const flourItem = screen.getByText(/Flour/).closest('li');
        expect(flourItem).not.toHaveClass('checked');

        fireEvent.click(flourItem);
        expect(flourItem).toHaveClass('checked');
        expect(screen.getByText('✓')).toBeInTheDocument();

        fireEvent.click(flourItem);
        expect(flourItem).not.toHaveClass('checked');
    });

    it('toggles instruction steps', () => {
        renderRecipe();

        const step1 = screen.getByText('Mix ingredients').closest('li');
        expect(step1).not.toHaveClass('checked');

        fireEvent.click(step1);
        expect(step1).toHaveClass('checked');

        fireEvent.click(step1);
        expect(step1).not.toHaveClass('checked');
    });
});
