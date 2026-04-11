import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './VerificationBanner.css';

/**
 * A dismissible sticky banner shown to logged-in users who have not yet
 * verified their email address. Provides a "Resend Email" action.
 */
function VerificationBanner() {
  const { currentUser, isEmailVerified, sendVerificationEmail } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'

  // Only show for authenticated, unverified users who haven't dismissed
  if (!currentUser || isEmailVerified || dismissed) return null;

  async function handleResend() {
    setResendStatus('sending');
    try {
      await sendVerificationEmail();
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  }

  return (
    <div className="verification-banner" role="alert" aria-live="polite">
      <div className="verification-banner__content">
        <span className="verification-banner__icon" aria-hidden="true">✉️</span>
        <p className="verification-banner__message">
          Check your inbox — please verify your email to unlock all features.
        </p>
        <div className="verification-banner__actions">
          {resendStatus === 'idle' && (
            <button
              className="verification-banner__resend"
              onClick={handleResend}
              aria-label="Resend verification email"
            >
              Resend Email
            </button>
          )}
          {resendStatus === 'sending' && (
            <span className="spinner verification-banner__spinner" aria-label="Sending…" />
          )}
          {resendStatus === 'sent' && (
            <span className="verification-banner__feedback verification-banner__feedback--success">
              Sent! Check your inbox.
            </span>
          )}
          {resendStatus === 'error' && (
            <span className="verification-banner__feedback verification-banner__feedback--error">
              Failed to send. Try again later.
            </span>
          )}
        </div>
      </div>
      <button
        className="verification-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss verification banner"
      >
        &times;
      </button>
    </div>
  );
}

export default VerificationBanner;
