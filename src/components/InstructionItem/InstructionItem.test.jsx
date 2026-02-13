import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InstructionItem from './InstructionItem';

describe('InstructionItem', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const defaultProps = {
        step: 'Mix ingredients',
        index: 0,
        isChecked: false,
        isExpanded: false,
        hasIngredients: true,
        inlineIngredients: [
            { item: 'Flour', amount: '2', unit: 'cups' },
            { item: 'Sugar', amount: '1', unit: 'cup' }
        ],
        onToggle: vi.fn(),
        onExpand: vi.fn(),
        onHover: vi.fn(),
        onLeave: vi.fn()
    };

    it('renders step text and number correctly', () => {
        render(<InstructionItem {...defaultProps} />);
        expect(screen.getByText('Mix ingredients')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('displays CheckIcon when checked', () => {
        render(<InstructionItem {...defaultProps} isChecked={true} />);
        // CheckIcon usually renders an svg or similar, checking for absence of number '1' or class logic
        // But since we can't easily query the icon by icon name without aria-label, let's check class
        const item = screen.getByTestId('instruction-item-0');
        expect(item).toHaveClass('checked');
        expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('calls onToggle when checkbox is clicked', () => {
        render(<InstructionItem {...defaultProps} />);
        const checkbox = screen.getByTestId('instruction-checkbox-0');
        fireEvent.click(checkbox);
        expect(defaultProps.onToggle).toHaveBeenCalledWith(0, expect.any(Object));
    });

    it('calls onExpand when item is clicked and hasIngredients is true', () => {
        render(<InstructionItem {...defaultProps} />);
        const item = screen.getByTestId('instruction-item-0');
        fireEvent.click(item);
        expect(defaultProps.onExpand).toHaveBeenCalledWith(0);
    });

    it('does NOT call onExpand when item is clicked and hasIngredients is false', () => {
        const props = { ...defaultProps, hasIngredients: false };
        render(<InstructionItem {...props} />);
        const item = screen.getByTestId('instruction-item-0');
        fireEvent.click(item);
        expect(props.onExpand).not.toHaveBeenCalled();
    });

    it('renders inline ingredients when expanded', () => {
        render(<InstructionItem {...defaultProps} isExpanded={true} />);
        expect(screen.getByTestId('inline-ingredients-0')).toBeInTheDocument();
        expect(screen.getByText('Flour')).toBeInTheDocument();
        expect(screen.getByText('2 cups')).toBeInTheDocument();
    });

    it('does not render inline ingredients when not expanded', () => {
        render(<InstructionItem {...defaultProps} isExpanded={false} />);
        expect(screen.queryByTestId('inline-ingredients-0')).not.toBeInTheDocument();
    });

    it('shows correct toggle hint text', () => {
        const { rerender } = render(<InstructionItem {...defaultProps} isExpanded={false} />);
        expect(screen.getByText('Show ingredients')).toBeInTheDocument();

        rerender(<InstructionItem {...defaultProps} isExpanded={true} />);
        expect(screen.getByText('Hide ingredients')).toBeInTheDocument();
    });
});
