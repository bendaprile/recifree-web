import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Footer from './Footer';
import { ThemeProvider } from '../../context/ThemeContext';

describe('Footer Component', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false, // Default to light
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
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

    const renderFooter = () => {
        return render(
            <ThemeProvider>
                <BrowserRouter>
                    <Footer />
                </BrowserRouter>
            </ThemeProvider>
        );
    };

    it('renders the brand and tagline', () => {
        renderFooter();
        expect(screen.getByText('Recifree')).toBeInTheDocument();
        expect(screen.getByText(/Recipes without the clutter/i)).toBeInTheDocument();
    });

    it('renders navigation links', () => {
        renderFooter();
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('renders legal links', () => {
        renderFooter();
        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
        expect(screen.getByText('DMCA Policy')).toBeInTheDocument();
    });

    it('renders the copyright year dynamically', () => {
        renderFooter();
        const currentYear = new Date().getFullYear();
        expect(screen.getByText(new RegExp(`© ${currentYear} Recifree`, 'i'))).toBeInTheDocument();
    });

    it('renders github link', () => {
        renderFooter();
        const githubLink = screen.getByText('GitHub');
        expect(githubLink).toBeInTheDocument();
        expect(githubLink).toHaveAttribute('href', 'https://github.com/bendaprile/recifree-web');
    });

    it('renders and functions theme toggle', () => {
        renderFooter();
        // Since we default to light mode mock, it should show switch to dark button
        const toggleButton = screen.getByLabelText(/switch to dark/i);
        expect(toggleButton).toBeInTheDocument();

        // Click to toggle
        fireEvent.click(toggleButton);

        // Should now be switch to light
        expect(toggleButton).toHaveAttribute('aria-label', expect.stringMatching(/switch to light/i));
    });
});
