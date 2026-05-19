import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      const result = await addRecipe(recipePayload);
      navigate(`/recipe/${result.slug}`);
    } catch (err) {
      alert(`Failed to save recipe: ${err.message}`);
    }
  };

  const handleCancel = () => {
    if (viewState === 'EDIT') {
      setViewState('INPUT');
      setExtractedData(null);
      setError('');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="add-recipe-page section">
      <div className="container add-recipe-container">
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
    </div>
  );
}

export default AddRecipe;
