import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Recipe from './Recipe';
import { ShoppingListProvider } from '../../context/ShoppingListContext';

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
                'Add sugar carefully',
                'Rest for 10 mins'
            ],
            stepIngredients: [
                [0, 1], // Standard: Flour and Sugar
                [{ "id": 1, "amount": "1/2", "unit": "cup" }], // Split: 1/2 cup Sugar
                [] // Empty: No ingredients
            ],
            difficulty: 'Easy',
            tags: ['TestTag']
        },
        {
            id: 'sectioned-recipe',
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
                [0, 1], // Sauce ingredients (Indices 0 and 1 from flattened list)
                [2],    // Chicken (Index 2 from flattened list)
                [3]     // Rice (Index 3 from flattened list)
            ],
            difficulty: 'Medium',
            tags: ['Sectioned']
        }
    ]
}));

describe('Recipe Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Helper to render component with router context
    const renderRecipe = (id = 'test-recipe') => {
        window.scrollTo = vi.fn(); // Mock scrollTo

        return render(
            <ShoppingListProvider>
                <MemoryRouter initialEntries={[`/recipe/${id}`]}>
                    <Routes>
                        <Route path="/recipe/:id" element={<Recipe />} />
                    </Routes>
                </MemoryRouter>
            </ShoppingListProvider>
        );
    };

    it('renders popup correctly for sectioned ingredients', () => {
        renderRecipe('sectioned-recipe');

        // Hover over Step 1 ("Make sauce")
        const step1 = screen.getByText('Make sauce').closest('li');
        fireEvent.mouseEnter(step1);

        // Verification: Popup should show Soy Sauce and Ginger
        const popup = screen.getByText('Step 1 Ingredients').closest('.step-ingredients-card');
        expect(popup).toBeInTheDocument();

        const { within } = require('@testing-library/dom');
        expect(within(popup).getByText('Soy Sauce')).toBeInTheDocument();
        expect(within(popup).getByText('2 tbsp')).toBeInTheDocument();
        expect(within(popup).getByText('Ginger')).toBeInTheDocument();
        expect(within(popup).getByText('1 tsp')).toBeInTheDocument();
    });

    it('renders recipe details successfully', () => {
        renderRecipe();
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('renders ingredient popup on hover', () => {
        renderRecipe();

        // Hover over Step 1 ("Mix ingredients")
        const step1 = screen.getByText('Mix ingredients').closest('li');
        fireEvent.mouseEnter(step1);

        // Verification: Popup appears with ingredients
        const popup = screen.getByText('Step 1 Ingredients').closest('.step-ingredients-card');
        expect(popup).toBeInTheDocument();

        // Check content inside the popup specifically
        // Use within to scope the search
        const { getByText } = require('@testing-library/react');
        const { within } = require('@testing-library/dom');

        expect(within(popup).getByText('Flour')).toBeInTheDocument();
        expect(within(popup).getByText('2 cups')).toBeInTheDocument();
        expect(within(popup).getByText('Sugar')).toBeInTheDocument();
        expect(within(popup).getByText('1 cup')).toBeInTheDocument();

        // Mouse leave
        fireEvent.mouseLeave(step1);
        expect(screen.queryByText('Step 1 Ingredients')).not.toBeInTheDocument();
    });

    it('renders split ingredient amounts correctly', () => {
        renderRecipe();

        // Hover over Step 2 ("Add sugar carefully")
        const step2 = screen.getByText('Add sugar carefully').closest('li');
        fireEvent.mouseEnter(step2);

        // Verification: Popup appears with split amount (1/2 cup)
        const popup = screen.getByText('Step 2 Ingredients').closest('.step-ingredients-card');
        expect(popup).toBeInTheDocument();

        const { within } = require('@testing-library/dom');
        expect(within(popup).getByText('Sugar')).toBeInTheDocument();
        expect(within(popup).getByText('1/2 cup')).toBeInTheDocument(); // Override amount
        expect(within(popup).queryByText('1 cup')).not.toBeInTheDocument(); // Original amount shouldn't be in popup
    });

    it('does NOT render popup for empty steps', () => {
        renderRecipe();

        // Hover over Step 3 ("Rest for 10 mins")
        const step3 = screen.getByText('Rest for 10 mins').closest('li');
        fireEvent.mouseEnter(step3);

        // Verification: No popup appears
        expect(screen.queryByText('Step 3 Ingredients')).not.toBeInTheDocument();
    });

    it('toggles ingredient checkboxes', () => {
        renderRecipe();

        const flourItem = screen.getByText(/Flour/).closest('li');
        expect(flourItem).not.toHaveClass('checked');

        fireEvent.click(flourItem);
        expect(flourItem).toHaveClass('checked');
    });

    it('toggles instruction steps', () => {
        renderRecipe();

        const step1 = screen.getByText('Mix ingredients').closest('li');
        expect(step1).not.toHaveClass('checked');

        fireEvent.click(step1);
        expect(step1).toHaveClass('checked');
    });

    it('renders Jump to Recipe button which scrolls to instructions', () => {
        renderRecipe();

        const jumpButton = screen.getByText(/Jump to Recipe/i);
        expect(jumpButton).toBeInTheDocument();

        // Mock getElementById to return a dummy element with scrollIntoView
        const scrollIntoViewMock = vi.fn();
        vi.spyOn(document, 'getElementById').mockReturnValue({
            scrollIntoView: scrollIntoViewMock
        });

        fireEvent.click(jumpButton);

        expect(document.getElementById).toHaveBeenCalledWith('instructions');
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
});
