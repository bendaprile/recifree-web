import { useState, useRef, useEffect } from 'react';
import { publishRecipe } from '../../services/publishService';
import './PublishPanel.css';

/**
 * The publish gate for a recipe sitting on someone's private shelf.
 *
 * A photo of the finished dish is mandatory, and it must be the user's own.
 * That is what keeps Recifree clear of other people's food photography, and
 * it is the same act as the Tried & True promise: you cooked it, so you have
 * a picture of it.
 */
function PublishPanel({ recipe, onPublished }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (e) => {
    setError('');
    setFile(e.target.files?.[0] || null);
  };

  const handlePublish = async () => {
    setError('');
    setPublishing(true);
    try {
      const result = await publishRecipe(recipe, file);
      onPublished(result.slug);
    } catch (err) {
      setError(err.message || 'Publishing failed. Your shelf copy is untouched.');
      setPublishing(false);
    }
  };

  return (
    <section className="publish-panel" aria-labelledby="publish-heading">
      <div className="publish-panel-inner">
        <div className="publish-copy">
          <h2 id="publish-heading">Share this one?</h2>
          <p>
            It lives on your shelf right now, visible only to you. Add a photo of
            the version you actually cooked and it joins the public catalog.
          </p>
        </div>

        <div className="publish-controls">
          {previewUrl && (
            <img src={previewUrl} alt="Your photo of the finished dish" className="publish-preview" />
          )}

          <input
            ref={inputRef}
            id="publish-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="publish-file-input"
          />
          <label htmlFor="publish-photo" className="btn publish-choose-btn">
            {file ? 'Choose a different photo' : 'Add your photo'}
          </label>

          {file && <span className="publish-filename">{file.name}</span>}

          <button
            type="button"
            className="btn btn-primary publish-submit-btn"
            onClick={handlePublish}
            disabled={!file || publishing}
          >
            {publishing ? 'Publishing…' : 'Publish to Recifree'}
          </button>

          {!file && (
            <p className="publish-hint">
              A photo is required. We never use the original site's images.
            </p>
          )}

          {error && <p className="publish-error" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  );
}

export default PublishPanel;
