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
});
