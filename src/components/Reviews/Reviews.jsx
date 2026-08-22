import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import StarRating from '../StarRating/StarRating';
import ReviewForm from './ReviewForm';
import { useAuth } from '../../context/AuthContext';
import { getReviews, saveReview, deleteReview, summarizeReviews } from '../../services/reviewService';
import './Reviews.css';

/**
 * Ratings and reviews for one recipe.
 *
 * Display only, deliberately. A review changes nothing about what any reader is
 * shown — recipes are not ranked or ordered by it, and no badge follows from
 * it — so a sockpuppet account buys nothing and reviews can ship before a
 * moderation system does. See ROADMAP.md Phase 4a before adding ranking.
 */
function Reviews({ slug }) {
  const { currentUser, isEmailVerified } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setReviews(await getReviews(slug));
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const { count, average } = summarizeReviews(reviews);
  const mine = currentUser ? reviews.find(r => r.uid === currentUser.uid) : null;
  const others = currentUser ? reviews.filter(r => r.uid !== currentUser.uid) : reviews;

  const handleSubmit = async (review) => {
    setBusy(true);
    try {
      await saveReview(slug, review);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove your review of this recipe?')) return;
    setBusy(true);
    try {
      await deleteReview(slug);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="reviews-section" aria-labelledby="reviews-heading">
      <div className="reviews-header">
        <h2 id="reviews-heading" className="reviews-title">Reviews</h2>

        {count > 0 && (
          <div className="reviews-summary">
            <StarRating value={average} />
            <span className="reviews-average">{average}</span>
            <span className="reviews-count">{count} review{count === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>

      {!currentUser && (
        <p className="reviews-gate">
          <Link to="/signup">Create an account</Link> to review this recipe.
        </p>
      )}

      {currentUser && !isEmailVerified && (
        <p className="reviews-gate">
          Verify your email address to review this recipe.
        </p>
      )}

      {currentUser && isEmailVerified && (
        <ReviewForm
          key={mine ? `mine-${mine.updatedAt}` : 'new'}
          existing={mine}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          busy={busy}
        />
      )}

      {loading && <p className="reviews-empty">Loading reviews…</p>}

      {!loading && count === 0 && (
        <p className="reviews-empty">Nobody has reviewed this one yet.</p>
      )}

      <ul className="reviews-list">
        {others.map(review => (
          <li key={review.uid} className="review">
            <div className="review-meta">
              <StarRating value={review.rating} />
              <span className="review-author">{review.authorName || 'A Recifree cook'}</span>
            </div>
            {review.text && <p className="review-body">{review.text}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Reviews;
