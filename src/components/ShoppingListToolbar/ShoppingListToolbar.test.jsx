import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ShoppingListToolbar from './ShoppingListToolbar';

vi.mock('../Icons/Icons', () => ({
    CheckIcon: () => <span data-testid="check-icon" />,
    TrashIcon: () => <span data-testid="trash-icon" />
}));

describe('ShoppingListToolbar', () => {
    const defaultProps = {
        itemCount: 12,
        checkedCount: 4,
        onCheckAll: vi.fn(),
        onUncheckAll: vi.fn(),
        onClearAll: vi.fn(),
        viewMode: 'consolidated',
        onViewModeChange: vi.fn()
    };

    it('Renders status with counts', () => {
        render(<ShoppingListToolbar {...defaultProps} />);
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText(/of 12 checked/)).toBeInTheDocument();
    });

    it('Shows "All checked!" when all items checked', () => {
        render(<ShoppingListToolbar {...defaultProps} itemCount={5} checkedCount={5} />);
        expect(screen.getByText('All checked!')).toBeInTheDocument();
    });

    it('Shows "0 checked" when none checked', () => {
        render(<ShoppingListToolbar {...defaultProps} itemCount={5} checkedCount={0} />);
        expect(screen.getByText('0 checked')).toBeInTheDocument();
    });

    it('Check All button calls onCheckAll', () => {
        render(<ShoppingListToolbar {...defaultProps} />);
        fireEvent.click(screen.getByText('Check All'));
        expect(defaultProps.onCheckAll).toHaveBeenCalled();
    });

    it('Uncheck All button calls onUncheckAll', () => {
        render(<ShoppingListToolbar {...defaultProps} />);
        fireEvent.click(screen.getByText('Uncheck All'));
        expect(defaultProps.onUncheckAll).toHaveBeenCalled();
    });

    it('Clear All button calls onClearAll', () => {
        render(<ShoppingListToolbar {...defaultProps} />);
        fireEvent.click(screen.getByText(/Clear All/i));
        expect(defaultProps.onClearAll).toHaveBeenCalled();
    });

    it('View toggle calls onViewModeChange', () => {
        render(<ShoppingListToolbar {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Recipe view'));
        expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('recipe');

        fireEvent.click(screen.getByLabelText('Consolidated view'));
        expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('consolidated');
    });

    it('Active view mode is highlighted', () => {
        const { rerender } = render(<ShoppingListToolbar {...defaultProps} viewMode="consolidated" />);
        expect(screen.getByLabelText('Consolidated view')).toHaveClass('active');
        expect(screen.getByLabelText('Recipe view')).not.toHaveClass('active');

        rerender(<ShoppingListToolbar {...defaultProps} viewMode="recipe" />);
        expect(screen.getByLabelText('Recipe view')).toHaveClass('active');
        expect(screen.getByLabelText('Consolidated view')).not.toHaveClass('active');
    });
});
