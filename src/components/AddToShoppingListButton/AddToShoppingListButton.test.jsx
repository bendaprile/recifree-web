import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddToShoppingListButton from './AddToShoppingListButton';
import * as ShoppingListContext from '../../context/ShoppingListContext';

// Mock Icons
vi.mock('../Icons/Icons', () => ({
    CheckIcon: () => <span data-testid="check-icon" />,
    XIcon: () => <span data-testid="x-icon" />
}));

const mockAddRecipe = vi.fn();
const mockRemoveRecipe = vi.fn();

const mockRecipe = {
    id: 'test-recipe',
    title: 'Test Recipe'
};

describe('AddToShoppingListButton Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders "Add to List" when recipe is not in list', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [],
            addRecipe: mockAddRecipe,
            removeRecipe: mockRemoveRecipe
        });

        render(<AddToShoppingListButton recipe={mockRecipe} />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveTextContent('Add to List');
        expect(button).toHaveTextContent('+');
    });

    it('renders "Added!" when recipe is already in list', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [{ recipeId: 'test-recipe' }],
            addRecipe: mockAddRecipe,
            removeRecipe: mockRemoveRecipe
        });

        render(<AddToShoppingListButton recipe={mockRecipe} />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveTextContent('Added!');
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('shows XIcon when hovered and already in list', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [{ recipeId: 'test-recipe' }],
            addRecipe: mockAddRecipe,
            removeRecipe: mockRemoveRecipe
        });

        render(<AddToShoppingListButton recipe={mockRecipe} />);
        
        const button = screen.getByRole('button');
        fireEvent.mouseEnter(button);
        
        expect(screen.getByTestId('x-icon')).toBeInTheDocument();
        expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();

        fireEvent.mouseLeave(button);
        expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('calls addRecipe when clicked and not in list', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [],
            addRecipe: mockAddRecipe,
            removeRecipe: mockRemoveRecipe
        });

        render(<AddToShoppingListButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        expect(mockAddRecipe).toHaveBeenCalledWith(mockRecipe);
        expect(mockRemoveRecipe).not.toHaveBeenCalled();
    });

    it('calls removeRecipe when clicked and already in list', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [{ recipeId: 'test-recipe' }],
            addRecipe: mockAddRecipe,
            removeRecipe: mockRemoveRecipe
        });

        render(<AddToShoppingListButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        expect(mockRemoveRecipe).toHaveBeenCalledWith('test-recipe');
        expect(mockAddRecipe).not.toHaveBeenCalled();
    });

    it('renders properly in icon-only variant', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [],
            addRecipe: mockAddRecipe,
            removeRecipe: mockRemoveRecipe
        });

        render(<AddToShoppingListButton recipe={mockRecipe} variant="icon-only" />);
        
        expect(screen.getByText('Add Ingredients to Shopping List')).toHaveClass('tooltip');
        expect(screen.queryByText('Add to List')).not.toBeInTheDocument();
    });

    it('renders properly in icon-only variant when added', () => {
        vi.spyOn(ShoppingListContext, 'useShoppingList').mockReturnValue({
            items: [{ recipeId: 'test-recipe' }],
            addRecipe: mockAddRecipe,
            removeRecipe: mockRemoveRecipe
        });

        render(<AddToShoppingListButton recipe={mockRecipe} variant="icon-only" />);
        
        expect(screen.getByText('Remove from shopping list')).toHaveClass('tooltip');
        expect(screen.queryByText('Added!')).not.toBeInTheDocument();
    });
});
