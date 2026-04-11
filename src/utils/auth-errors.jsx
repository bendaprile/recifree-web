import { Link } from 'react-router-dom';

export function getFriendlyAuthErrorMessage(errorCode, onAction = () => {}) {
  // If it's a standard error object with a message instead of a code
  if (!errorCode.startsWith('auth/')) {
    return 'An unexpected error occurred. Please try again.';
  }

  switch (errorCode) {
    case 'auth/invalid-email':
      return 'The email address is invalid. Please double check.';
    case 'auth/user-not-found':
      return (
        <span>
          No account found with this email. Would you like to <Link to="/signup" onClick={onAction} style={{textDecoration: 'underline'}}>sign up</Link>?
        </span>
      );
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return (
        <span>
          An account already exists with this email address. Try to <Link to="/" onClick={onAction} style={{textDecoration: 'underline'}}>log in</Link>.
        </span>
      );
    case 'auth/weak-password':
      return 'Password is too weak. It must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    default:
      return 'An unexpected authentication error occurred.';
  }
}
