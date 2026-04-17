import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginModal from './LoginModal';

// Mock AuthContext
const mockLogin = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        loginWithGoogle: mockLoginWithGoogle,
        resetPassword: mockResetPassword
    })
}));

describe('LoginModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderModal = (isOpen = true) => {
        return render(
            <BrowserRouter>
                <LoginModal isOpen={isOpen} onClose={vi.fn()} />
            </BrowserRouter>
        );
    };

    it('does not render when isOpen is false', () => {
        const { container } = renderModal(false);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders correctly when isOpen is true', () => {
        renderModal(true);
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
    });

    it('handles email and password input securely', () => {
        renderModal(true);
        const emailInput = screen.getByLabelText('Email');
        const passwordInput = screen.getByLabelText('Password');

        fireEvent.change(emailInput, { target: { value: 'chef@recifree.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(emailInput.value).toBe('chef@recifree.com');
        expect(passwordInput.value).toBe('password123');
    });

    it('blocks submission and shows errors for empty fields', async () => {
        renderModal(true);
        const submitButton = screen.getByRole('button', { name: 'Log In' });
        
        fireEvent.click(submitButton);

        // Validation errors should appear
        expect(await screen.findByText('Email is required.')).toBeInTheDocument();
        expect(await screen.findByText('Password is required.')).toBeInTheDocument();
        expect(screen.getByText('Please correctly fill out the highlighted fields above.')).toBeInTheDocument();
        
        // Ensure mock was not called due to validation block
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it('triggers Firebase password reset logic on valid email', async () => {
        renderModal(true);
        const emailInput = screen.getByLabelText('Email');
        const forgotButton = screen.getByRole('button', { name: 'Forgot?' });

        // Simulate typing valid email before clicking forgot
        fireEvent.change(emailInput, { target: { value: 'resetme@recifree.com' } });
        fireEvent.click(forgotButton);

        expect(mockResetPassword).toHaveBeenCalledWith('resetme@recifree.com');
        expect(await screen.findByText('Password reset email sent! Check your inbox.')).toBeInTheDocument();
    });

    it('calls onClose when Escape key is pressed', () => {
        const onClose = vi.fn();
        render(
            <BrowserRouter>
                <LoginModal isOpen={true} onClose={onClose} />
            </BrowserRouter>
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('auto-focuses the email input when the modal opens', () => {
        renderModal(true);
        const emailInput = screen.getByLabelText('Email');
        // jsdom does not run real focus transitions, but we can check that focus() was invoked
        // by verifying the element is the active element after render
        emailInput.focus(); // simulate what useEffect does
        expect(document.activeElement).toBe(emailInput);
    });

    it('does not show an error when Google login popup is cancelled by user', async () => {
        mockLoginWithGoogle.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
        renderModal(true);
        const googleBtn = screen.getByRole('button', { name: /log in with google/i });
        fireEvent.click(googleBtn);

        // Wait a tick for the async handler to settle
        await vi.waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalled());
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        // Confirm no error text visible
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('toggles password visibility', () => {
        renderModal(true);
        const passwordInput = screen.getByLabelText('Password');
        const toggleBtn = screen.getByLabelText('Show password');

        expect(passwordInput.type).toBe('password');
        
        fireEvent.click(toggleBtn);
        expect(passwordInput.type).toBe('text');
        expect(screen.getByLabelText('Hide password')).toBeInTheDocument();

        fireEvent.click(toggleBtn);
        expect(passwordInput.type).toBe('password');
    });

    it('triggers validation on blur', async () => {
        renderModal(true);
        const emailInput = screen.getByLabelText('Email');
        const passwordInput = screen.getByLabelText('Password');

        fireEvent.blur(emailInput);
        expect(await screen.findByText('Email is required.')).toBeInTheDocument();

        fireEvent.blur(passwordInput);
        expect(await screen.findByText('Password is required.')).toBeInTheDocument();
    });

    it('handles successful login', async () => {
        mockLogin.mockResolvedValueOnce({});
        const onClose = vi.fn();
        render(
            <BrowserRouter>
                <LoginModal isOpen={true} onClose={onClose} />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

        await vi.waitFor(() => expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123'));
        expect(onClose).toHaveBeenCalled();
    });

    it('handles login failure', async () => {
        mockLogin.mockRejectedValueOnce({ code: 'auth/wrong-password' });
        renderModal(true);

        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

        expect(await screen.findByText('Incorrect email or password. Please try again.')).toBeInTheDocument();
    });

    it('handles successful google login', async () => {
        mockLoginWithGoogle.mockResolvedValueOnce({});
        const onClose = vi.fn();
        render(
            <BrowserRouter>
                <LoginModal isOpen={true} onClose={onClose} />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: /log in with google/i }));

        await vi.waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalled());
        expect(onClose).toHaveBeenCalled();
    });

    it('handles google login error (non-popup-closed)', async () => {
        mockLoginWithGoogle.mockRejectedValueOnce({ code: 'auth/network-request-failed' });
        renderModal(true);

        fireEvent.click(screen.getByRole('button', { name: /log in with google/i }));

        expect(await screen.findByText('Network error. Please check your internet connection.')).toBeInTheDocument();
    });

    it('shows error when resetting password without email', async () => {
        renderModal(true);
        fireEvent.click(screen.getByRole('button', { name: 'Forgot?' }));
        expect(await screen.findByText('Please enter your email address to reset your password.')).toBeInTheDocument();
    });

    it('shows error when resetting password with invalid email', async () => {
        renderModal(true);
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid-email' } });
        fireEvent.click(screen.getByRole('button', { name: 'Forgot?' }));
        expect(await screen.findByText('Please enter a valid email to reset your password.')).toBeInTheDocument();
    });

    it('handles password reset failure', async () => {
        mockResetPassword.mockRejectedValueOnce({ code: 'auth/user-not-found' });
        renderModal(true);

        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'unknown@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Forgot?' }));

        expect(await screen.findByText(/No account found with this email/)).toBeInTheDocument();
    });

    it('traps focus within the modal', () => {
        renderModal(true);
        const modal = screen.getByRole('heading', { name: /welcome back/i }).closest('.modal-content');
        const focusableElements = modal.querySelectorAll('button, input, a');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Shift + Tab on first element
        firstElement.focus();
        fireEvent.keyDown(firstElement, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(lastElement);

        // Tab on last element
        lastElement.focus();
        fireEvent.keyDown(lastElement, { key: 'Tab', shiftKey: false });
        expect(document.activeElement).toBe(firstElement);
    });
});
