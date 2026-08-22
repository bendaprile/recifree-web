import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import PublishPanel from './PublishPanel';
import * as publishService from '../../services/publishService';

vi.mock('../../services/publishService', () => ({
    publishRecipe: vi.fn()
}));

vi.mock('../../config/firebase', () => ({ auth: {}, db: {} }));

// jsdom has no object URL support.
global.URL.createObjectURL = vi.fn(() => 'blob:preview');
global.URL.revokeObjectURL = vi.fn();

const recipe = { id: 'kale-salad', title: 'Kale Salad', triedAndTrue: true };
let onPreviewChange;
const photo = () => new File(['bytes'], 'dinner.jpg', { type: 'image/jpeg' });

const choosePhoto = async (file = photo()) => {
    const input = document.getElementById('publish-photo');
    await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
    });
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
        render(<PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} />);

        const button = screen.getByRole('button', { name: /publish to recifree/i });
        expect(button.disabled).toBe(true);
        expect(screen.getByText(/add a photo of the one you cooked/i)).toBeTruthy();
    });

    it('enables publishing once a photo is chosen', async () => {
        render(<PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} />);
        await choosePhoto();

        expect(screen.getByRole('button', { name: /publish to recifree/i }).disabled).toBe(false);
        expect(screen.getByText('dinner.jpg')).toBeTruthy();
    });

    it('reports the chosen photo upward, so the page can show it as the hero', async () => {
        render(<PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} />);
        await choosePhoto();

        expect(onPreviewChange).toHaveBeenCalledWith('blob:preview');
    });

    it('clears the hero preview when the photo is removed', async () => {
        render(<PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} />);
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
            <PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} />
        );
        await choosePhoto();
        unmount();

        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    });

    it('publishes the recipe with the photo and reports the new slug', async () => {
        publishService.publishRecipe.mockResolvedValue({ slug: 'kale-salad', image: 'https://example/img.jpg' });
        render(<PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} />);
        await choosePhoto();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /publish to recifree/i }));
        });

        expect(publishService.publishRecipe).toHaveBeenCalledWith(recipe, expect.any(File));
        await waitFor(() => expect(onPublished).toHaveBeenCalledWith('kale-salad'));
    });

    it('surfaces a failure and leaves the user able to retry', async () => {
        publishService.publishRecipe.mockRejectedValue(new Error('We could not store your photo.'));
        render(<PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} />);
        await choosePhoto();

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
        render(<PublishPanel recipe={recipe} onPublished={onPublished} onPreviewChange={onPreviewChange} />);
        await choosePhoto();

        const button = screen.getByRole('button', { name: /publish to recifree/i });
        await act(async () => { fireEvent.click(button); });

        // Disabled while in flight, so a double click cannot publish twice.
        expect(button.disabled).toBe(true);
        await act(async () => { fireEvent.click(button); });
        expect(publishService.publishRecipe).toHaveBeenCalledTimes(1);

        await act(async () => { resolvePublish({ slug: 'kale-salad' }); });
    });
});
