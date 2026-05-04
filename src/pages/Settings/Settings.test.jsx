import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from './Settings';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../services/userService';
import { getFriendlyAuthErrorMessage } from '../../utils/auth-errors';

// Mock dependencies
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../services/userService', () => ({
  updateUserProfile: vi.fn()
}));

vi.mock('../../utils/auth-errors', () => ({
  getFriendlyAuthErrorMessage: vi.fn(msg => msg)
}));

describe('Settings Page', () => {
  const mockSetUserProfile = vi.fn(val => {
    if (typeof val === 'function') val(mockUserProfile);
  });
  const mockResetPassword = vi.fn();
  const mockCurrentUser = { email: 'test@example.com', uid: '123' };
  const mockUserProfile = {
    displayName: 'Test User',
    measurementPreference: 'imperial',
    dietaryRestrictions: ['vegetarian']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      userProfile: mockUserProfile,
      setUserProfile: mockSetUserProfile,
      resetPassword: mockResetPassword
    });
  });

  const renderSettings = () => render(<Settings />);

  it('renders initial profile data correctly', () => {
    renderSettings();

    expect(screen.getByDisplayValue('test@example.com')).toBeDisabled();
    expect(screen.getByLabelText(/Display Name/i)).toHaveValue('Test User');
    
    // Check measurement preference (Imperial should be active)
    const imperialBtn = screen.getByText(/Imperial/i);
    expect(imperialBtn).toHaveClass('active');

    // Check dietary restrictions (Vegetarian should be checked)
    const vegCheckbox = screen.getByLabelText(/Vegetarian/i);
    expect(vegCheckbox).toBeChecked();
    
    const veganCheckbox = screen.getByLabelText(/Vegan/i);
    expect(veganCheckbox).not.toBeChecked();
  });

  it('handles display name change', () => {
    renderSettings();
    const nameInput = screen.getByLabelText(/Display Name/i);
    
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(nameInput).toHaveValue('New Name');
  });

  it('handles measurement preference change', () => {
    renderSettings();
    const metricBtn = screen.getByText(/Metric/i);
    const imperialBtn = screen.getByText(/Imperial/i);

    fireEvent.click(metricBtn);
    expect(metricBtn).toHaveClass('active');
    expect(imperialBtn).not.toHaveClass('active');

    fireEvent.click(imperialBtn);
    expect(imperialBtn).toHaveClass('active');
    expect(metricBtn).not.toHaveClass('active');
  });

  it('handles dietary restriction toggling', () => {
    renderSettings();
    const veganCheckbox = screen.getByLabelText(/Vegan/i);
    const vegCheckbox = screen.getByLabelText(/Vegetarian/i);

    // Toggle Vegan on
    fireEvent.click(veganCheckbox);
    expect(veganCheckbox).toBeChecked();

    // Toggle Vegetarian off
    fireEvent.click(vegCheckbox);
    expect(vegCheckbox).not.toBeChecked();
  });

  it('successfully saves profile changes', async () => {
    updateUserProfile.mockResolvedValueOnce();
    renderSettings();

    const nameInput = screen.getByLabelText(/Display Name/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    expect(updateUserProfile).toHaveBeenCalledWith('123', expect.objectContaining({
      displayName: 'Updated Name'
    }));

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
    });

    expect(mockSetUserProfile).toHaveBeenCalled();
  });

  it('handles error during profile save', async () => {
    updateUserProfile.mockRejectedValueOnce(new Error('Save failed'));
    renderSettings();

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Failed to update profile settings/i)).toBeInTheDocument();
    });
  });

  it('successfully sends password reset email', async () => {
    mockResetPassword.mockResolvedValueOnce();
    renderSettings();

    const resetBtn = screen.getByText(/Send Password Reset Email/i);
    fireEvent.click(resetBtn);

    expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');

    await waitFor(() => {
      expect(screen.getByText(/Password reset email sent/i)).toBeInTheDocument();
    });
  });

  it('handles error during password reset', async () => {
    mockResetPassword.mockRejectedValueOnce({ code: 'auth/too-many-requests' });
    getFriendlyAuthErrorMessage.mockReturnValueOnce('Too many requests. Try again later.');
    
    renderSettings();

    const resetBtn = screen.getByText(/Send Password Reset Email/i);
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText(/Too many requests/i)).toBeInTheDocument();
    });
  });

  it('handles null userProfile in useEffect', () => {
    useAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      userProfile: null,
      setUserProfile: mockSetUserProfile,
      resetPassword: mockResetPassword
    });

    renderSettings();
    // Should not crash and should keep default empty state
    expect(screen.getByLabelText(/Display Name/i)).toHaveValue('');
  });

  it('handles missing userProfile fields in useEffect', () => {
    useAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      userProfile: {}, // Missing all fields
      setUserProfile: mockSetUserProfile,
      resetPassword: mockResetPassword
    });

    renderSettings();
    expect(screen.getByLabelText(/Display Name/i)).toHaveValue('');
    expect(screen.getByText(/Imperial/i)).toHaveClass('active');
  });

  it('handles currentUser without email', () => {
    useAuth.mockReturnValue({
      currentUser: { uid: '123' }, // No email
      userProfile: mockUserProfile,
      setUserProfile: mockSetUserProfile,
      resetPassword: mockResetPassword
    });

    renderSettings();
    const emailInput = screen.getByDisplayValue('');
    expect(emailInput).toBeDisabled();
  });

  it('handles error message fallback in password reset', async () => {
    mockResetPassword.mockRejectedValueOnce({ message: 'Default Error' }); // No code
    getFriendlyAuthErrorMessage.mockImplementation((msg) => msg);
    
    renderSettings();

    const resetBtn = screen.getByText(/Send Password Reset Email/i);
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText(/Default Error/i)).toBeInTheDocument();
    });
  });

  it('clears success message after timeout', async () => {
    vi.useFakeTimers();
    updateUserProfile.mockResolvedValueOnce();
    renderSettings();

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    
    // Use act to handle the async state updates
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Now the message should be there
    expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();

    // Fast-forward time inside act
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(/Profile updated successfully/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
