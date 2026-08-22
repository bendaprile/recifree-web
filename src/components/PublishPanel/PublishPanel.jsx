import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publishRecipe } from '../../services/publishService';
import './PublishPanel.css';

/**
 * The publish gate for a recipe sitting on someone's private shelf.
 *
 * Sits above the recipe header, so the photo the user picks becomes the hero
 * image immediately: they see the published article before they commit to it.
 * The preview itself is rendered by the page, not here — this bar only owns
 * the controls.
 *
 * A photo is mandatory, and it must be the user's own. That is what keeps
 * Recifree clear of other people's food photography, and it is the same act
 * as the Tried & True promise: you cooked it, so you have a picture of it.
 */
function PublishPanel({ recipe, onPublished, onPreviewChange }) {
  const [file, setFile] = useState(null);
  const [cooked, setCooked] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      onPreviewChange('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    onPreviewChange(url);
    return () => URL.revokeObjectURL(url);
  }, [file, onPreviewChange]);

  const handleFileChange = (e) => {
    setError('');
    setFile(e.target.files?.[0] || null);
  };

  const handlePublish = async () => {
    setError('');
    setPublishing(true);
    try {
      // The sign-off is made here, not when the draft was saved. Saving to the
      // shelf is collecting; publishing is vouching.
      const result = await publishRecipe({ ...recipe, triedAndTrue: true }, file);
      onPublished(result.slug);
    } catch (err) {
      setError(err.message || 'Publishing failed. Your shelf copy is untouched.');
      setPublishing(false);
    }
  };

  return (
    <section className="publish-bar" aria-labelledby="publish-heading">
      <div className="publish-bar-inner">
        <div className="publish-bar-copy">
          <h2 id="publish-heading">Share this one?</h2>
          <p>
            {file
              ? 'That is how it will look. Publish when you are happy with it.'
              : 'On your shelf, visible only to you. Add a photo of the one you cooked to publish it.'}
          </p>
        </div>

        <div className="publish-bar-actions">
          <input
            id="publish-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="publish-file-input"
          />
          <Link to={`/shelf/${recipe.id}/edit`} className="publish-choose-btn">
            Edit
          </Link>

          <label htmlFor="publish-photo" className="publish-choose-btn">
            {file ? 'Change photo' : 'Add your photo'}
          </label>

          <button
            type="button"
            className="publish-submit-btn"
            onClick={handlePublish}
            disabled={!file || !cooked || publishing}
          >
            {publishing ? 'Publishing…' : 'Publish to Recifree'}
          </button>
        </div>
      </div>

      <div className="publish-bar-status">
        <label className="publish-signoff">
          <input
            type="checkbox"
            checked={cooked}
            onChange={(e) => { setError(''); setCooked(e.target.checked); }}
          />
          <span>I have actually cooked this, and it is delicious.</span>
        </label>
        {file && !error && <span className="publish-filename">{file.name}</span>}
        {error && <span className="publish-error" role="alert">{error}</span>}
      </div>
    </section>
  );
}

export default PublishPanel;
