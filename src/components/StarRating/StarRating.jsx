import './StarRating.css';

const STARS = [1, 2, 3, 4, 5];

/**
 * Five stars, read-only by default.
 *
 * Passing onChange turns it into an input, rendered as a radio group rather
 * than clickable spans so it can be reached and set from the keyboard, and so
 * the browser handles the "one of five" semantics for a screen reader.
 */
function StarRating({ value = 0, onChange, name = 'rating', label = 'Your rating' }) {
  const readOnly = typeof onChange !== 'function';
  const rounded = Math.round(value);

  if (readOnly) {
    return (
      <span className="star-rating" role="img" aria-label={`${value} out of 5 stars`}>
        {STARS.map(star => (
          <span key={star} className={`star${star <= rounded ? ' star--filled' : ''}`} aria-hidden="true">★</span>
        ))}
      </span>
    );
  }

  return (
    <fieldset className="star-rating star-rating--input">
      <legend className="sr-only">{label}</legend>
      {STARS.map(star => (
        <label key={star} className={`star${star <= rounded ? ' star--filled' : ''}`}>
          <input
            type="radio"
            name={name}
            value={star}
            checked={rounded === star}
            onChange={() => onChange(star)}
          />
          <span aria-hidden="true">★</span>
          <span className="sr-only">{star} star{star === 1 ? '' : 's'}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default StarRating;
