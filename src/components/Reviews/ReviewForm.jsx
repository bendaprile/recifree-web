import { useState } from 'react';
import StarRating from '../StarRating/StarRating';
import { MAX_REVIEW_TEXT } from '../../services/reviewService';

/**
 * The write half of the reviews section. Split from Reviews.jsx because that
 * one is about loading and listing, and this one is about a form's state.
 */
function ReviewForm({ existing, onSubmit, onDelete, busy }) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [text, setText] = useState(existing?.text ?? '');
  const [error, setError] = useState('');

  const remaining = MAX_REVIEW_TEXT - text.length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({ rating, text });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3 className="review-form-title">{existing ? 'Your review' : 'Cooked this? Say so.'}</h3>

      <StarRating value={rating} onChange={setRating} label="Your rating" />

      <label className="sr-only" htmlFor="review-text">Your review</label>
      <textarea
        id="review-text"
        className="review-text-input"
        rows={4}
        value={text}
        maxLength={MAX_REVIEW_TEXT}
        placeholder="What did you change? What would you tell someone making it tonight?"
        onChange={(e) => setText(e.target.value)}
      />

      <div className="review-form-footer">
        <span className={`review-char-count${remaining < 50 ? ' review-char-count--low' : ''}`}>
          {remaining} characters left
        </span>

        <div className="review-form-actions">
          {existing && (
            <button type="button" className="btn btn-outline" onClick={onDelete} disabled={busy}>
              Delete
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy || rating === 0}>
            {existing ? 'Update review' : 'Post review'}
          </button>
        </div>
      </div>

      {error && <p className="review-form-error" role="alert">{error}</p>}
    </form>
  );
}

export default ReviewForm;
