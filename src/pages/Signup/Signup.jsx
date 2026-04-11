import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFriendlyAuthErrorMessage } from '../../utils/auth-errors';
import { EyeIcon, EyeOffIcon } from '../../components/Icons/Icons';
import './Signup.css';

function SignupPage() {
  const { signup, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
  const navigate = useNavigate();
  const signupsEnabled = import.meta.env.VITE_ENABLE_SIGNUPS === 'true';

  const emailErrorMsg = (() => {
    if (!touched.email) return '';
    if (!email) return 'Email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? '' : 'Please enter a valid email address.';
  })();

  const passwordErrorMsg = (() => {
    if (!touched.password) return '';
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password must contain at least 1 letter and 1 number.';
    return '';
  })();

  const confirmPasswordErrorMsg = (() => {
    if (!touched.confirmPassword) return '';
    if (!confirmPassword) return 'Please confirm your password.';
    return password === confirmPassword ? '' : 'Passwords do not match.';
  })();

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    setTouched({ email: true, password: true, confirmPassword: true });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password) || password !== confirmPassword) {
      return setError('Please correctly fill out the highlighted fields above.');
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password);
      navigate('/');
    } catch (err) {
      setError(getFriendlyAuthErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(getFriendlyAuthErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  }

  if (!signupsEnabled) {
    return (
      <div className="signup-page section">
        <div className="container">
          <div className="signup-card card text-center">
            <div className="signup-header" style={{ marginBottom: 0 }}>
              <h1>Invite Only</h1>
              <p className="text-secondary mt-4">We are currently in closed beta and are not accepting new registrations at this time.</p>
            </div>
            <Link to="/" className="btn btn-primary full-width" style={{ marginTop: 'var(--space-6)' }}>
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page section">
      <div className="container">
        <div className="signup-card card">
          <div className="signup-header">
            <h1>Join Recifree</h1>
            <p className="text-secondary">Save recipes, create lists, and more.</p>
          </div>
          
          {error && <div className="auth-error animate-fade-in">{error}</div>}
          
          <form className="signup-form" onSubmit={handleSubmit}>
            <div className={`form-group ${emailErrorMsg ? 'has-error' : ''}`}>
              <label htmlFor="signup-email">Email Address</label>
              <input 
                id="signup-email"
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                autoComplete="email"
                disabled={loading}
              />
              {emailErrorMsg && <span className="field-error animate-fade-in">{emailErrorMsg}</span>}
            </div>
            
            <div className={`form-group ${passwordErrorMsg ? 'has-error' : ''}`}>
              <label htmlFor="signup-password">Password</label>
              <div className="password-input-wrapper">
                <input 
                  id="signup-password"
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
              {passwordErrorMsg && <span className="field-error animate-fade-in">{passwordErrorMsg}</span>}
            </div>

            <div className={`form-group ${confirmPasswordErrorMsg ? 'has-error' : ''}`}>
              <label htmlFor="signup-confirm">Confirm Password</label>
              <div className="password-input-wrapper">
                <input 
                  id="signup-confirm"
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
              {confirmPasswordErrorMsg && <span className="field-error animate-fade-in">{confirmPasswordErrorMsg}</span>}
            </div>
            
            <button disabled={loading} className="btn btn-primary full-width" type="submit">
              {loading ? <span className="spinner"></span> : 'Sign Up'}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button 
            disabled={loading} 
            className="btn btn-secondary full-width google-btn" 
            onClick={handleGoogleSignup}
          >
            {loading ? <span className="spinner"></span> : 'Sign up with Google'}
          </button>
          
          <div className="auth-footer text-center mt-6">
            <p className="text-sm">
              Already have an account? <Link to="/" className="text-primary font-medium">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
