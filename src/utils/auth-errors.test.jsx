import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { getFriendlyAuthErrorMessage } from './auth-errors';

describe('auth-errors utility', () => {
  const renderInRouter = (element) => {
    return render(<BrowserRouter>{element}</BrowserRouter>);
  };

  it('returns generic error for non-auth codes', () => {
    const msg = getFriendlyAuthErrorMessage('other/error');
    expect(msg).toBe('An unexpected error occurred. Please try again.');
  });

  it('returns specific message for invalid-email', () => {
    const msg = getFriendlyAuthErrorMessage('auth/invalid-email');
    expect(msg).toBe('The email address is invalid. Please double check.');
  });

  it('returns link for user-not-found', () => {
    renderInRouter(getFriendlyAuthErrorMessage('auth/user-not-found'));
    expect(screen.getByText(/No account found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });

  it('returns generic message for wrong-password or invalid-credential', () => {
    expect(getFriendlyAuthErrorMessage('auth/wrong-password')).toBe('Incorrect email or password. Please try again.');
    expect(getFriendlyAuthErrorMessage('auth/invalid-credential')).toBe('Incorrect email or password. Please try again.');
  });

  it('returns link for email-already-in-use', () => {
    renderInRouter(getFriendlyAuthErrorMessage('auth/email-already-in-use'));
    expect(screen.getByText(/account already exists/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  });

  it('returns message for weak-password', () => {
    expect(getFriendlyAuthErrorMessage('auth/weak-password')).toBe('Password is too weak. It must be at least 6 characters.');
  });

  it('returns message for too-many-requests', () => {
    expect(getFriendlyAuthErrorMessage('auth/too-many-requests')).toBe('Too many failed login attempts. Please try again later.');
  });

  it('returns message for network-request-failed', () => {
    expect(getFriendlyAuthErrorMessage('auth/network-request-failed')).toBe('Network error. Please check your internet connection.');
  });

  it('returns message for popup-closed-by-user', () => {
    expect(getFriendlyAuthErrorMessage('auth/popup-closed-by-user')).toBe('Sign-in popup was closed before completing.');
  });

  it('returns default message for unknown auth codes', () => {
    expect(getFriendlyAuthErrorMessage('auth/some-weird-error')).toBe('An unexpected authentication error occurred.');
  });

  it('executes default onAction when no handler provided', () => {
    renderInRouter(getFriendlyAuthErrorMessage('auth/user-not-found'));
    // Clicking shouldn't throw error
    screen.getByRole('link', { name: /sign up/i }).click();
  });
});
