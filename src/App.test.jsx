import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { describe, it, expect } from 'vitest';

describe('App Component', () => {
    it('renders the navbar and hero section', () => {
        render(<App />);

        // Check for Navbar logo
        // Check for Navbar logo (appears in Navbar and Footer)
        const logos = screen.getAllByText('Recifree');
        expect(logos[0]).toBeInTheDocument();

        // Check for Hero title
        const titles = screen.getAllByText(/Recipes Without/i);
        expect(titles[0]).toBeInTheDocument();
    });
});
