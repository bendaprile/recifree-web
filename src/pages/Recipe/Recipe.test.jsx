import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Recipe from './Recipe';
import { ShoppingListProvider } from '../../context/ShoppingListContext';

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
    onAuthStateChanged: vi.fn(),
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

// Mock firebase config
vi.mock('../../config/firebase', () => ({ db: {}, auth: {} }));

import { getRecipeBySlug } from '../../services/recipeService';


describe('Recipe Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: return test recipe
        getRecipeBySlug.mockImplementation(async (slug) => {
            if (slug === 'test-recipe') return mockTestRecipe;
            if (slug === 'sectioned-recipe') return mockSectionedRecipe;
            return null;
        });
    });

    // Helper to render component with router context
    const renderRecipe = async (id = 'test-recipe') => {
        window.scrollTo = vi.fn();
        let result;
        await act(async () => {
            result = render(
                <ShoppingListProvider>
                    <MemoryRouter initialEntries={[`/recipe/${id}`]}>
                        <Routes>
                            <Route path="/recipe/:id" element={<Recipe />} />
                        </Routes>
                    </MemoryRouter>
                </ShoppingListProvider>
            );
        });
        return result;
    };

    it('renders popup correctly for sectioned ingredients', async () => {
        await renderRecipe('sectioned-recipe');

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

    it('renders recipe details successfully', async () => {
        await renderRecipe();
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('renders ingredient popup on hover', async () => {
        await renderRecipe();

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

    it('renders split ingredient amounts correctly', async () => {
        await renderRecipe();

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

    it('does NOT render popup for empty steps', async () => {
        await renderRecipe();

        // Hover over Step 3 ("Rest for 10 mins")
        const step3 = screen.getByText('Rest for 10 mins').closest('li');
        fireEvent.mouseEnter(step3);

        // Verification: No popup appears
        expect(screen.queryByText('Step 3 Ingredients')).not.toBeInTheDocument();
    });

    it('toggles ingredient checkboxes', async () => {
        await renderRecipe();

        const flourItem = screen.getByText(/Flour/).closest('li');
        expect(flourItem).not.toHaveClass('checked');

        fireEvent.click(flourItem);
        expect(flourItem).toHaveClass('checked');
    });

    it('toggles instruction steps completion when checkbox is clicked', async () => {
        await renderRecipe();

        const step1 = screen.getByText('Mix ingredients').closest('li');
        const checkbox = step1.querySelector('.instruction-checkbox-wrapper');

        expect(step1).not.toHaveClass('checked');

        fireEvent.click(checkbox);
        expect(step1).toHaveClass('checked');
    });

    it('toggles step expansion and shows inline ingredients when step is clicked', async () => {
        await renderRecipe();

        const step1 = screen.getByText('Mix ingredients').closest('li');

        // Initially not expanded
        expect(step1).not.toHaveClass('expanded');
        expect(screen.queryByText('2 cups', { selector: '.step-ingredient-text strong' })).not.toBeInTheDocument();

        // Click to expand
        fireEvent.click(step1);

        expect(step1).toHaveClass('expanded');
        // Check for inline ingredient presence
        expect(screen.getByText('2 cups', { selector: '.step-ingredient-text strong' })).toBeInTheDocument();
        expect(screen.getByText('Flour', { selector: '.step-ingredient-text' })).toBeInTheDocument();

        // Click to collapse
        fireEvent.click(step1);
        expect(step1).not.toHaveClass('expanded');
        expect(screen.queryByText('2 cups', { selector: '.step-ingredient-text strong' })).not.toBeInTheDocument();
    });

    it('renders Jump to Recipe button which scrolls to instructions', async () => {
        await renderRecipe();

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
