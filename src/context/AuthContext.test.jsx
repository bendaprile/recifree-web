import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ email: 'test@test.com' });
      return vi.fn();
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

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
    const mockUser = { email: 'test@test.com' };
    
    // Setup initial auth state
    onAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
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
});
