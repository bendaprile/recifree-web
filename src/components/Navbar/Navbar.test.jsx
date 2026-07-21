import { render, screen, fireEvent, act } from '@testing-library/react';
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

        Object.defineProperty(window, 'requestAnimationFrame', {
            writable: true,
            value: vi.fn().mockImplementation(cb => cb()),
        });

        window.history.replaceState({}, '', '/');
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

    it('Shopping List does NOT show when user is NOT logged in', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: null }));
        renderNavbar();

        expect(screen.queryByRole('button', { name: /shopping list/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /shopping list/i })).not.toBeInTheDocument();
    });

    it('Shopping List shows as a link inside My Kitchen dropdown when user IS logged in', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        renderNavbar();

        const listLink = screen.getByRole('link', { name: /shopping list/i, hidden: true });
        expect(listLink).toBeInTheDocument();
        expect(listLink).toHaveAttribute('href', '/shopping-list');
    });

    it('Saved Recipes shows inside My Kitchen dropdown when user IS logged in', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        renderNavbar();

        const savedLink = screen.getByRole('link', { name: /saved recipes/i, hidden: true });
        expect(savedLink).toBeInTheDocument();
        expect(savedLink).toHaveAttribute('href', '/saved');
    });

    it('toggles dropdown when My Kitchen button is clicked', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        renderNavbar();

        const dropdown = screen.getByText('Settings').closest('.user-dropdown');
        expect(dropdown).not.toHaveClass('open');

        const kitchenBtn = screen.getByRole('button', { name: /my kitchen/i });
        fireEvent.click(kitchenBtn);
        expect(dropdown).toHaveClass('open');

        fireEvent.click(kitchenBtn);
        expect(dropdown).not.toHaveClass('open');
    });

    it('toggles dropdown when My Kitchen container is hovered', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        renderNavbar();

        const dropdown = screen.getByText('Settings').closest('.user-dropdown');
        expect(dropdown).not.toHaveClass('open');

        const container = dropdown.closest('.user-menu-container');
        
        fireEvent.mouseEnter(container);
        expect(dropdown).toHaveClass('open');

        fireEvent.mouseLeave(container);
        expect(dropdown).not.toHaveClass('open');
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

        const logoutButton = screen.getByRole('button', { name: /logout/i, hidden: true });
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

        const closeButton = screen.getByLabelText('Close'); 
        fireEvent.click(closeButton);

        // Verify modal is closed
        expect(screen.queryByText('Welcome Back')).not.toBeInTheDocument();
    });

    it('renders sticky search bar on homepage', () => {
        renderNavbar();
        expect(screen.getByTestId('sticky-search-bar')).toBeInTheDocument();
    });

    it('shows mobile search trigger when scrolling down on home page, and handles input/close/cancel/keypresses', () => {
        const { container } = renderNavbar();
        
        // Mock scrollY and trigger scroll event
        Object.defineProperty(window, 'scrollY', { value: 300, writable: true });
        fireEvent.scroll(window);
        
        // Now mobile search trigger should be visible
        const triggerBtn = screen.getByLabelText('Open search');
        expect(triggerBtn).toBeInTheDocument();

        // Click trigger to open mobile search overlay
        fireEvent.click(triggerBtn);
        
        const input = container.querySelector('.mobile-search-input');
        expect(input).toBeInTheDocument();

        // Test keypress on search input (Enter should close the overlay)
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        expect(container.querySelector('.mobile-search-input')).toBeNull();

        // Open search again to test cancel button
        const triggerBtn2 = screen.getByLabelText('Open search');
        fireEvent.click(triggerBtn2);
        const cancelBtn = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelBtn);
        expect(container.querySelector('.mobile-search-input')).toBeNull();

        // Open search once more to fire a search input change event
        const triggerBtn3 = screen.getByLabelText('Open search');
        fireEvent.click(triggerBtn3);
        const input2 = container.querySelector('.mobile-search-input');
        fireEvent.change(input2, { target: { value: 'pasta' } });
    });

    it('closes the user menu dropdown via onBlur when clicking outside', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        renderNavbar();

        const dropdown = screen.getByText('Settings').closest('.user-dropdown');
        const kitchenBtn = screen.getByRole('button', { name: /my kitchen/i });
        
        // Open the dropdown first
        fireEvent.click(kitchenBtn);
        expect(dropdown).toHaveClass('open');

        // Find the container element
        const container = dropdown.closest('.user-menu-container');

        // Trigger blur event on the container, simulating focus moving outside the container
        fireEvent.blur(container, { relatedTarget: document.body });
        expect(dropdown).not.toHaveClass('open');
    });
});
