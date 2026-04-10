import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShoppingList from './ShoppingList';
import * as ShoppingListContext from '../../context/ShoppingListContext';

// Mock the Icons to simplify testing
vi.mock('../../components/Icons/Icons', () => ({
    CheckIcon: () => <span data-testid="check-icon" />
}));

const mockToggleItem = vi.fn();
const mockRemoveItem = vi.fn();
const mockRemoveRecipe = vi.fn();
const mockClearList = vi.fn();

const renderWithRouter = (ui) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ShoppingList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty state when there are no items', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [],
            itemCount: 0,
            toggleItem: mockToggleItem,
            removeItem: mockRemoveItem,
            removeRecipe: mockRemoveRecipe,
            clearList: mockClearList,
        });

        renderWithRouter(<ShoppingList />);
        
        expect(screen.getByText('Your shopping list is empty')).toBeInTheDocument();
        expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
    });

    it('renders list of items when populated', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [
                {
                    recipeId: 'recipe-1',
                    recipeTitle: 'Test Recipe',
                    ingredients: [
                        { id: 'ing-1', item: 'Salt', amount: '1', unit: 'tsp', checked: false },
                        { id: 'ing-2', item: 'Pepper', amount: '1', unit: 'tsp', checked: true }
                    ]
                }
            ],
            itemCount: 2,
            toggleItem: mockToggleItem,
            removeItem: mockRemoveItem,
            removeRecipe: mockRemoveRecipe,
            clearList: mockClearList,
        });

        renderWithRouter(<ShoppingList />);
        
        expect(screen.getByText(/Shopping List/i)).toBeInTheDocument();
        expect(screen.getByText('(2 items)')).toBeInTheDocument();
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        
        // Assert ingredients
        expect(screen.getByText('Salt')).toBeInTheDocument();
        expect(screen.getByText('Pepper')).toBeInTheDocument();
        expect(screen.getByTestId('check-icon')).toBeInTheDocument(); // 1 checked item
    });

    it('handles interactions correctly', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [
                {
                    recipeId: 'recipe-1',
                    recipeTitle: 'Test Recipe',
                    ingredients: [
                        { id: 'ing-1', item: 'Salt', amount: '1', unit: 'tsp', checked: false }
                    ]
                }
            ],
            itemCount: 1,
            toggleItem: mockToggleItem,
            removeItem: mockRemoveItem,
            removeRecipe: mockRemoveRecipe,
            clearList: mockClearList,
        });

        renderWithRouter(<ShoppingList />);

        // Click Clear All
        const clearBtn = screen.getByText('Clear All');
        fireEvent.click(clearBtn);
        expect(mockClearList).toHaveBeenCalledTimes(1);

        // Click Remove Recipe
        const removeRecipeBtn = screen.getByTitle('Remove entire recipe');
        fireEvent.click(removeRecipeBtn);
        expect(mockRemoveRecipe).toHaveBeenCalledWith('recipe-1');

        // Click Remove Item
        const removeItemBtn = screen.getByTitle('Remove item');
        fireEvent.click(removeItemBtn);
        expect(mockRemoveItem).toHaveBeenCalledWith('recipe-1', 'ing-1');

        // Click Toggle Item
        const listItem = screen.getByText('Salt').closest('li');
        fireEvent.click(listItem);
        expect(mockToggleItem).toHaveBeenCalledWith('recipe-1', 'ing-1');
    });
});
