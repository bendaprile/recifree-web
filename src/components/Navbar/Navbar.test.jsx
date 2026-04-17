import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Navbar from './Navbar';
import { ThemeProvider } from '../../context/ThemeContext';

// Default mock: unauthenticated
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

import { useAuth } from '../../context/AuthContext';

const makeAuth = (overrides = {}) => ({
    currentUser: null,
    logout: vi.fn(),
    loadingAuth: false,
    ...overrides,
});

describe('Navbar Component', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(), // deprecated
                removeListener: vi.fn(), // deprecated
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn(),
            },
            writable: true
        });
    });

    const renderNavbar = () => {
        return render(
            <ThemeProvider>
                <BrowserRouter>
                    <Navbar />
                </BrowserRouter>
            </ThemeProvider>
        );
    };

    beforeEach(() => {
        useAuth.mockReturnValue(makeAuth());
    });

    it('renders the logo correctly', () => {
        renderNavbar();
        expect(screen.getByText('Recifree')).toBeInTheDocument();
    });

    it('renders navigation links', () => {
        renderNavbar();
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('toggles the mobile menu when hamburger button is clicked', () => {
        renderNavbar();
        const toggleButton = screen.getByLabelText('Toggle navigation menu');

        // Initially not expanded (we can check aria-expanded)
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

        // Click to open
        fireEvent.click(toggleButton);
        expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
        // Check if the 'open' class is applied to the menu container if possible, 
        // or we can invoke a click on a link and see if it tries to close the menu.
        // However, testing styles/classes directly is flaky, better to test behavior.

        // Click to close
        fireEvent.click(toggleButton);
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes the menu when a link is clicked', () => {
        renderNavbar();
        const toggleButton = screen.getByLabelText('Toggle navigation menu');

        // Open menu
        fireEvent.click(toggleButton);
        expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

        // Click a link
        const homeLink = screen.getByRole('link', { name: /home/i });
        fireEvent.click(homeLink);

        // Should be closed now (state update happens)
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes the menu when clicking the overlay', () => {
        renderNavbar();
        const toggleButton = screen.getByLabelText('Toggle navigation menu');

        // Open menu
        fireEvent.click(toggleButton);
        expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

        // The overlay appears when menu is open
        const overlay = screen.getByTestId('navbar-overlay');
        expect(overlay).toBeInTheDocument();

        // Click the overlay
        fireEvent.click(overlay);

        // Menu should be closed
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByTestId('navbar-overlay')).not.toBeInTheDocument();
    });

    it('navigates to About page from mobile menu', () => {
        renderNavbar();
        const toggleButton = screen.getByLabelText('Toggle navigation menu');

        // Open
        fireEvent.click(toggleButton);

        const aboutLink = screen.getByRole('link', { name: /about/i });
        expect(aboutLink).toHaveAttribute('href', '/about');

        // Verify click closes menu
        fireEvent.click(aboutLink);
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('Shopping List shows as a button and opens LoginModal when user is NOT logged in', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: null }));
        renderNavbar();

        // Should be a button, not a link
        const listButton = screen.getByRole('button', { name: /shopping list/i });
        expect(listButton).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /shopping list/i })).not.toBeInTheDocument();

        // Clicking it should open the login modal
        fireEvent.click(listButton);
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    it('Shopping List shows as a /shopping-list link when user IS logged in', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        renderNavbar();

        const listLink = screen.getByRole('link', { name: /shopping list/i });
        expect(listLink).toBeInTheDocument();
        expect(listLink).toHaveAttribute('href', '/shopping-list');
        expect(screen.queryByRole('button', { name: /shopping list/i })).not.toBeInTheDocument();
    });
    it('renders a loading skeleton when loadingAuth is true', () => {
        useAuth.mockReturnValue(makeAuth({ loadingAuth: true }));
        renderNavbar();

        expect(screen.getByTestId('navbar-skeleton')).toBeInTheDocument();
        expect(screen.queryByText('Login')).not.toBeInTheDocument();
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('opens LoginModal and closes menu when Login button is clicked', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: null }));
        renderNavbar();
        
        const toggleButton = screen.getByLabelText('Toggle navigation menu');
        fireEvent.click(toggleButton); // Open menu to reach button in mobile view or just find it

        const loginButton = screen.getByRole('button', { name: /login/i });
        fireEvent.click(loginButton);

        // Verify modal is open (using a specific text from LoginModal)
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        
        // Verify menu is closed
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('calls logout and closes menu when Logout button is clicked', () => {
        const mockLogout = vi.fn();
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: '123' }, logout: mockLogout }));
        renderNavbar();

        const toggleButton = screen.getByLabelText('Toggle navigation menu');
        fireEvent.click(toggleButton); // Open menu

        const logoutButton = screen.getByRole('button', { name: /logout/i });
        fireEvent.click(logoutButton);

        expect(mockLogout).toHaveBeenCalledTimes(1);
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes the LoginModal when onClose is triggered', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: null }));
        renderNavbar();

        // Open modal first
        const loginButton = screen.getByRole('button', { name: /login/i });
        fireEvent.click(loginButton);
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();

        // Close modal (LoginModal has a close button or we can fire the onClose prop if we could, 
        // but we test the interaction. LoginModal usually has a close button with &times; or similar)
        // Looking at LoginModal.jsx (I should check it but typically it has a close button)
        const closeButton = screen.getByLabelText('Close'); 
        fireEvent.click(closeButton);

        // Verify modal is closed (queryByText should return null)
        expect(screen.queryByText('Welcome Back')).not.toBeInTheDocument();
    });
});
