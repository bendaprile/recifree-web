import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Shelf from './Shelf';

vi.mock('../../config/firebase', () => ({ db: {}, auth: {} }));

// Published entries are references; the page resolves them against the catalog.
const mockGetRecipeBySlug = vi.fn();
vi.mock('../../services/recipeService', () => ({
    getRecipeBySlug: (...args) => mockGetRecipeBySlug(...args)
}));

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

const renderShelf = async () => {
    let result;
    await act(async () => {
        result = render(<MemoryRouter><Shelf /></MemoryRouter>);
    });
    return result;
};

describe('Shelf page', () => {
    beforeEach(() => {
        mockAuthValue = { currentUser: null };
        mockGetRecipeBySlug.mockReset().mockResolvedValue(null);
        mockShelfValue = {
            privateRecipes: [],
            publishedRefs: [],
            loading: false,
            unshelveRecipe: vi.fn(),
            isAtRisk: false
        };
    });

    afterEach(cleanup);

    it('shows a skeleton while the shelf loads', async () => {
        mockShelfValue.loading = true;
        const { container } = await renderShelf();
        expect(container.querySelector('.recipe-card-skeleton')).toBeTruthy();
    });

    it('shows the empty state with a route to the extractor', async () => {
        await renderShelf();
        expect(screen.getByText('Nothing on the shelf yet')).toBeTruthy();
        expect(screen.getByRole('link', { name: /extract a recipe/i }).getAttribute('href')).toBe('/add');
    });

    it('renders a card per shelved recipe', async () => {
        mockShelfValue.privateRecipes = [recipe('cookies', 'Cookies'), recipe('bread', 'Bread')];
        await renderShelf();

        expect(screen.getByText('Cookies')).toBeTruthy();
        expect(screen.getByText('Bread')).toBeTruthy();
        expect(screen.getByText('2 recipes · on this device only')).toBeTruthy();
    });

    it('links cards to the shelf route, not the public recipe route', async () => {
        // A shelf recipe is not in the public `recipes` collection, so a
        // /recipe/:id link would dead-end.
        mockShelfValue.privateRecipes = [recipe('cookies', 'Cookies')];
        await renderShelf();

        const card = screen.getByText('Cookies').closest('a');
        expect(card.getAttribute('href')).toBe('/shelf/cookies');
    });

    it('says the shelf is synced once the user is signed in', async () => {
        mockAuthValue = { currentUser: { uid: 'user-1' } };
        mockShelfValue.privateRecipes = [recipe('cookies', 'Cookies')];
        await renderShelf();

        expect(screen.getByText('1 recipe · synced to your account')).toBeTruthy();
    });

    describe('the at-risk warning', () => {
        it('is absent when the shelf is not at risk', async () => {
            mockShelfValue.privateRecipes = [recipe('cookies', 'Cookies')];
            await renderShelf();
            expect(screen.queryByRole('alert')).toBeNull();
        });

        it('warns plainly, and offers an account, when the shelf is device-only', async () => {
            mockShelfValue.privateRecipes = [recipe('cookies', 'Cookies')];
            mockShelfValue.isAtRisk = true;
            await renderShelf();

            const banner = screen.getByRole('alert');
            expect(banner.textContent).toContain('only exist on this device');
            expect(screen.getByRole('link', { name: /keep them/i }).getAttribute('href')).toBe('/signup');
        });
    });

    describe('removing a recipe', () => {
        it('unshelves without navigating away', async () => {
            mockShelfValue.privateRecipes = [recipe('cookies', 'Cookies')];
            await renderShelf();

            const removeButton = screen.getByRole('button', { name: /remove cookies from your shelf/i });
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            fireEvent(removeButton, clickEvent);

            expect(mockShelfValue.unshelveRecipe).toHaveBeenCalledWith('cookies');
            // The button sits inside the card's Link; a bubbled click would navigate.
            expect(clickEvent.defaultPrevented).toBe(true);
        });

        it('does not render the save button on an unpublished recipe', async () => {
            mockShelfValue.privateRecipes = [recipe('cookies', 'Cookies')];
            await renderShelf();
            expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
        });
    });

    describe('published references', () => {
        const publishedRef = { id: 'kale-salad', slug: 'kale-salad', status: 'published' };
        const publishedRecipe = recipe('kale-salad', 'Kale Salad');

        it('resolves a reference against the catalog rather than storing a copy', async () => {
            mockShelfValue.publishedRefs = [publishedRef];
            mockGetRecipeBySlug.mockResolvedValue(publishedRecipe);
            await renderShelf();

            expect(mockGetRecipeBySlug).toHaveBeenCalledWith('kale-salad');
            expect(screen.getByText('Kale Salad')).toBeTruthy();
        });

        it('links a published card to the public recipe, not the shelf route', async () => {
            mockShelfValue.publishedRefs = [publishedRef];
            mockGetRecipeBySlug.mockResolvedValue(publishedRecipe);
            await renderShelf();

            expect(screen.getByText('Kale Salad').closest('a').getAttribute('href')).toBe('/recipe/kale-salad');
        });

        it('offers no remove control on a published recipe, which cannot be pulled back', async () => {
            mockShelfValue.publishedRefs = [publishedRef];
            mockGetRecipeBySlug.mockResolvedValue(publishedRecipe);
            await renderShelf();

            expect(screen.queryByRole('button', { name: /remove kale salad/i })).toBeNull();
            expect(screen.getByText('Live')).toBeTruthy();
        });

        it('drops a reference the catalog no longer has, instead of a broken card', async () => {
            // An admin removal leaves the author holding a dangling slug.
            mockShelfValue.publishedRefs = [publishedRef];
            mockGetRecipeBySlug.mockResolvedValue(null);
            await renderShelf();

            expect(screen.getByText('Nothing on the shelf yet')).toBeTruthy();
        });

        it('does not count a published recipe as at risk when signed out', async () => {
            // isAtRisk is computed from drafts only; the context owns that, but the
            // banner must not appear for references alone.
            mockShelfValue.publishedRefs = [publishedRef];
            mockGetRecipeBySlug.mockResolvedValue(publishedRecipe);
            await renderShelf();

            expect(screen.queryByRole('alert')).toBeNull();
        });
    });

    describe('filters', () => {
        const publishedRef = { id: 'kale-salad', slug: 'kale-salad', status: 'published' };

        beforeEach(() => {
            mockShelfValue.privateRecipes = [recipe('bread', 'Bread')];
            mockShelfValue.publishedRefs = [publishedRef];
            mockGetRecipeBySlug.mockResolvedValue(recipe('kale-salad', 'Kale Salad'));
        });

        it('shows both kinds under All', async () => {
            await renderShelf();
            expect(screen.getByText('Bread')).toBeTruthy();
            expect(screen.getByText('Kale Salad')).toBeTruthy();
        });

        it('narrows to drafts under Private', async () => {
            await renderShelf();
            await act(async () => {
                fireEvent.click(screen.getByRole('tab', { name: /private/i }));
            });

            expect(screen.getByText('Bread')).toBeTruthy();
            expect(screen.queryByText('Kale Salad')).toBeNull();
        });

        it('narrows to the catalog copies under Published', async () => {
            await renderShelf();
            await act(async () => {
                fireEvent.click(screen.getByRole('tab', { name: /published/i }));
            });

            expect(screen.getByText('Kale Salad')).toBeTruthy();
            expect(screen.queryByText('Bread')).toBeNull();
        });

        it('hides the filters entirely when nothing has been published', async () => {
            mockShelfValue.publishedRefs = [];
            await renderShelf();
            expect(screen.queryByRole('tab')).toBeNull();
        });
    });
});
