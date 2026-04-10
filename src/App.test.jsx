import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App, { AboutPage, NotFoundPage, PrivacyPolicyPage, DMCAPolicyPage } from './App';
import { describe, it, expect, vi } from 'vitest';

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    },
    writable: true
});

describe('App Component', () => {
    it('renders the navbar and hero section', () => {
        render(<App />);

        // Check for Navbar logo
        const logos = screen.getAllByText('Recifree');
        expect(logos[0]).toBeInTheDocument();

        // Check for Hero title
        const titles = screen.getAllByText(/Recipes Without/i);
        expect(titles[0]).toBeInTheDocument();
    });
});

describe('Auxiliary Pages', () => {
    it('renders AboutPage correctly', () => {
        render(<AboutPage />);
        expect(screen.getByText('About Recifree')).toBeInTheDocument();
    });

    it('renders NotFoundPage correctly', () => {
        render(<NotFoundPage />);
        expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    });

    it('renders PrivacyPolicyPage correctly', () => {
        render(<PrivacyPolicyPage />);
        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('renders DMCAPolicyPage correctly', () => {
        render(<DMCAPolicyPage />);
        expect(screen.getByText('DMCA Policy')).toBeInTheDocument();
    });
});
