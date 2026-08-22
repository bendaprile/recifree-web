import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { within } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reviews from './Reviews';

vi.mock('../../services/reviewService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getReviews: vi.fn(),
    saveReview: vi.fn(),
    deleteReview: vi.fn()
  };
});

let mockAuth = { currentUser: null, isEmailVerified: false };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth
}));

import { getReviews, saveReview, deleteReview } from '../../services/reviewService';

const renderReviews = async (slug = 'kale-salad') => {
  let result;
  await act(async () => {
    result = render(<MemoryRouter><Reviews slug={slug} /></MemoryRouter>);
  });
  return result;
};

const signedInVerified = { currentUser: { uid: 'uid-1' }, isEmailVerified: true };

describe('Reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = { currentUser: null, isEmailVerified: false };
    getReviews.mockResolvedValue([]);
  });

  describe('display', () => {
    it('shows the average and the count', async () => {
      getReviews.mockResolvedValue([
        { uid: 'a', rating: 5, text: 'Great.', authorName: 'Ben D' },
        { uid: 'b', rating: 4, text: 'Solid.', authorName: 'Ada L' }
      ]);

      await renderReviews();

      expect(screen.getByText('4.5')).toBeInTheDocument();
      expect(screen.getByText('2 reviews')).toBeInTheDocument();
    });

    it('says so when nobody has reviewed the recipe', async () => {
      await renderReviews();

      expect(screen.getByText(/Nobody has reviewed this one yet/)).toBeInTheDocument();
    });

    it('credits a reviewer with no name as a Recifree cook rather than blank', async () => {
      getReviews.mockResolvedValue([{ uid: 'a', rating: 4, text: 'Good.', authorName: null }]);

      await renderReviews();

      expect(screen.getByText('A Recifree cook')).toBeInTheDocument();
    });

    it('renders a stars-only review, which carries no text', async () => {
      getReviews.mockResolvedValue([{ uid: 'a', rating: 3, text: '', authorName: 'Ben D' }]);

      const { container } = await renderReviews();
      const list = container.querySelector('.reviews-list');

      expect(screen.getByText('1 review')).toBeInTheDocument();
      expect(within(list).getByRole('img', { name: '3 out of 5 stars' })).toBeInTheDocument();
      expect(within(list).getByText('Ben D')).toBeInTheDocument();
    });
  });

  describe('who may review', () => {
    it('asks a signed-out reader to create an account, and shows no form', async () => {
      await renderReviews();

      expect(screen.getByRole('link', { name: /Create an account/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Post review/ })).not.toBeInTheDocument();
    });

    it('asks an unverified account to verify, and shows no form', async () => {
      mockAuth = { currentUser: { uid: 'uid-1' }, isEmailVerified: false };

      await renderReviews();

      expect(screen.getByText(/Verify your email address/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Post review/ })).not.toBeInTheDocument();
    });

    it('gives a verified account the form', async () => {
      mockAuth = signedInVerified;

      await renderReviews();

      expect(screen.getByRole('button', { name: /Post review/ })).toBeInTheDocument();
    });
  });

  describe('writing a review', () => {
    beforeEach(() => { mockAuth = signedInVerified; });

    it('will not post without a rating, because stars are the review', async () => {
      await renderReviews();

      expect(screen.getByRole('button', { name: /Post review/ })).toBeDisabled();
    });

    it('posts the rating and text, then reloads the list', async () => {
      await renderReviews();

      fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
      fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'Made it twice.' } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Post review/ }));
      });

      expect(saveReview).toHaveBeenCalledWith('kale-salad', { rating: 5, text: 'Made it twice.' });
      expect(getReviews).toHaveBeenCalledTimes(2);
    });

    it('shows the failure instead of swallowing it', async () => {
      saveReview.mockRejectedValue(new Error('Verify your email address before reviewing a recipe.'));

      await renderReviews();
      fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Post review/ }));
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(/Verify your email/);
    });

    it('loads the existing review into the form rather than offering a second one', async () => {
      getReviews.mockResolvedValue([{ uid: 'uid-1', rating: 3, text: 'It was fine.', authorName: 'Ben D' }]);

      const { container } = await renderReviews();
      const list = container.querySelector('.reviews-list');

      expect(screen.getByDisplayValue('It was fine.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update review/ })).toBeInTheDocument();
      // Their own review belongs in the form, not repeated in the list below.
      expect(within(list).queryByText('It was fine.')).not.toBeInTheDocument();
    });

    it('deletes a review only after the user confirms', async () => {
      getReviews.mockResolvedValue([{ uid: 'uid-1', rating: 3, text: 'It was fine.', authorName: 'Ben D' }]);
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

      await renderReviews();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      });

      expect(deleteReview).not.toHaveBeenCalled();

      confirm.mockReturnValue(true);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      });

      await waitFor(() => expect(deleteReview).toHaveBeenCalledWith('kale-salad'));
      confirm.mockRestore();
    });
  });
});
