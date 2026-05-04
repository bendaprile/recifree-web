import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SignupPromptModal from './SignupPromptModal';

// Mock useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

describe('SignupPromptModal Component', () => {
    const mockNavigate = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    });

    const renderModal = (isOpen = true) => {
        return render(
            <MemoryRouter>
                <SignupPromptModal isOpen={isOpen} onClose={mockOnClose} />
            </MemoryRouter>
        );
    };

    it('does not render when isOpen is false', () => {
        const { container } = renderModal(false);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders correctly when isOpen is true', () => {
        renderModal(true);
        expect(screen.getByText('Recipe Saved!')).toBeInTheDocument();
        expect(screen.getByText(/Your recipe has been saved locally/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create Free Account' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Maybe Later' })).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        renderModal(true);
        fireEvent.click(screen.getByLabelText('Close modal'));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when "Maybe Later" button is clicked', () => {
        renderModal(true);
        fireEvent.click(screen.getByRole('button', { name: 'Maybe Later' }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose and navigates to /signup when "Create Free Account" is clicked', () => {
        renderModal(true);
        fireEvent.click(screen.getByRole('button', { name: 'Create Free Account' }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });

    it('calls onClose when clicking the overlay', () => {
        renderModal(true);
        const overlay = screen.getByRole('dialog');
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking the modal content', () => {
        renderModal(true);
        const modalContent = screen.getByText('Recipe Saved!').closest('.modal-content');
        fireEvent.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
        renderModal(true);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when other keys are pressed', () => {
        renderModal(true);
        fireEvent.keyDown(document, { key: 'Enter' });
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('cleans up event listener on unmount', () => {
        const { unmount } = renderModal(true);
        unmount();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(mockOnClose).not.toHaveBeenCalled();
    });
});
