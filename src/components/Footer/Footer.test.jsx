import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Footer from './Footer';

describe('Footer Component', () => {
    const renderFooter = () => {
        return render(
            <BrowserRouter>
                <Footer />
            </BrowserRouter>
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
});
