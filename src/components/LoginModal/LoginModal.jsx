import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFriendlyAuthErrorMessage } from '../../utils/auth-errors';
import { EyeIcon, EyeOffIcon } from '../Icons/Icons';
import './LoginModal.css';

function LoginModal({ isOpen, onClose }) {
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const modalRef = useRef(null);
  const signupsEnabled = import.meta.env.VITE_ENABLE_SIGNUPS === 'true';

  const emailErrorMsg = (() => {
    if (!touched.email) return '';
    if (!email) return 'Email is required.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Please enter a valid email address.';
  })();

  const passwordErrorMsg = (() => {
    if (!touched.password) return '';
    return password ? '' : 'Password is required.';
  })();

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };


  useEffect(() => {
    if (!isOpen) return;

    // Auto-focus the first input when modal opens
    const firstInput = modalRef.current?.querySelector('input');
    firstInput?.focus();

    // Close on Escape, trap focus within modal
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = modalRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Please correctly fill out the highlighted fields above.');
    }

    try {
      setError('');
      setMessage('');
      setLoading(true);
      await login(email, password);
      onClose();
    } catch (err) {
      setError(getFriendlyAuthErrorMessage(err.code || err.message, onClose));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setTouched(prev => ({ ...prev, email: true }));
      return setError('Please enter your email address to reset your password.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Please enter a valid email to reset your password.');
    }
    
    try {
      setError('');
      setMessage('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err) {
      setError(getFriendlyAuthErrorMessage(err.code || err.message, onClose));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setError('');
      setMessage('');
      setLoading(true);
      await loginWithGoogle();
      onClose();
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return; // silently dismiss
      setError(getFriendlyAuthErrorMessage(err.code || err.message, onClose));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card animate-slide-up" onClick={e => e.stopPropagation()} ref={modalRef}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        
        <div className="login-header text-center">
          <h2>Welcome Back</h2>
          <p className="text-secondary text-sm mt-2">Log in to view your saved recipes</p>
        </div>

        {error && <div className="auth-error animate-fade-in">{error}</div>}
        {message && <div className="auth-message animate-fade-in" style={{ backgroundColor: 'rgba(74, 93, 78, 0.1)', color: 'var(--color-primary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{message}</div>}

        <form className="login-form mt-6" onSubmit={handleSubmit}>
          <div className={`form-group ${emailErrorMsg ? 'has-error' : ''}`}>
            <label htmlFor="login-email">Email</label>
            <input 
              id="login-email"
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              autoComplete="email"
              disabled={loading}
            />
            {emailErrorMsg && <span className="field-error animate-fade-in">{emailErrorMsg}</span>}
          </div>
          
          <div className={`form-group mb-6 ${passwordErrorMsg ? 'has-error' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <label htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', padding: 0, textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                onClick={handleResetPassword}
                disabled={loading}
              >
                Forgot?
              </button>
            </div>
            <div className="password-input-wrapper">
              <input 
                id="login-password"
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                autoComplete="current-password"
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
          
          <button disabled={loading} className="btn btn-primary full-width" type="submit">
            {loading ? <span className="spinner"></span> : 'Log In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button 
          disabled={loading} 
          className="btn btn-secondary full-width google-btn" 
          onClick={handleGoogleLogin}
        >
          {loading ? <span className="spinner"></span> : 'Log in with Google'}
        </button>

        {signupsEnabled && (
          <div className="login-footer text-center mt-6">
            <p className="text-sm">
              Need an account?{' '}
              <Link to="/signup" className="text-primary font-medium" onClick={onClose}>
                Sign up
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginModal;
