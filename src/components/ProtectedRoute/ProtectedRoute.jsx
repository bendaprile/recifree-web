import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Wraps a route to require authentication and email verification.
 * - While auth state is loading, renders a minimal spinner.
 * - If unauthenticated, redirects to "/" (the LoginModal can be triggered from there).
 * - If authenticated but unverified, shows a verification required screen.
 * - If authenticated and verified, renders children.
 */
function ProtectedRoute({ children }) {
  const { currentUser, isEmailVerified, loadingAuth, sendVerificationEmail } = useAuth();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reloading, setReloading] = useState(false);

  if (loadingAuth) {
    return (
      <div className="section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span className="spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (currentUser && !isEmailVerified) {
    const handleResend = async () => {
      try {
        setResending(true);
        setError('');
        setMessage('');
        await sendVerificationEmail();
        setMessage('Verification email sent! Please check your inbox and spam folder.');
      } catch (err) {
        if (err.code === 'auth/too-many-requests') {
          setError('Too many requests. Please wait a few minutes before trying again.');
        } else {
          setError('Failed to resend verification email. Please try again later.');
        }
      } finally {
        setResending(false);
      }
    };

    const handleReloadStatus = async () => {
      setReloading(true);
      await currentUser.reload();
      // Reloading mutates the current user object in Firebase SDK.
      // We may need to force a re-render by full page refresh if React state doesn't pick it up instantly,
      // but reloading the user should trigger onAuthStateChanged in AuthContext if we're lucky.
      // For fallback:
      window.location.reload();
    };

    return (
      <div className="section animate-fade-in" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
        <div className="container text-center" style={{ maxWidth: '32rem' }}>
          <h1 className="mb-4" style={{ fontSize: '2.5rem' }}>Verify Your Email</h1>
          <p className="text-secondary mb-6" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            You're almost there! We need to verify your email address before you can access this feature. Check your inbox and spam folder.
          </p>
          
          {error && <div className="auth-error mb-4">{error}</div>}
          {message && <div className="auth-message mb-4" style={{ backgroundColor: 'rgba(74, 93, 78, 0.1)', color: 'var(--color-primary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{message}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '20rem', margin: '0 auto' }}>
            <button 
              onClick={handleReloadStatus} 
              disabled={reloading || resending}
              className="btn btn-primary full-width"
            >
              {reloading ? <span className="spinner"></span> : "I've verified my email"}
            </button>
            
            <button 
              onClick={handleResend} 
              disabled={resending || reloading}
              className="btn btn-secondary full-width"
            >
              {resending ? <span className="spinner"></span> : 'Resend Verification Email'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
