import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ShelfEdit from './ShelfEdit';

vi.mock('../../config/firebase', () => ({ db: {}, auth: {} }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, useNavigate: () => mockNavigate };
});

let mockShelfValue;
vi.mock('../../context/ShelfContext', () => ({
    useShelf: () => mockShelfValue
}));

const draft = {
    id: 'kale-salad',
    title: 'Kale Salad',
    description: 'Parsed a bit wrong',
    ingredients: [{ amount: '6', unit: 'cup', item: 'kale' }],
    instructions: ['Toss it.']
};

const renderEdit = async (id = 'kale-salad') => {
    await act(async () => {
        render(
            <MemoryRouter initialEntries={[`/shelf/${id}/edit`]}>
                <Routes>
                    <Route path="/shelf/:id/edit" element={<ShelfEdit />} />
                </Routes>
            </MemoryRouter>
        );
    });
};

describe('ShelfEdit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockShelfValue = { shelf: [draft], loading: false, shelveRecipe: vi.fn() };
    });

    afterEach(cleanup);

    it('prefills the form from the draft on the shelf', async () => {
        await renderEdit();
        expect(screen.getByLabelText(/Recipe Title/).value).toBe('Kale Salad');
    });

    it('saves back over the same shelf entry rather than creating a second one', async () => {
        await renderEdit();

        const title = screen.getByLabelText(/Recipe Title/);
        await act(async () => {
            fireEvent.change(title, { target: { value: 'Kale Salad, Fixed' } });
            document.querySelector('form.manual-recipe-form').requestSubmit();
        });

        expect(mockShelfValue.shelveRecipe).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'kale-salad', title: 'Kale Salad, Fixed' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/shelf/kale-salad');
    });

    it('does not require the Tried & True sign-off to save a draft', async () => {
        // The claim is made at publish time now, so editing must not demand it.
        await renderEdit();
        expect(screen.queryByRole('checkbox')).toBeNull();

        await act(async () => {
            document.querySelector('form.manual-recipe-form').requestSubmit();
        });
        expect(mockShelfValue.shelveRecipe).toHaveBeenCalled();
    });

    it('refuses to edit a published recipe, whose catalog copy is canonical', async () => {
        mockShelfValue.shelf = [{ id: 'kale-salad', slug: 'kale-salad', status: 'published' }];
        await renderEdit();

        expect(screen.getByText('Nothing to edit')).toBeTruthy();
        expect(screen.getByText(/already published/i)).toBeTruthy();
        expect(document.querySelector('form.manual-recipe-form')).toBeNull();
    });

    it('handles a recipe that is not on the shelf', async () => {
        await renderEdit('not-here');
        expect(screen.getByText(/not on your shelf/i)).toBeTruthy();
    });

    it('waits for the shelf to load before deciding the recipe is missing', async () => {
        mockShelfValue = { shelf: [], loading: true, shelveRecipe: vi.fn() };
        await renderEdit();
        expect(screen.queryByText('Nothing to edit')).toBeNull();
    });
});
