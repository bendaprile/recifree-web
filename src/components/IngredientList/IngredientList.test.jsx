import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IngredientList, { IngredientItem } from './IngredientList';

describe('IngredientList Component', () => {
    const flatIngredients = [
        { item: 'Flour', amount: '2', unit: 'cups' },
        { item: 'Sugar', amount: '1', unit: 'cup' }
    ];

    const sectionedIngredients = [
        {
            title: 'Dough',
            items: [{ item: 'Flour', amount: '2', unit: 'cups' }]
        },
        {
            title: 'Filling',
            items: [{ item: 'Apple', amount: '3', unit: 'whole' }]
        }
    ];

    it('renders flat ingredients correctly', () => {
        const onToggle = vi.fn();
        render(
            <IngredientList
                ingredients={flatIngredients}
                checkedIngredients={[]}
                highlightedIngredientIds={[]}
                currentScale={1}
                onToggleIngredient={onToggle}
            />
        );

        expect(screen.getByText('Flour')).toBeInTheDocument();
        expect(screen.getByText('Sugar')).toBeInTheDocument();
        expect(screen.getByText('2 cups')).toBeInTheDocument();
    });

    it('handles ingredient toggles when clicked', () => {
        const onToggle = vi.fn();
        render(
            <IngredientList
                ingredients={flatIngredients}
                checkedIngredients={[]}
                highlightedIngredientIds={[]}
                currentScale={1}
                onToggleIngredient={onToggle}
            />
        );

        fireEvent.click(screen.getByText('Flour').closest('li'));
        expect(onToggle).toHaveBeenCalledWith(0);
    });

    it('renders sectioned ingredients with headers correctly', () => {
        const onToggle = vi.fn();
        render(
            <IngredientList
                ingredients={sectionedIngredients}
                checkedIngredients={[]}
                highlightedIngredientIds={[]}
                currentScale={1}
                onToggleIngredient={onToggle}
            />
        );

        expect(screen.getByText('Dough')).toBeInTheDocument();
        expect(screen.getByText('Filling')).toBeInTheDocument();
        expect(screen.getByText('Flour')).toBeInTheDocument();
        expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('applies scale factor to quantities', () => {
        render(
            <IngredientList
                ingredients={flatIngredients}
                checkedIngredients={[]}
                highlightedIngredientIds={[]}
                currentScale={2}
                onToggleIngredient={vi.fn()}
            />
        );

        expect(screen.getByText('4 cups')).toBeInTheDocument();
        expect(screen.getByText('2 cup')).toBeInTheDocument();
    });

    it('applies highlight classes when ingredient is active in step', () => {
        render(
            <IngredientList
                ingredients={flatIngredients}
                checkedIngredients={[0]}
                highlightedIngredientIds={[1]}
                currentScale={1}
                onToggleIngredient={vi.fn()}
            />
        );

        const flourItem = screen.getByText('Flour').closest('li');
        const sugarItem = screen.getByText('Sugar').closest('li');

        expect(flourItem).toHaveClass('checked');
        expect(sugarItem).toHaveClass('step-highlight');
    });
});
