import { useState } from 'react';
import './ExtractionCard.css';

function ExtractionCard({ onExtract, isLoading, error }) {
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (!url) {
      setLocalError('Please enter a recipe URL.');
      return;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setLocalError('Invalid protocol. Only http:// and https:// URLs are supported.');
        return;
      }
    } catch {
      setLocalError('Please enter a valid URL (e.g. https://example.com/recipe).');
      return;
    }

    onExtract(url);
  };

  const displayError = localError || error;

  return (
    <div className="extraction-card animate-slide-up">
      <div className="extraction-card-header">
        <h2 className="extraction-title">Extract from URL</h2>
        <p className="extraction-subtitle">
          Paste a link to any online recipe. We'll bypass the life story, strip the ads, and extract only the ingredients and instructions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="extraction-form">
        <div className="form-group">
          <label htmlFor="recipe-url" className="sr-only">Recipe URL</label>
          <input
            id="recipe-url"
            type="url"
            className={`url-input ${displayError ? 'input-error' : ''}`}
            placeholder="e.g. https://www.bonappetit.com/recipe/best-lasagna"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
        </div>

        {displayError && (
          <div className="error-message-box" role="alert">
            <span className="error-icon">⚠</span>
            <p className="error-text">{displayError}</p>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary extraction-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Strip the Fluff'}
        </button>
      </form>
    </div>
  );
}

export default ExtractionCard;
