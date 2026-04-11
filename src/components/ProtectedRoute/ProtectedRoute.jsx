import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Wraps a route to require authentication.
 * - While auth state is loading, renders a minimal spinner.
 * - If unauthenticated, redirects to "/" (the LoginModal can be triggered from there).
 * - If authenticated, renders children.
 */
function ProtectedRoute({ children }) {
  const { currentUser, loadingAuth } = useAuth();

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

  return children;
}

export default ProtectedRoute;
