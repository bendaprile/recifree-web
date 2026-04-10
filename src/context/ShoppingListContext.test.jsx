import { render, screen, screen as domScreen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShoppingListProvider, useShoppingList } from './ShoppingListContext';

Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    },
    writable: true
});

// Basic wrapper for testing context
const TestComponent = () => {
    const { items, itemCount, addRecipe, toggleItem, removeItem, removeRecipe, clearList } = useShoppingList();
    
    return (
        <div>
            <span data-testid="item-count">{itemCount}</span>
            <button onClick={() => addRecipe({
                id: 'r1',
                title: 'Recipe 1',
                ingredients: [{ item: 'Salt', amount: '1', unit: 'tsp' }]
            })}>Add Recipe Flat</button>
            <button onClick={() => addRecipe({
                id: 'r2',
                title: 'Recipe 2',
                ingredients: [{
                    section: 'Main',
                    items: [{ item: 'Pepper', amount: '1', unit: 'tsp' }]
                }]
            })}>Add Recipe Sectioned</button>
            <button onClick={clearList}>Clear List</button>
            <ul>
                {items.map(group => (
                    <li key={group.recipeId} data-testid={`group-${group.recipeId}`}>
                        {group.recipeTitle}
                        <button onClick={() => removeRecipe(group.recipeId)}>Remove Recipe</button>
                        <ul>
                            {group.ingredients.map(ing => (
                                <li key={ing.id} data-testid={`ing-${ing.id}`}>
                                    {ing.item} - {ing.checked ? 'Checked' : 'Unchecked'}
                                    <button onClick={() => toggleItem(group.recipeId, ing.id)}>Toggle</button>
                                    <button onClick={() => removeItem(group.recipeId, ing.id)}>Remove Item</button>
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </div>
    );
};

describe('ShoppingListContext', () => {
    beforeEach(() => {
        window.localStorage.clear.mockClear();
        window.localStorage.getItem.mockClear();
        window.localStorage.setItem.mockClear();
        vi.restoreAllMocks();
    });

    it('provides default empty state', () => {
        render(
            <ShoppingListProvider>
                <TestComponent />
            </ShoppingListProvider>
        );
        expect(screen.getByTestId('item-count')).toHaveTextContent('0');
    });

    it('loads initial state from localStorage', () => {
        window.localStorage.getItem.mockReturnValueOnce(JSON.stringify([
            {
                recipeId: 'test-recipe',
                recipeTitle: 'Loaded Recipe',
                ingredients: [{ id: '1', item: 'Garlic', checked: false }]
            }
        ]));

        render(
            <ShoppingListProvider>
                <TestComponent />
            </ShoppingListProvider>
        );
        expect(screen.getByTestId('item-count')).toHaveTextContent('1');
        expect(screen.getByText(/Loaded Recipe/)).toBeInTheDocument();
    });

    it('adds flat recipes correctly', () => {
        render(
            <ShoppingListProvider>
                <TestComponent />
            </ShoppingListProvider>
        );
        
        fireEvent.click(screen.getByText('Add Recipe Flat'));
        
        expect(screen.getByTestId('item-count')).toHaveTextContent('1');
        expect(screen.getByText(/Recipe 1/)).toBeInTheDocument();
        expect(screen.getByText(/Salt - Unchecked/)).toBeInTheDocument();
    });

    it('adds sectioned recipes correctly', () => {
        render(
            <ShoppingListProvider>
                <TestComponent />
            </ShoppingListProvider>
        );
        
        fireEvent.click(screen.getByText('Add Recipe Sectioned'));
        
        expect(screen.getByTestId('item-count')).toHaveTextContent('1');
        expect(screen.getByText(/Recipe 2/)).toBeInTheDocument();
        expect(screen.getByText(/Pepper - Unchecked/)).toBeInTheDocument();
    });

    it('toggles, removes items, and clears list', () => {
        render(
            <ShoppingListProvider>
                <TestComponent />
            </ShoppingListProvider>
        );
        
        // Add item
        fireEvent.click(screen.getByText('Add Recipe Flat'));
        
        // Toggle item
        fireEvent.click(screen.getByText('Toggle'));
        expect(screen.getByText(/Salt - Checked/)).toBeInTheDocument();
        
        // Remove item
        fireEvent.click(screen.getByText('Remove Item'));
        expect(screen.getByTestId('item-count')).toHaveTextContent('0'); // Also testing that empty groups are removed
        expect(screen.queryByText(/Recipe 1/)).not.toBeInTheDocument();
        
        // Add again then remove entire recipe
        fireEvent.click(screen.getByText('Add Recipe Flat'));
        fireEvent.click(screen.getByText('Remove Recipe'));
        expect(screen.getByTestId('item-count')).toHaveTextContent('0');

        // Add again then clear all
        fireEvent.click(screen.getByText('Add Recipe Flat'));
        fireEvent.click(screen.getByText('Clear List'));
        expect(screen.getByTestId('item-count')).toHaveTextContent('0');
    });

    it('appends ingredients if recipe already exists', () => {
        render(
            <ShoppingListProvider>
                <TestComponent />
            </ShoppingListProvider>
        );
        
        // Add same recipe twice
        fireEvent.click(screen.getByText('Add Recipe Flat'));
        fireEvent.click(screen.getByText('Add Recipe Flat'));
        
        expect(screen.getByTestId('item-count')).toHaveTextContent('2');
    });

    it('handles localStorage errors gracefully during init', () => {
        vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
            throw new Error('Storage disabled');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ShoppingListProvider>
                <TestComponent />
            </ShoppingListProvider>
        );
        
        expect(screen.getByTestId('item-count')).toHaveTextContent('0');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('handles localStorage errors gracefully during save', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        render(
            <ShoppingListProvider>
                <TestComponent />
            </ShoppingListProvider>
        );
        
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
            throw new Error('Storage full');
        });

        fireEvent.click(screen.getByText('Add Recipe Flat'));
        
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
