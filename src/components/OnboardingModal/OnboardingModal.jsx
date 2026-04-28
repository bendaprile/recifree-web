import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createUserProfile } from '../../services/userService';
import './OnboardingModal.css';

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'nut-free', label: 'Nut-Free' }
];

function OnboardingModal() {
  const { currentUser, userProfile, setUserProfile, loadingAuth } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [measurementPreference, setMeasurementPreference] = useState('imperial');
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // We only show this modal if the user is authenticated but has no profile document.
  const isOpen = !loadingAuth && currentUser && !userProfile;

  // Reset form when modal opens (e.g. for a new user signing up after a logout)
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser?.displayName || '');
      setMeasurementPreference('imperial');
      setDietaryRestrictions([]);
      setError('');
    }
  }, [isOpen, currentUser?.uid]);

  if (!isOpen) return null;

  const handleDietaryToggle = (id) => {
    setDietaryRestrictions(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleComplete = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      const newProfile = await createUserProfile(currentUser.uid, {
        displayName,
        measurementPreference,
        dietaryRestrictions,
        onboardingComplete: true
      });
      
      setUserProfile(newProfile);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      const newProfile = await createUserProfile(currentUser.uid, {
        displayName: currentUser.displayName || '',
        measurementPreference: 'imperial',
        dietaryRestrictions: [],
        onboardingComplete: false
      });
      setUserProfile(newProfile);
    } catch (err) {
      console.error("Failed to skip onboarding:", err);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="login-header text-center">
          <h2>Welcome to Recifree!</h2>
          <p className="text-secondary text-sm mt-2">Let's set up your kitchen preferences.</p>
        </div>

        {error && <div className="auth-error animate-fade-in">{error}</div>}

        <form className="login-form mt-4" onSubmit={handleComplete}>
          <div className="form-group mb-4">
            <label htmlFor="display-name">What should we call you?</label>
            <input 
              id="display-name"
              type="text" 
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="E.g. Chef John"
              disabled={loading}
            />
          </div>

          <div className="form-group mb-4">
            <label>Measurement Preference</label>
            <div className="measurement-toggle">
              <button 
                type="button" 
                className={`toggle-btn ${measurementPreference === 'imperial' ? 'active' : ''}`}
                onClick={() => setMeasurementPreference('imperial')}
                disabled={loading}
              >
                Imperial (Cups, oz)
              </button>
              <button 
                type="button" 
                className={`toggle-btn ${measurementPreference === 'metric' ? 'active' : ''}`}
                onClick={() => setMeasurementPreference('metric')}
                disabled={loading}
              >
                Metric (g, ml)
              </button>
            </div>
          </div>

          <div className="form-group mb-6">
            <label>Dietary Restrictions (Optional)</label>
            <div className="dietary-grid">
              {DIETARY_OPTIONS.map(diet => {
                const isSelected = dietaryRestrictions.includes(diet.id);
                return (
                  <label key={diet.id} className={`diet-checkbox ${isSelected ? 'selected' : ''}`}>
                    <input 
                      type="checkbox" 
                      className="hidden-checkbox"
                      checked={isSelected}
                      onChange={() => handleDietaryToggle(diet.id)}
                      disabled={loading}
                    />
                    <span>{diet.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <button disabled={loading} className="btn btn-primary full-width" type="submit">
              {loading ? <span className="spinner"></span> : 'Complete Setup'}
            </button>

            <button 
              type="button"
              disabled={loading} 
              className="btn btn-secondary full-width" 
              onClick={handleSkip}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OnboardingModal;
