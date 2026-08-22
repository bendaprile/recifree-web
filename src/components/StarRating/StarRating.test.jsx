import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StarRating from './StarRating';

describe('StarRating', () => {
  describe('read-only', () => {
    it('announces the rating rather than five separate stars', () => {
      render(<StarRating value={4} />);

      expect(screen.getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument();
    });

    it('fills one star per point', () => {
      const { container } = render(<StarRating value={3} />);

      expect(container.querySelectorAll('.star--filled')).toHaveLength(3);
      expect(container.querySelectorAll('.star')).toHaveLength(5);
    });

    it('rounds an average to the nearest whole star', () => {
      const { container } = render(<StarRating value={4.5} />);

      expect(container.querySelectorAll('.star--filled')).toHaveLength(5);
    });

    it('shows nothing filled for an unrated recipe', () => {
      const { container } = render(<StarRating value={0} />);

      expect(container.querySelectorAll('.star--filled')).toHaveLength(0);
    });

    it('offers no radio buttons, so it cannot be typed into by accident', () => {
      render(<StarRating value={4} />);

      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });
  });

  describe('input', () => {
    it('exposes five keyboard-reachable choices', () => {
      render(<StarRating value={0} onChange={vi.fn()} />);

      expect(screen.getAllByRole('radio')).toHaveLength(5);
      expect(screen.getByRole('radio', { name: '1 star' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '4 stars' })).toBeInTheDocument();
    });

    it('reports the star that was picked', () => {
      const onChange = vi.fn();
      render(<StarRating value={0} onChange={onChange} />);

      fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));

      expect(onChange).toHaveBeenCalledWith(4);
    });

    it('marks the current value as checked', () => {
      render(<StarRating value={2} onChange={vi.fn()} />);

      expect(screen.getByRole('radio', { name: '2 stars' })).toBeChecked();
      expect(screen.getByRole('radio', { name: '3 stars' })).not.toBeChecked();
    });
  });
});
