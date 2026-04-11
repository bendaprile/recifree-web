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
        
        // Typing invalid email and clicking away
        fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
        fireEvent.blur(emailInput);
        
        expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
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
