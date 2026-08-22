import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublishPanel from './PublishPanel';
import * as publishService from '../../services/publishService';

vi.mock('../../services/publishService', () => ({
    publishRecipe: vi.fn()
}));

vi.mock('../../config/firebase', () => ({ auth: {}, db: {} }));

// jsdom has no object URL support.
global.URL.createObjectURL = vi.fn(() => 'blob:preview');
global.URL.revokeObjectURL = vi.fn();

const recipe = { id: 'kale-salad', title: 'Kale Salad' };
let onPreviewChange;
const photo = () => new File(['bytes'], 'dinner.jpg', { type: 'image/jpeg' });

const choosePhoto = async (file = photo()) => {
    const input = document.getElementById('publish-photo');
    await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
    });
};

const signOff = async () => {
    await act(async () => {
        fireEvent.click(screen.getByRole('checkbox'));
    });
};

// Most tests care about the publishable state, which needs both.
const readyToPublish = async () => {
    await choosePhoto();
    await signOff();
};

describe('PublishPanel', () => {
    let onPublished;

    beforeEach(() => {
        vi.clearAllMocks();
        onPublished = vi.fn();
        onPreviewChange = vi.fn();
    });

    afterEach(cleanup);

    it('will not publish until a photo is chosen', () => {
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);

        const button = screen.getByRole('button', { name: /publish to recifree/i });
        expect(button.disabled).toBe(true);
        expect(screen.getByText(/add a photo of the one you cooked/i)).toBeTruthy();
    });

    it('needs both a photo and the sign-off before publishing is possible', async () => {
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);
        const button = () => screen.getByRole('button', { name: /publish to recifree/i });

        await choosePhoto();
        expect(button().disabled).toBe(true);
        expect(screen.getByText('dinner.jpg')).toBeTruthy();

        await signOff();
        expect(button().disabled).toBe(false);
    });

    it('will not publish on the sign-off alone, with no photo', async () => {
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);
        await signOff();

        expect(screen.getByRole('button', { name: /publish to recifree/i }).disabled).toBe(true);
    });

    it('sends the sign-off with the recipe, since the draft no longer carries it', async () => {
        publishService.publishRecipe.mockResolvedValue({ slug: 'kale-salad' });
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);
        await readyToPublish();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /publish to recifree/i }));
        });

        expect(publishService.publishRecipe).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'kale-salad', triedAndTrue: true }),
            expect.any(File)
        );
    });

    it('reports the chosen photo upward, so the page can show it as the hero', async () => {
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);
        await choosePhoto();

        expect(onPreviewChange).toHaveBeenCalledWith('blob:preview');
    });

    it('clears the hero preview when the photo is removed', async () => {
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);
        await choosePhoto();
        onPreviewChange.mockClear();

        const input = document.getElementById('publish-photo');
        await act(async () => {
            fireEvent.change(input, { target: { files: [] } });
        });

        expect(onPreviewChange).toHaveBeenCalledWith('');
    });

    it('revokes the object URL it created, so previews do not leak', async () => {
        const { unmount } = render(
            <MemoryRouter>
                <PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} />
            </MemoryRouter>
        );
        await choosePhoto();
        unmount();

        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    });

    it('publishes the recipe with the photo and reports the new slug', async () => {
        publishService.publishRecipe.mockResolvedValue({ slug: 'kale-salad', image: 'https://example/img.jpg' });
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);
        await readyToPublish();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /publish to recifree/i }));
        });

        // The exact payload is asserted separately; here we only care that the
        // new slug is reported back to the page.
        expect(publishService.publishRecipe).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(onPublished).toHaveBeenCalledWith('kale-salad'));
    });

    it('surfaces a failure and leaves the user able to retry', async () => {
        publishService.publishRecipe.mockRejectedValue(new Error('We could not store your photo.'));
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);
        await readyToPublish();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /publish to recifree/i }));
        });

        expect(screen.getByRole('alert').textContent).toContain('could not store your photo');
        expect(onPublished).not.toHaveBeenCalled();
        // Still enabled, because the shelf copy is intact and a retry is valid.
        expect(screen.getByRole('button', { name: /publish to recifree/i }).disabled).toBe(false);
    });

    it('does not fire onPublished twice when the button is clicked repeatedly', async () => {
        let resolvePublish;
        publishService.publishRecipe.mockReturnValue(new Promise(r => { resolvePublish = r; }));
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);
        await readyToPublish();

        const button = screen.getByRole('button', { name: /publish to recifree/i });
        await act(async () => { fireEvent.click(button); });

        // Disabled while in flight, so a double click cannot publish twice.
        expect(button.disabled).toBe(true);
        await act(async () => { fireEvent.click(button); });
        expect(publishService.publishRecipe).toHaveBeenCalledTimes(1);

        await act(async () => { resolvePublish({ slug: 'kale-salad' }); });
    });

    it('offers a route to edit the draft before it is published', async () => {
        render(<MemoryRouter><PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} /></MemoryRouter>);

        expect(screen.getByRole('link', { name: /edit/i }).getAttribute('href')).toBe('/shelf/kale-salad/edit');
    });
});
