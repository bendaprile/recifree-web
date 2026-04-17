import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SignupPage from './Signup';

const mockSignup = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockSendVerificationEmail = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        signup: mockSignup,
        loginWithGoogle: mockLoginWithGoogle,
        sendVerificationEmail: mockSendVerificationEmail
    })
}));

describe('SignupPage Component', () => {
    let originalEnv;

    beforeEach(() => {
        vi.clearAllMocks();
        // Backup original env
        originalEnv = import.meta.env.VITE_ENABLE_SIGNUPS;
    });

    afterEach(() => {
        // Restore
        import.meta.env.VITE_ENABLE_SIGNUPS = originalEnv;
    });

    const renderSignup = () => {
        return render(
            <BrowserRouter>
                <SignupPage />
            </BrowserRouter>
        );
    };

    it('renders closed beta lockscreen when feature flag is falsy', () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'false';
        renderSignup();
        
        expect(screen.getByText('Invite Only')).toBeInTheDocument();
        expect(screen.getByText('We are currently in closed beta and are not accepting new registrations at this time.')).toBeInTheDocument();
        expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    });

    it('renders signup form when feature flag is strictly true', () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'true';
        renderSignup();
        
        expect(screen.getByText('Join Recifree')).toBeInTheDocument();
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('shows field level error tracking naturally on blur', async () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'true';
        renderSignup();
        
        const emailInput = screen.getByLabelText('Email Address');
        const passwordInput = screen.getByLabelText('Password');
        const confirmInput = screen.getByLabelText('Confirm Password');
        
        // Email validation
        fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
        fireEvent.blur(emailInput);
        expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
        
        // Password validation (required)
        fireEvent.blur(passwordInput);
        expect(await screen.findByText('Password is required.')).toBeInTheDocument();
        
        // Password validation (too short)
        fireEvent.change(passwordInput, { target: { value: 'short' } });
        fireEvent.blur(passwordInput);
        expect(await screen.findByText('Password must be at least 8 characters long.')).toBeInTheDocument();

        // Password validation (missing complexity)
        fireEvent.change(passwordInput, { target: { value: 'passwordonly' } });
        fireEvent.blur(passwordInput);
        expect(await screen.findByText('Password must contain at least 1 letter and 1 number.')).toBeInTheDocument();
        
        // Confirm password (required)
        fireEvent.blur(confirmInput);
        expect(await screen.findByText('Please confirm your password.')).toBeInTheDocument();

        // Passwords do not match
        fireEvent.change(passwordInput, { target: { value: 'Password123' } });
        fireEvent.change(confirmInput, { target: { value: 'Password456' } });
        fireEvent.blur(confirmInput);
        expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    });

    it('toggles password visibility when eye icon clicked', () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'true';
        renderSignup();
        
        const passwordInput = screen.getByLabelText('Password');
        // There are two "Show password" buttons (Password and Confirm Password)
        const toggleBtns = screen.getAllByLabelText('Show password');
        
        expect(passwordInput.type).toBe('password');
        
        fireEvent.click(toggleBtns[0]);
        expect(passwordInput.type).toBe('text');
        
        fireEvent.click(screen.getByLabelText('Hide password'));
        expect(passwordInput.type).toBe('password');

        // Test confirm password toggle
        const confirmInput = screen.getByLabelText('Confirm Password');
        expect(confirmInput.type).toBe('password');
        fireEvent.click(toggleBtns[1]);
        expect(confirmInput.type).toBe('text');
    });

    it('stops submission and shows error if form is invalid', async () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'true';
        renderSignup();
        
        const submitBtn = screen.getByRole('button', { name: /^sign up$/i });
        fireEvent.click(submitBtn);
        
        expect(await screen.findByText('Please correctly fill out the highlighted fields above.')).toBeInTheDocument();
        expect(mockSignup).not.toHaveBeenCalled();
    });

    it('successfully signs up user and navigates home', async () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'true';
        mockSignup.mockResolvedValue({ user: { email: 'test@example.com' } });
        mockSendVerificationEmail.mockResolvedValue();
        
        renderSignup();
        
        fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/, { selector: '#signup-password' }), { target: { value: 'Password123' } });
        fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Password123' } });
        
        fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }));
        
        await vi.waitFor(() => expect(mockSignup).toHaveBeenCalledWith('test@example.com', 'Password123'));
        expect(mockSendVerificationEmail).toHaveBeenCalled();
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('displays error message when signup fails', async () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'true';
        mockSignup.mockRejectedValue({ code: 'auth/email-already-in-use' });
        
        renderSignup();
        
        fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'existing@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/, { selector: '#signup-password' }), { target: { value: 'Password123' } });
        fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Password123' } });
        
        fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }));
        
        expect(await screen.findByText(/An account already exists with this email address/i)).toBeInTheDocument();
    });

    it('handles Google signup success', async () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'true';
        mockLoginWithGoogle.mockResolvedValue();
        renderSignup();

        const googleBtn = screen.getByRole('button', { name: /sign up with google/i });
        fireEvent.click(googleBtn);

        await vi.waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalled());
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('handles Google signup failure', async () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'true';
        mockLoginWithGoogle.mockRejectedValue({ code: 'auth/network-request-failed' });
        renderSignup();

        const googleBtn = screen.getByRole('button', { name: /sign up with google/i });
        fireEvent.click(googleBtn);

        expect(await screen.findByText(/Network error/i)).toBeInTheDocument();
    });

    it('does not show an error when Google signup popup is cancelled by user', async () => {
        import.meta.env.VITE_ENABLE_SIGNUPS = 'true';
        mockLoginWithGoogle.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
        renderSignup();

        const googleBtn = screen.getByRole('button', { name: /sign up with google/i });
        fireEvent.click(googleBtn);

        await vi.waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalled());
        // No error message should be visible
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
});
