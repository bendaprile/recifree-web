import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import RecipeCard from './RecipeCard';

const mockRecipe = {
    id: 'test-recipe',
    title: 'Test Recipe',
    image: 'test-image.jpg',
    totalTime: '30 min',
    servings: 4,
    tags: ['Healthy', 'Dinner'],
    difficulty: 'Easy'
};

const mockRecipeNoImage = {
    ...mockRecipe,
    image: null
};

describe('RecipeCard Component', () => {
    const renderCard = (recipe = mockRecipe) => {
        return render(
            <BrowserRouter>
                <RecipeCard recipe={recipe} />
            </BrowserRouter>
        );
    };

    it('renders recipe details correctly', () => {
        renderCard();
        expect(screen.getByText(mockRecipe.title)).toBeInTheDocument();
        expect(screen.getByText(mockRecipe.totalTime)).toBeInTheDocument();
        expect(screen.getByText(mockRecipe.servings)).toBeInTheDocument();
        expect(screen.getByText(mockRecipe.difficulty)).toBeInTheDocument();
    });

    it('renders tags correctly', () => {
        renderCard();
        mockRecipe.tags.forEach(tag => {
            expect(screen.getByText(tag)).toBeInTheDocument();
        });
    });

    it('uses the provided image', () => {
        renderCard();
        const img = screen.getByAltText(mockRecipe.title);
        expect(img).toHaveAttribute('src', 'test-image.jpg');
    });

    it('uses default image when no image is provided', () => {
        renderCard(mockRecipeNoImage);
        const img = screen.getByAltText(mockRecipe.title);
        expect(img.src).toContain('unsplash');
    });

    it('links to the correct recipe page', () => {
        renderCard();
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', `/recipe/${mockRecipe.id}`);
    });
});
