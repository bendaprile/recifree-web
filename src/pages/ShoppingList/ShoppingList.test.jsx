import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShoppingList from './ShoppingList';
import * as ShoppingListContext from '../../context/ShoppingListContext';

// Mock the Icons to simplify testing
vi.mock('../../components/Icons/Icons', () => ({
    CheckIcon: () => <span data-testid="check-icon" />,
    TrashIcon: () => <span data-testid="trash-icon" />
}));

// Mock child components to test page-level logic in isolation
vi.mock('../../components/ShoppingListToolbar/ShoppingListToolbar', () => ({
    default: ({ itemCount, checkedCount, onCheckAll, onUncheckAll, onClearAll, viewMode, onViewModeChange }) => (
        <div data-testid="shopping-toolbar">
            <span data-testid="toolbar-item-count">{itemCount}</span>
            <span data-testid="toolbar-checked-count">{checkedCount}</span>
            <span data-testid="toolbar-view-mode">{viewMode}</span>
            <button onClick={onCheckAll}>Check All</button>
            <button onClick={onUncheckAll}>Uncheck All</button>
            <button onClick={onClearAll}>Clear All</button>
            <button onClick={() => onViewModeChange('recipe')}>Recipe View</button>
            <button onClick={() => onViewModeChange('consolidated')}>Consolidated View</button>
        </div>
    )
}));

vi.mock('../../components/ConsolidatedIngredientItem/ConsolidatedIngredientItem', () => ({
    default: ({ consolidatedItem, onToggle, onRemoveItem }) => (
        <div data-testid={`consolidated-item-${consolidatedItem.key}`}>
            <span>{consolidatedItem.displayName}</span>
            <span>{consolidatedItem.checked ? 'checked' : 'unchecked'}</span>
            <button onClick={() => onToggle(consolidatedItem.key)}>Toggle</button>
        </div>
    )
}));

const mockToggleItem = vi.fn();
const mockToggleConsolidatedItem = vi.fn();
const mockRemoveItem = vi.fn();
const mockRemoveRecipe = vi.fn();
const mockClearList = vi.fn();
const mockCheckAll = vi.fn();
const mockUncheckAll = vi.fn();

const defaultMockValue = {
    items: [],
    consolidatedItems: [],
    itemCount: 0,
    checkedCount: 0,
    toggleItem: mockToggleItem,
    toggleConsolidatedItem: mockToggleConsolidatedItem,
    removeItem: mockRemoveItem,
    removeRecipe: mockRemoveRecipe,
    clearList: mockClearList,
    checkAll: mockCheckAll,
    uncheckAll: mockUncheckAll,
};

const populatedMockValue = {
    ...defaultMockValue,
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
    consolidatedItems: [
        {
            key: 'salt',
            displayName: 'Salt',
            quantities: [{ amount: 1, displayAmount: '1', unit: 'teaspoon', displayUnit: 'tsp' }],
            sources: [{ recipeId: 'recipe-1', recipeTitle: 'Test Recipe', ingredientId: 'ing-1' }],
            checked: false
        },
        {
            key: 'pepper',
            displayName: 'Pepper',
            quantities: [{ amount: 1, displayAmount: '1', unit: 'teaspoon', displayUnit: 'tsp' }],
            sources: [{ recipeId: 'recipe-1', recipeTitle: 'Test Recipe', ingredientId: 'ing-2' }],
            checked: true
        }
    ],
    itemCount: 2,
    checkedCount: 1,
};

const renderWithRouter = (ui) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ShoppingList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty state when there are no items', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue(defaultMockValue);

        renderWithRouter(<ShoppingList />);
        
        expect(screen.getByText('Nothing on the list yet')).toBeInTheDocument();
        expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
    });

    it('renders consolidated view by default when populated', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue(populatedMockValue);

        renderWithRouter(<ShoppingList />);
        
        expect(screen.getByText('Shopping List')).toBeInTheDocument();
        expect(screen.getByTestId('shopping-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('toolbar-view-mode')).toHaveTextContent('consolidated');
        
        // Consolidated items rendered
        expect(screen.getByTestId('consolidated-item-salt')).toBeInTheDocument();
        expect(screen.getByTestId('consolidated-item-pepper')).toBeInTheDocument();
    });

    it('separates checked items with a divider', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue(populatedMockValue);

        renderWithRouter(<ShoppingList />);
        
        // Should show the checked divider since there are both checked and unchecked items
        expect(screen.getByText(/Checked off/)).toBeInTheDocument();
        expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
    });

    it('switches to recipe view when toggled', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue(populatedMockValue);

        renderWithRouter(<ShoppingList />);
        
        // Switch to recipe view
        fireEvent.click(screen.getByText('Recipe View'));
        
        // Should show recipe-grouped items
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        expect(screen.getByText('Salt')).toBeInTheDocument();
        expect(screen.getByText('Pepper')).toBeInTheDocument();
    });

    it('passes correct props to toolbar', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue(populatedMockValue);

        renderWithRouter(<ShoppingList />);

        expect(screen.getByTestId('toolbar-item-count')).toHaveTextContent('2');
        expect(screen.getByTestId('toolbar-checked-count')).toHaveTextContent('1');
    });

    it('handles toolbar actions correctly', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue(populatedMockValue);

        renderWithRouter(<ShoppingList />);

        fireEvent.click(screen.getByText('Check All'));
        expect(mockCheckAll).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText('Uncheck All'));
        expect(mockUncheckAll).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText('Clear All'));
        expect(mockClearList).toHaveBeenCalledTimes(1);
    });

    it('handles recipe view interactions correctly', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue(populatedMockValue);

        renderWithRouter(<ShoppingList />);
        
        // Switch to recipe view
        fireEvent.click(screen.getByText('Recipe View'));

        // Remove recipe
        const removeRecipeBtn = screen.getByTitle('Remove entire recipe');
        fireEvent.click(removeRecipeBtn);
        expect(mockRemoveRecipe).toHaveBeenCalledWith('recipe-1');

        // Remove item (first one — Salt)
        const removeItemBtns = screen.getAllByTitle('Remove item');
        fireEvent.click(removeItemBtns[0]);
        expect(mockRemoveItem).toHaveBeenCalledWith('recipe-1', 'ing-1');

        // Toggle item
        const listItem = screen.getByText('Salt').closest('li');
        fireEvent.click(listItem);
        expect(mockToggleItem).toHaveBeenCalledWith('recipe-1', 'ing-1');
    });

    it('hides checked divider when all items are unchecked', () => {
        const allUnchecked = {
            ...populatedMockValue,
            consolidatedItems: populatedMockValue.consolidatedItems.map(i => ({ ...i, checked: false })),
            checkedCount: 0,
        };
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue(allUnchecked);

        renderWithRouter(<ShoppingList />);
        
        expect(screen.queryByText(/Checked off/)).not.toBeInTheDocument();
    });
});
