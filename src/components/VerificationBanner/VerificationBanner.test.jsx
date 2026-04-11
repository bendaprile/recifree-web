import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VerificationBanner from './VerificationBanner';

const mockSendVerificationEmail = vi.fn();

const makeAuth = (overrides = {}) => ({
  currentUser: { emailVerified: false },
  isEmailVerified: false,
  sendVerificationEmail: mockSendVerificationEmail,
  ...overrides,
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

describe('VerificationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when user is logged in and email is unverified', () => {
    useAuth.mockReturnValue(makeAuth());
    render(<VerificationBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
  });

  it('does not render when there is no logged-in user', () => {
    useAuth.mockReturnValue(makeAuth({ currentUser: null }));
    const { container } = render(<VerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when email is already verified', () => {
    useAuth.mockReturnValue(makeAuth({ isEmailVerified: true }));
    const { container } = render(<VerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('dismisses the banner when the dismiss button is clicked', () => {
    useAuth.mockReturnValue(makeAuth());
    render(<VerificationBanner />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls sendVerificationEmail when Resend Email is clicked', async () => {
    mockSendVerificationEmail.mockResolvedValue();
    useAuth.mockReturnValue(makeAuth());
    render(<VerificationBanner />);

    fireEvent.click(screen.getByRole('button', { name: /resend/i }));
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText(/sent! check your inbox/i)).toBeInTheDocument();
    });
  });

  it('shows an error message if sendVerificationEmail throws', async () => {
    mockSendVerificationEmail.mockRejectedValue(new Error('network error'));
    useAuth.mockReturnValue(makeAuth());
    render(<VerificationBanner />);

    fireEvent.click(screen.getByRole('button', { name: /resend/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to send/i)).toBeInTheDocument();
    });
  });
});
