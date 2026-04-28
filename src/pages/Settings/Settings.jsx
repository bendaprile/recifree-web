import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../services/userService';
import { getFriendlyAuthErrorMessage } from '../../utils/auth-errors';
import './Settings.css';

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'nut-free', label: 'Nut-Free' }
];

function Settings() {
  const { currentUser, userProfile, setUserProfile, resetPassword } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [measurementPreference, setMeasurementPreference] = useState('imperial');
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [savingMsg, setSavingMsg] = useState('');
  const [error, setError] = useState('');

  // Initialize form with current profile data
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setMeasurementPreference(userProfile.measurementPreference || 'imperial');
      setDietaryRestrictions(userProfile.dietaryRestrictions || []);
    }
  }, [userProfile]);

  const handleDietaryToggle = (id) => {
    setDietaryRestrictions(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSavingMsg('');

      const updatedData = {
        displayName,
        measurementPreference,
        dietaryRestrictions
      };

      await updateUserProfile(currentUser.uid, updatedData);
      setUserProfile(prev => ({ ...prev, ...updatedData }));
      
      setSavingMsg('Profile updated successfully.');
      setTimeout(() => setSavingMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setLoading(true);
      setError('');
      setSavingMsg('');
      await resetPassword(currentUser.email);
      setSavingMsg('Password reset email sent! Check your inbox.');
    } catch (err) {
      setError(getFriendlyAuthErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page section animate-fade-in">
      <div className="container" style={{ maxWidth: '40rem' }}>
        <h1 className="mb-6">Account Settings</h1>

        {error && <div className="auth-error mb-4">{error}</div>}
        {savingMsg && <div className="auth-message mb-4" style={{ backgroundColor: 'rgba(74, 93, 78, 0.1)', color: 'var(--color-primary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{savingMsg}</div>}

        <div className="card mb-6">
          <h2 className="text-xl mb-4">Profile Details</h2>
          <form onSubmit={handleSaveProfile}>
            <div className="form-group mb-4">
              <label>Email Address</label>
              <input type="email" value={currentUser?.email || ''} disabled />
              <small className="text-secondary mt-1">Email cannot be changed.</small>
            </div>

            <div className="form-group mb-4">
              <label htmlFor="settings-name">Display Name</label>
              <input 
                id="settings-name"
                type="text" 
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
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
              <label>Dietary Restrictions</label>
              <div className="dietary-grid">
                {DIETARY_OPTIONS.map(diet => (
                  <label key={diet.id} className="diet-checkbox">
                    <input 
                      type="checkbox" 
                      checked={dietaryRestrictions.includes(diet.id)}
                      onChange={() => handleDietaryToggle(diet.id)}
                      disabled={loading}
                    />
                    <span>{diet.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <span className="spinner"></span> : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="card mb-6">
          <h2 className="text-xl mb-4">Security</h2>
          <p className="text-secondary mb-4">
            If you need to change your password, we can send a dedicated reset link to your registered email address.
          </p>
          <button 
            type="button" 
            onClick={handlePasswordReset} 
            disabled={loading} 
            className="btn btn-secondary"
          >
            Send Password Reset Email
          </button>
        </div>

      </div>
    </div>
  );
}

export default Settings;
