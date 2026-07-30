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

        Object.defineProperty(window, 'requestAnimationFrame', {
            writable: true,
            value: vi.fn().mockImplementation(cb => cb()),
        });

        // Reset scroll between tests — otherwise a value set by one test leaks
        // into the next one's mount and pre-triggers the scrolled state.
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

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

    it('renders Explore for everyone, and the gated links only when signed in', () => {
        renderNavbar();
        expect(screen.getByText('Explore')).toBeInTheDocument();
        expect(screen.queryByText('Saved')).not.toBeInTheDocument();

        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        renderNavbar();
        expect(screen.getAllByText('Explore').length).toBeGreaterThan(0);
        expect(screen.getByText('Saved')).toBeInTheDocument();
        expect(screen.getByText('Shopping List')).toBeInTheDocument();
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
        const exploreLink = screen.getByRole('link', { name: /explore/i });
        fireEvent.click(exploreLink);

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

    it('navigates to a gated page from the mobile menu', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        renderNavbar();
        const toggleButton = screen.getByLabelText('Toggle navigation menu');

        // Open
        fireEvent.click(toggleButton);

        const savedLink = screen.getByRole('link', { name: /^saved/i });
        expect(savedLink).toHaveAttribute('href', '/saved');

        // Verify click closes menu
        fireEvent.click(savedLink);
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('Shopping List does NOT show when user is NOT logged in', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: null }));
        renderNavbar();

        expect(screen.queryByRole('button', { name: /shopping list/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /shopping list/i })).not.toBeInTheDocument();
    });

    it('Shopping List shows in the primary nav when user IS logged in', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        const { container } = renderNavbar();

        const listLink = screen.getByRole('link', { name: /shopping list/i, hidden: true });
        expect(listLink).toHaveAttribute('href', '/shopping-list');
        expect(container.querySelector('.navbar-cluster--start')).toContainElement(listLink);
    });

    it('Saved shows in the primary nav when user IS logged in', () => {
        useAuth.mockReturnValue(makeAuth({ currentUser: { uid: 'user-123' } }));
        const { container } = renderNavbar();

        const savedLink = screen.getByRole('link', { name: /^saved/i, hidden: true });
        expect(savedLink).toHaveAttribute('href', '/saved');
        expect(container.querySelector('.navbar-cluster--start')).toContainElement(savedLink);
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

        // Typing writes to ?q=, which changes location. The overlay must survive
        // that — only an actual page navigation should dismiss it.
        expect(container.querySelector('.mobile-search-input')).toBeInTheDocument();
    });

    it('condenses into the 2D rail on scroll and never hides itself', () => {
        const { container } = renderNavbar();
        const header = container.querySelector('.navbar');

        expect(header).not.toHaveClass('is-scrolled');

        // Past the 40px threshold -> condensed rail
        Object.defineProperty(window, 'scrollY', { value: 300, writable: true });
        fireEvent.scroll(window);
        expect(header).toHaveClass('is-scrolled');

        // Continuing to scroll DOWN must not translate the bar away
        Object.defineProperty(window, 'scrollY', { value: 900, writable: true });
        fireEvent.scroll(window);
        expect(header).toHaveClass('is-scrolled');
        expect(header).not.toHaveClass('navbar-hidden');
        expect(document.querySelector('.sticky-header--hidden')).toBeNull();

        // Back to the top -> full masthead again
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
        fireEvent.scroll(window);
        expect(header).not.toHaveClass('is-scrolled');
    });

    it('does not oscillate when scroll anchoring corrects for the collapsed height', () => {
        const { container } = renderNavbar();
        const header = container.querySelector('.navbar');
        const setScroll = (value) => {
            Object.defineProperty(window, 'scrollY', { value, writable: true });
            fireEvent.scroll(window);
        };

        // Condensing costs 16px of sticky-header flow height, which the browser
        // hands back as a scrollY correction. Collapse and expand therefore sit
        // on separate thresholds; anything inside the dead band must hold still.

        // Inside the band, on the way down: still the full masthead.
        setScroll(50);
        expect(header).not.toHaveClass('is-scrolled');

        // Clear of the band: condenses.
        setScroll(70);
        expect(header).toHaveClass('is-scrolled');

        // The anchoring correction lands back inside the band. With a single
        // threshold this flipped it open again, then shut, then open...
        setScroll(70 - 16);
        expect(header).toHaveClass('is-scrolled');

        // Only a genuine return to the top expands it.
        setScroll(20);
        expect(header).not.toHaveClass('is-scrolled');

        // And expanding re-adds those 16px without immediately re-collapsing.
        expect(20 + 16).toBeLessThan(70);
        setScroll(20 + 16);
        expect(header).not.toHaveClass('is-scrolled');
    });

    it('reveals the search icon only once scrolled, and expands it into a field', () => {
        const { container } = renderNavbar();
        const search = container.querySelector('.nav-search');

        // Hidden while the masthead is in its full 2A state
        expect(search).not.toHaveClass('is-visible');

        Object.defineProperty(window, 'scrollY', { value: 300, writable: true });
        fireEvent.scroll(window);
        expect(search).toHaveClass('is-visible');
        expect(search).not.toHaveClass('is-open');

        // Clicking the icon expands it in place
        fireEvent.click(screen.getByLabelText('Search recipes'));
        expect(search).toHaveClass('is-open');

        // And it collapses again, both by click and by scrolling back to top
        fireEvent.click(screen.getByLabelText('Close search'));
        expect(search).not.toHaveClass('is-open');

        fireEvent.click(screen.getByLabelText('Search recipes'));
        expect(search).toHaveClass('is-open');
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
        fireEvent.scroll(window);
        expect(search).not.toHaveClass('is-visible');
        expect(search).not.toHaveClass('is-open');
    });

    it('renders the left-hand nav links as plain text, without icons', () => {
        const { container } = renderNavbar();
        const leftCluster = container.querySelector('.navbar-cluster--start');

        expect(leftCluster).toBeInTheDocument();
        expect(leftCluster.querySelectorAll('svg')).toHaveLength(0);
        expect(leftCluster.textContent).toBe('Explore');
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
