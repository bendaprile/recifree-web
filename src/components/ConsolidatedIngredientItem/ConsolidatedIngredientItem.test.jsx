import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ConsolidatedIngredientItem from './ConsolidatedIngredientItem';

vi.mock('../Icons/Icons', () => ({
    CheckIcon: () => <span data-testid="check-icon" />
}));

const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);

const mockItem = {
    key: 'olive oil',
    displayName: 'Olive Oil',
    quantities: [{ amount: 3, displayAmount: '3', unit: 'tablespoon', displayUnit: 'tbsp' }],
    sources: [
        { recipeId: 'r1', recipeTitle: 'Pasta', ingredientId: 'i1', originalAmount: '1', originalUnit: 'tbsp' },
        { recipeId: 'r2', recipeTitle: 'Salad', ingredientId: 'i2', originalAmount: '2', originalUnit: 'tbsp' }
    ],
    checked: false
};

describe('ConsolidatedIngredientItem', () => {
    it('Renders unchecked ingredient', () => {
        renderWithRouter(<ConsolidatedIngredientItem consolidatedItem={mockItem} onToggle={vi.fn()} onRemoveItem={vi.fn()} />);
        
        expect(screen.getByText('3 tbsp')).toBeInTheDocument();
        expect(screen.getByText('Olive Oil')).toBeInTheDocument();
        expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    });

    it('Renders checked ingredient', () => {
        const checkedItem = { ...mockItem, checked: true };
        renderWithRouter(<ConsolidatedIngredientItem consolidatedItem={checkedItem} onToggle={vi.fn()} onRemoveItem={vi.fn()} />);
        
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
        const container = screen.getByTestId('consolidated-item-olive oil');
        expect(container).toHaveClass('checked');
    });

    it('Calls onToggle when row is clicked', () => {
        const onToggle = vi.fn();
        renderWithRouter(<ConsolidatedIngredientItem consolidatedItem={mockItem} onToggle={onToggle} onRemoveItem={vi.fn()} />);
        
        fireEvent.click(screen.getByTestId('consolidated-item-olive oil'));
        expect(onToggle).toHaveBeenCalledWith('olive oil');
    });

    it('Shows sources count', () => {
        renderWithRouter(<ConsolidatedIngredientItem consolidatedItem={mockItem} onToggle={vi.fn()} onRemoveItem={vi.fn()} />);
        expect(screen.getByText(/from 2 recipes/i)).toBeInTheDocument();
    });

    it('Expands sources on click', () => {
        renderWithRouter(<ConsolidatedIngredientItem consolidatedItem={mockItem} onToggle={vi.fn()} onRemoveItem={vi.fn()} />);
        
        const toggleBtn = screen.getByText(/from 2 recipes/i);
        fireEvent.click(toggleBtn);
        
        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.getByText('(1 tbsp)')).toBeInTheDocument();
        expect(screen.getByText('Salad')).toBeInTheDocument();
        expect(screen.getByText('(2 tbsp)')).toBeInTheDocument();
    });

    it('Calls onRemoveItem', () => {
        const onRemoveItem = vi.fn();
        renderWithRouter(<ConsolidatedIngredientItem consolidatedItem={mockItem} onToggle={vi.fn()} onRemoveItem={onRemoveItem} />);
        
        fireEvent.click(screen.getByText(/from 2 recipes/i));
        
        const removeBtns = screen.getAllByLabelText('Remove item');
        fireEvent.click(removeBtns[0]);
        
        expect(onRemoveItem).toHaveBeenCalledWith('r1', 'i1');
    });

    it('Shows multiple quantities', () => {
        const multipleQuantitiesItem = {
            ...mockItem,
            quantities: [
                { amount: 3, displayAmount: '3', unit: 'tablespoon', displayUnit: 'tbsp' },
                { amount: 1, displayAmount: '1', unit: 'pound', displayUnit: 'lb' }
            ]
        };
        renderWithRouter(<ConsolidatedIngredientItem consolidatedItem={multipleQuantitiesItem} onToggle={vi.fn()} onRemoveItem={vi.fn()} />);
        
        expect(screen.getByText('3 tbsp + 1 lb')).toBeInTheDocument();
    });

    it("Single source shows 'from 1 recipe'", () => {
        const singleSourceItem = {
            ...mockItem,
            sources: [mockItem.sources[0]]
        };
        renderWithRouter(<ConsolidatedIngredientItem consolidatedItem={singleSourceItem} onToggle={vi.fn()} onRemoveItem={vi.fn()} />);
        
        expect(screen.getByText(/from 1 recipe/i)).toBeInTheDocument();
        expect(screen.queryByText(/from 1 recipes/i)).not.toBeInTheDocument();
    });
});
