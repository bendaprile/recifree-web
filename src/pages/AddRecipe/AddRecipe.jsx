import { useState, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import ExtractionCard from './components/ExtractionCard';
import ManualRecipeForm from './components/ManualRecipeForm';
import MascotLoader from '../../components/MascotLoader/MascotLoader';
import { extractRecipeFromUrl } from '../../services/extractionService';
import { addRecipe } from '../../services/recipeService';
import './AddRecipe.css';

function AddRecipe() {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState('INPUT'); // 'INPUT' | 'LOADING' | 'EDIT'
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Block in-app navigation when the user is editing and not mid-save
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      viewState === 'EDIT' && !isSaving && currentLocation.pathname !== nextLocation.pathname
  );

  // Block browser-level unloads (refresh, close tab, external URL) while editing
  useEffect(() => {
    if (viewState !== 'EDIT' || isSaving) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      // Modern browsers show a generic message; returnValue is required for Chrome
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [viewState, isSaving]);

  const getTitleFromUrl = (urlStr) => {
    try {
      const url = new URL(urlStr);
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const lastSegment = pathParts[pathParts.length - 1];
        return lastSegment
          .split(/[-_]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    } catch {
      // Ignore
    }
    return '';
  };

  const handleExtract = async (url) => {
    setViewState('LOADING');
    setError('');
    try {
      const data = await extractRecipeFromUrl(url);
      setExtractedData(data);
      setViewState('EDIT');
    } catch (err) {
      console.error('Extraction failed:', err);
      let errMsg = err.message || 'An unexpected error occurred during extraction.';
      if (err.status === 403) {
        errMsg = "Extraction is currently gated for beta testers, but you can enter your recipe manually below!";
      } else if (err.status === 401) {
        errMsg = "Your session has expired. Please log in again.";
      }
      
      setError(errMsg);
      setViewState('INPUT');

      // Pre-fill whatever URL/Title was entered into extractedData so if they choose to transition to manual, it is there!
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        setExtractedData({
          title: getTitleFromUrl(url),
          source: {
            name: domain,
            url: url
          }
        });
      } catch {
        setExtractedData(null);
      }
    }
  };

  const handleSave = async (recipePayload) => {
    try {
      setIsSaving(true);
      const result = await addRecipe(recipePayload);
      navigate(`/recipe/${result.slug}`);
    } catch (err) {
      setIsSaving(false);
      alert(`Failed to save recipe: ${err.message}`);
    }
  };

  const handleCancel = () => {
    if (viewState === 'EDIT') {
      const confirmed = window.confirm(
        'Are you sure you want to abandon this recipe? Any unsaved changes will be lost.'
      );
      if (!confirmed) return;
      setViewState('INPUT');
      setExtractedData(null);
      setError('');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="add-recipe-page section">
      <div className={`container add-recipe-container view-${viewState.toLowerCase()}`}>
        {viewState === 'INPUT' && (
          <div className="extraction-layout">
            <h1 className="page-title">Add a Recipe</h1>
            <p className="page-subtitle">
              Expand your digital cookbook by importing a recipe from the web or writing your own.
            </p>
            
            <ExtractionCard 
              onExtract={handleExtract} 
              isLoading={false} 
              error={error} 
            />

            {error && extractedData && (
              <div className="error-fallback-action animate-fade-in">
                <p className="fallback-text">
                  Don't lose your progress! We can pre-fill the form with the URL and estimated title so you can type it in manually.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary fallback-btn"
                  onClick={() => {
                    setError('');
                    setViewState('EDIT');
                  }}
                >
                  Pre-fill & Write Manually
                </button>
              </div>
            )}

            <div className="manual-divider">
              <span className="divider-line"></span>
              <span className="divider-text font-mono">OR</span>
              <span className="divider-line"></span>
            </div>

            <div className="manual-cta-box">
              <h3 className="cta-title">Write From Scratch</h3>
              <p className="cta-text">
                Have a family favorite or a recipe in your head? Create a beautiful, clutter-free card for it manually.
              </p>
              <button 
                type="button" 
                className="btn btn-secondary manual-btn"
                onClick={() => {
                  setError('');
                  setExtractedData(null);
                  setViewState('EDIT');
                }}
              >
                Write Recipe Manually
              </button>
            </div>
          </div>
        )}

        {viewState === 'LOADING' && (
          <div className="loading-layout animate-fade-in">
            <MascotLoader />
          </div>
        )}

        {viewState === 'EDIT' && (
          <div className="edit-layout">
            <div className="edit-header">
              <button onClick={handleCancel} className="back-link-btn font-mono">
                ← Back to options
              </button>
              <h1 className="page-title">
                {extractedData && extractedData.ingredients ? 'Review & Save' : 'New Custom Recipe'}
              </h1>
              <p className="page-subtitle">
                {extractedData && extractedData.ingredients 
                  ? "We've stripped the clutter! Review the ingredients and instructions below to perfect the card."
                  : "Type in your personal recipe below. Let's make it look beautiful."
                }
              </p>
            </div>

            <ManualRecipeForm 
              initialData={extractedData} 
              onSave={handleSave} 
              onCancel={handleCancel} 
            />
          </div>
        )}
      </div>

      {/* Navigation Blocker Confirmation Modal */}
      {blocker.state === 'blocked' && (
        <div className="modal-overlay" onClick={() => blocker.reset()} role="dialog" aria-modal="true">
          <div className="modal-content nav-block-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nav-block-icon">⚠️</div>
            <h2 className="nav-block-title">Unsaved Recipe</h2>
            <p className="nav-block-message">
              You're in the middle of editing a recipe. If you leave now, all your progress will be lost.
            </p>
            <div className="nav-block-actions">
              <button
                className="btn btn-primary"
                onClick={() => blocker.reset()}
              >
                Keep Editing
              </button>
              <button
                className="btn btn-outline nav-block-leave-btn"
                onClick={() => blocker.proceed()}
              >
                Leave Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddRecipe;
