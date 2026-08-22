import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Shelf from './Shelf';

vi.mock('../../config/firebase', () => ({ db: {}, auth: {} }));

let mockShelfValue;
vi.mock('../../context/ShelfContext', () => ({
    useShelf: () => mockShelfValue
}));

let mockAuthValue = { currentUser: null };
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockAuthValue
}));

// RecipeCard renders SaveRecipeButton, which reaches for saved-recipes state.
// The shelf replaces that slot, but the import still resolves, so stub it out.
vi.mock('../../components/SaveRecipeButton/SaveRecipeButton', () => ({
    default: () => <button type="button">Save</button>
}));

const recipe = (id, title) => ({
    id,
    title,
    description: 'A description',
    totalTime: '30 mins',
    servings: 4,
    tags: ['Dinner'],
    difficulty: 'Easy'
});

const renderShelf = () => render(<MemoryRouter><Shelf /></MemoryRouter>);

describe('Shelf page', () => {
    beforeEach(() => {
        mockAuthValue = { currentUser: null };
        mockShelfValue = {
            shelf: [],
            loading: false,
            unshelveRecipe: vi.fn(),
            isAtRisk: false
        };
    });

    afterEach(cleanup);

    it('shows a skeleton while the shelf loads', () => {
        mockShelfValue.loading = true;
        const { container } = renderShelf();
        expect(container.querySelector('.recipe-card-skeleton')).toBeTruthy();
    });

    it('shows the empty state with a route to the extractor', () => {
        renderShelf();
        expect(screen.getByText('Nothing on the shelf yet')).toBeTruthy();
        expect(screen.getByRole('link', { name: /extract a recipe/i }).getAttribute('href')).toBe('/add');
    });

    it('renders a card per shelved recipe', () => {
        mockShelfValue.shelf = [recipe('cookies', 'Cookies'), recipe('bread', 'Bread')];
        renderShelf();

        expect(screen.getByText('Cookies')).toBeTruthy();
        expect(screen.getByText('Bread')).toBeTruthy();
        expect(screen.getByText('2 recipes · on this device only')).toBeTruthy();
    });

    it('links cards to the shelf route, not the public recipe route', () => {
        // A shelf recipe is not in the public `recipes` collection, so a
        // /recipe/:id link would dead-end.
        mockShelfValue.shelf = [recipe('cookies', 'Cookies')];
        renderShelf();

        const card = screen.getByText('Cookies').closest('a');
        expect(card.getAttribute('href')).toBe('/shelf/cookies');
    });

    it('says the shelf is synced once the user is signed in', () => {
        mockAuthValue = { currentUser: { uid: 'user-1' } };
        mockShelfValue.shelf = [recipe('cookies', 'Cookies')];
        renderShelf();

        expect(screen.getByText('1 recipe · synced to your account')).toBeTruthy();
    });

    describe('the at-risk warning', () => {
        it('is absent when the shelf is not at risk', () => {
            mockShelfValue.shelf = [recipe('cookies', 'Cookies')];
            renderShelf();
            expect(screen.queryByRole('alert')).toBeNull();
        });

        it('warns plainly, and offers an account, when the shelf is device-only', () => {
            mockShelfValue.shelf = [recipe('cookies', 'Cookies')];
            mockShelfValue.isAtRisk = true;
            renderShelf();

            const banner = screen.getByRole('alert');
            expect(banner.textContent).toContain('only exist on this device');
            expect(screen.getByRole('link', { name: /keep them/i }).getAttribute('href')).toBe('/signup');
        });
    });

    describe('removing a recipe', () => {
        it('unshelves without navigating away', () => {
            mockShelfValue.shelf = [recipe('cookies', 'Cookies')];
            renderShelf();

            const removeButton = screen.getByRole('button', { name: /remove cookies from your shelf/i });
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            fireEvent(removeButton, clickEvent);

            expect(mockShelfValue.unshelveRecipe).toHaveBeenCalledWith('cookies');
            // The button sits inside the card's Link; a bubbled click would navigate.
            expect(clickEvent.defaultPrevented).toBe(true);
        });

        it('does not render the save button on an unpublished recipe', () => {
            mockShelfValue.shelf = [recipe('cookies', 'Cookies')];
            renderShelf();
            expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
        });
    });
});
