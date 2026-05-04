import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  getAuth: vi.fn(() => ({ currentUser: null }))
}));

// Mock the userService
vi.mock('../services/userService', () => ({
  getUserProfile: vi.fn(() => Promise.resolve(null))
}));

// Mock the firebase config
vi.mock('../config/firebase', () => ({
  auth: { currentUser: null }
}));

// Test component to access context
const TestComponent = () => {
  const { 
    currentUser, 
    loadingAuth, 
    signup, 
    login, 
    loginWithGoogle, 
    logout, 
    resetPassword, 
    sendVerificationEmail,
    isEmailVerified
  } = useAuth();

  if (loadingAuth) return <div data-testid="loading">Loading...</div>;

  return (
    <div>
      <div data-testid="user">{currentUser ? currentUser.email : 'no user'}</div>
      <div data-testid="verified">{isEmailVerified ? 'verified' : 'not verified'}</div>
      <button onClick={() => signup('test@test.com', 'password')}>Signup</button>
      <button onClick={() => login('test@test.com', 'password')}>Login</button>
      <button onClick={() => loginWithGoogle()}>Google</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => resetPassword('test@test.com')}>Reset</button>
      <button onClick={() => sendVerificationEmail()}>Verify</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial loading state and then the user', async () => {
    let authCallback;
    onAuthStateChanged.mockImplementation((auth, callback) => {
      authCallback = callback;
      return vi.fn(); // unsubscribe
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toBeDefined();

    await act(async () => {
      authCallback({ email: 'test@test.com', emailVerified: true });
    });

    expect(screen.getByTestId('user').textContent).toBe('test@test.com');
    expect(screen.getByTestId('verified').textContent).toBe('verified');
  });

  it('handles signup', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn();
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    createUserWithEmailAndPassword.mockResolvedValue({ user: { email: 'new@test.com' } });

    await act(async () => {
      screen.getByText('Signup').click();
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'password');
  });

  it('handles login', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn();
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    signInWithEmailAndPassword.mockResolvedValue({ user: { email: 'login@test.com' } });

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'password');
  });

  it('handles google login', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn();
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    signInWithPopup.mockResolvedValue({ user: { email: 'google@test.com' } });

    await act(async () => {
      screen.getByText('Google').click();
    });

    expect(signInWithPopup).toHaveBeenCalled();
    expect(GoogleAuthProvider).toHaveBeenCalled();
  });

  it('handles logout', async () => {
    let authCallback;
    onAuthStateChanged.mockImplementation((auth, callback) => {
      authCallback = callback;
      return vi.fn();
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial auth state resolving
    await act(async () => {
      authCallback({ email: 'test@test.com', uid: 'user123' });
    });

    signOut.mockResolvedValue();

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(signOut).toHaveBeenCalled();
  });

  it('handles password reset', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn();
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    sendPasswordResetEmail.mockResolvedValue();

    await act(async () => {
      screen.getByText('Reset').click();
    });

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'test@test.com');
  });

  it('handles email verification when user is logged in', async () => {
    const mockUser = { email: 'test@test.com', uid: 'user123' };
    
    let authCallback;
    onAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return vi.fn();
    });

    // We need to mock auth.currentUser for sendVerificationEmail
    const { auth } = await import('../config/firebase');
    auth.currentUser = mockUser;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      authCallback(mockUser);
    });

    sendEmailVerification.mockResolvedValue();

    await act(async () => {
      screen.getByText('Verify').click();
    });

    expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
  });

  it('does not send verification email if no user is logged in', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
    });

    const { auth } = await import('../config/firebase');
    auth.currentUser = null;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Verify').click();
    });

    expect(sendEmailVerification).not.toHaveBeenCalled();
  });

  it('handles error when fetching user profile', async () => {
    const mockUser = { email: 'test@test.com', uid: 'user123' };
    let authCallback;
    onAuthStateChanged.mockImplementation((auth, callback) => {
      authCallback = callback;
      return vi.fn();
    });

    const { getUserProfile } = await import('../services/userService');
    getUserProfile.mockRejectedValue(new Error('Profile fetch failed'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      authCallback(mockUser);
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch user profile:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  describe('Auto-login logic', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'true');
      vi.stubEnv('VITE_ALLOW_AUTO_LOGIN', 'true');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('attempts auto-login in dev mode with emulator', async () => {
      // This is tricky because we can't easily change import.meta.env at runtime in Vitest if it's already loaded
      // But we can try to mock it.
      
      onAuthStateChanged.mockImplementation((auth, callback) => {
        // First call triggers auto-login if no user
        callback(null);
        return vi.fn();
      });

      signInWithEmailAndPassword.mockResolvedValue({ user: { email: 'dev@recifree.local' } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Since we are in AuthContext.jsx:
      // if (!user && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' && import.meta.env.MODE !== 'test' && !autoLoginAttempted)
      
      // We expect it to call signInWithEmailAndPassword
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'dev@recifree.local', 'password123');
    });

    it('attempts to create dev user if auto-login fails', async () => {
      onAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      signInWithEmailAndPassword.mockRejectedValue(new Error('User not found'));
      createUserWithEmailAndPassword.mockResolvedValue({ user: { email: 'dev@recifree.local' } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(signInWithEmailAndPassword).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'dev@recifree.local', 'password123');
      });
    });
    
    it('warns if auto-login and creation both fail', async () => {
      onAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      signInWithEmailAndPassword.mockRejectedValue(new Error('Fail 1'));
      createUserWithEmailAndPassword.mockRejectedValue(new Error('Fail 2'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Local Dev: Auto-login failed:", expect.any(Error));
      });
      consoleSpy.mockRestore();
    });
  });
});
