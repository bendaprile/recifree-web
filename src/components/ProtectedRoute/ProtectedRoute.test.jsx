import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

const PrivatePage = () => <div>Private Content</div>;

const renderProtected = () =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <PrivatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  const mockSendVerificationEmail = vi.fn();
  const mockReload = vi.fn();
  
  // Mock window.location.reload
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // We need to delete and re-add location because it's non-configurable in some environments
    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  it('shows a loading spinner while auth is resolving', () => {
    useAuth.mockReturnValue({ currentUser: null, loadingAuth: true });
    renderProtected();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
  });

  it('redirects to "/" when the user is not authenticated', () => {
    useAuth.mockReturnValue({ currentUser: null, loadingAuth: false });
    renderProtected();
    expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders verification required screen when authenticated but email is not verified', () => {
    useAuth.mockReturnValue({ 
      currentUser: { uid: '123' }, 
      isEmailVerified: false, 
      loadingAuth: false 
    });
    renderProtected();
    expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
    expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
    expect(screen.getByText(/You're almost there! We need to verify your email address/i)).toBeInTheDocument();
  });

  it('renders children when the user is authenticated and verified', () => {
    useAuth.mockReturnValue({ 
      currentUser: { uid: '123' }, 
      isEmailVerified: true, 
      loadingAuth: false 
    });
    renderProtected();
    expect(screen.getByText('Private Content')).toBeInTheDocument();
  });

  describe('Email Verification Interactions', () => {
    it('successfully resends verification email', async () => {
      useAuth.mockReturnValue({ 
        currentUser: { uid: '123' }, 
        isEmailVerified: false, 
        loadingAuth: false,
        sendVerificationEmail: mockSendVerificationEmail.mockResolvedValueOnce()
      });
      
      renderProtected();
      
      const resendBtn = screen.getByText('Resend Verification Email');
      fireEvent.click(resendBtn);
      
      expect(mockSendVerificationEmail).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(screen.getByText(/Verification email sent!/i)).toBeInTheDocument();
      });
    });

    it('handles too-many-requests error when resending email', async () => {
      useAuth.mockReturnValue({ 
        currentUser: { uid: '123' }, 
        isEmailVerified: false, 
        loadingAuth: false,
        sendVerificationEmail: mockSendVerificationEmail.mockRejectedValueOnce({ 
          code: 'auth/too-many-requests' 
        })
      });
      
      renderProtected();
      
      const resendBtn = screen.getByText('Resend Verification Email');
      fireEvent.click(resendBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/Too many requests. Please wait a few minutes/i)).toBeInTheDocument();
      });
    });

    it('handles generic error when resending email', async () => {
      useAuth.mockReturnValue({ 
        currentUser: { uid: '123' }, 
        isEmailVerified: false, 
        loadingAuth: false,
        sendVerificationEmail: mockSendVerificationEmail.mockRejectedValueOnce(new Error('Generic error'))
      });
      
      renderProtected();
      
      const resendBtn = screen.getByText('Resend Verification Email');
      fireEvent.click(resendBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to resend verification email/i)).toBeInTheDocument();
      });
    });

    it('handles status reload and refreshes page', async () => {
      useAuth.mockReturnValue({ 
        currentUser: { uid: '123', reload: mockReload.mockResolvedValueOnce() }, 
        isEmailVerified: false, 
        loadingAuth: false 
      });
      
      renderProtected();
      
      const reloadBtn = screen.getByText("I've verified my email");
      fireEvent.click(reloadBtn);
      
      expect(mockReload).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(window.location.reload).toHaveBeenCalled();
      });
    });
  });
});

