import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OnboardingModal from './OnboardingModal';
import { useAuth } from '../../context/AuthContext';
import { createUserProfile } from '../../services/userService';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock userService
vi.mock('../../services/userService', () => ({
  createUserProfile: vi.fn()
}));

describe('OnboardingModal Component', () => {
  const mockSetUserProfile = vi.fn();
  const mockCurrentUser = { uid: 'user123', displayName: 'Test User' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMockAuth = (overrides = {}) => {
    useAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      userProfile: null,
      setUserProfile: mockSetUserProfile,
      loadingAuth: false,
      ...overrides
    });
  };

  it('does not render when user is not authenticated', () => {
    setupMockAuth({ currentUser: null });
    const { container } = render(<OnboardingModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when profile already exists', () => {
    setupMockAuth({ userProfile: { onboardingComplete: true } });
    const { container } = render(<OnboardingModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when auth is loading', () => {
    setupMockAuth({ loadingAuth: true });
    const { container } = render(<OnboardingModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly when user is authenticated but has no profile', () => {
    setupMockAuth();
    render(<OnboardingModal />);
    expect(screen.getByText('Welcome to Recifree!')).toBeInTheDocument();
    expect(screen.getByLabelText('What should we call you?')).toBeInTheDocument();
    expect(screen.getByText('Imperial (Cups, oz)')).toBeInTheDocument();
    expect(screen.getByText('Metric (g, ml)')).toBeInTheDocument();
    expect(screen.getByText('Complete Setup')).toBeInTheDocument();
  });

  it('renders correctly when user has no display name', () => {
    setupMockAuth({ currentUser: { uid: 'user123' } }); // No displayName
    render(<OnboardingModal />);
    const nameInput = screen.getByLabelText('What should we call you?');
    expect(nameInput.value).toBe('');
  });

  it('handles display name input', () => {
    setupMockAuth();
    render(<OnboardingModal />);
    const nameInput = screen.getByLabelText('What should we call you?');
    fireEvent.change(nameInput, { target: { value: 'Chef Mario' } });
    expect(nameInput.value).toBe('Chef Mario');
  });

  it('toggles measurement preference', () => {
    setupMockAuth();
    render(<OnboardingModal />);
    const imperialBtn = screen.getByText('Imperial (Cups, oz)');
    const metricBtn = screen.getByText('Metric (g, ml)');

    expect(imperialBtn).toHaveClass('active');
    expect(metricBtn).not.toHaveClass('active');

    fireEvent.click(metricBtn);
    expect(imperialBtn).not.toHaveClass('active');
    expect(metricBtn).toHaveClass('active');

    fireEvent.click(imperialBtn);
    expect(imperialBtn).toHaveClass('active');
    expect(metricBtn).not.toHaveClass('active');
  });

  it('toggles dietary restrictions', () => {
    setupMockAuth();
    render(<OnboardingModal />);
    const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
    const veganCheckbox = screen.getByLabelText('Vegan');

    expect(vegetarianCheckbox).not.toBeChecked();
    
    fireEvent.click(vegetarianCheckbox);
    expect(vegetarianCheckbox).toBeChecked();
    expect(vegetarianCheckbox.closest('label')).toHaveClass('selected');

    fireEvent.click(veganCheckbox);
    expect(veganCheckbox).toBeChecked();

    fireEvent.click(vegetarianCheckbox);
    expect(vegetarianCheckbox).not.toBeChecked();
    expect(vegetarianCheckbox.closest('label')).not.toHaveClass('selected');
  });

  it('handles successful setup submission', async () => {
    setupMockAuth();
    const mockProfile = { uid: 'user123', displayName: 'Chef Mario', onboardingComplete: true };
    createUserProfile.mockResolvedValueOnce(mockProfile);

    render(<OnboardingModal />);
    
    fireEvent.change(screen.getByLabelText('What should we call you?'), { target: { value: 'Chef Mario' } });
    fireEvent.click(screen.getByText('Metric (g, ml)'));
    fireEvent.click(screen.getByLabelText('Gluten-Free'));
    
    fireEvent.click(screen.getByRole('button', { name: 'Complete Setup' }));

    await waitFor(() => {
      expect(createUserProfile).toHaveBeenCalledWith('user123', {
        displayName: 'Chef Mario',
        measurementPreference: 'metric',
        dietaryRestrictions: ['gluten-free'],
        onboardingComplete: true
      });
    });

    expect(mockSetUserProfile).toHaveBeenCalledWith(mockProfile);
  });

  it('handles setup submission failure', async () => {
    setupMockAuth();
    createUserProfile.mockRejectedValueOnce(new Error('API Error'));

    render(<OnboardingModal />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Complete Setup' }));

    expect(await screen.findByText('Failed to save profile. Please try again.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument(); // Spinner should be gone
  });

  it('handles skip functionality', async () => {
    setupMockAuth();
    const mockProfile = { uid: 'user123', onboardingComplete: false };
    createUserProfile.mockResolvedValueOnce(mockProfile);

    render(<OnboardingModal />);
    
    fireEvent.click(screen.getByText('Skip for now'));

    await waitFor(() => {
      expect(createUserProfile).toHaveBeenCalledWith('user123', {
        displayName: 'Test User',
        measurementPreference: 'imperial',
        dietaryRestrictions: [],
        onboardingComplete: false
      });
    });

    expect(mockSetUserProfile).toHaveBeenCalledWith(mockProfile);
  });

  it('handles skip functionality failure', async () => {
    setupMockAuth();
    createUserProfile.mockRejectedValueOnce(new Error('Skip failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<OnboardingModal />);
    
    fireEvent.click(screen.getByText('Skip for now'));

    await waitFor(() => {
      expect(createUserProfile).toHaveBeenCalled();
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to skip onboarding:", expect.any(Error));
    // Verify it stopped loading
    expect(screen.getByText('Skip for now')).not.toBeDisabled();
    
    consoleSpy.mockRestore();
  });

  it('resets form when modal re-opens', async () => {
    const { rerender } = render(<OnboardingModal />);
    
    // Initially closed (mock setup returned no current user or something)
    setupMockAuth({ currentUser: null });
    rerender(<OnboardingModal />);
    expect(screen.queryByText('Welcome to Recifree!')).not.toBeInTheDocument();

    // Now open it
    setupMockAuth({ currentUser: mockCurrentUser });
    rerender(<OnboardingModal />);
    expect(screen.getByText('Welcome to Recifree!')).toBeInTheDocument();

    const nameInput = screen.getByLabelText('What should we call you?');
    fireEvent.change(nameInput, { target: { value: 'Temporary Name' } });
    expect(nameInput.value).toBe('Temporary Name');

    // Close it
    setupMockAuth({ currentUser: null });
    rerender(<OnboardingModal />);
    expect(screen.queryByText('Welcome to Recifree!')).not.toBeInTheDocument();

    // Re-open it
    setupMockAuth({ currentUser: mockCurrentUser });
    rerender(<OnboardingModal />);
    expect(screen.getByLabelText('What should we call you?').value).toBe('Test User');
  });

  it('shows loading state during submission', async () => {
    setupMockAuth();
    let resolveProfile;
    const promise = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    createUserProfile.mockReturnValueOnce(promise);

    render(<OnboardingModal />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Complete Setup' }));

    // When loading, the button text "Complete Setup" is replaced by a spinner
    const submitBtn = screen.getByRole('button', { name: '' });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn.querySelector('.spinner')).toBeInTheDocument();
    expect(screen.getByText('Skip for now')).toBeDisabled();
    
    await act(async () => {
      resolveProfile({ uid: 'user123' });
    });
  });
});
