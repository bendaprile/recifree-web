import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SavedRecipes from './SavedRecipes';
import { useSavedRecipes } from '../../context/SavedRecipesContext';

// Mock the context hook
vi.mock('../../context/SavedRecipesContext', () => ({
  useSavedRecipes: vi.fn()
}));

// Mock the recipe service
vi.mock('../../services/recipeService', () => ({
  getRecipeBySlug: vi.fn()
}));

// Mock Icons to avoid rendering issues
vi.mock('../../components/Icons/Icons', () => ({
  BookmarkIcon: () => <div data-testid="bookmark-icon" />,
  EditIcon: () => <div data-testid="edit-icon" />,
  TrashIcon: () => <div data-testid="trash-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />
}));

// Mock RecipeCard
vi.mock('../../components/RecipeCard/RecipeCard', () => ({
  default: ({ recipe }) => <div data-testid="recipe-card">{recipe.title}</div>
}));

describe('SavedRecipes Component', () => {
  const mockContext = {
    savedRecipes: [],
    lists: [],
    loading: false,
    createCustomList: vi.fn(),
    renameCustomList: vi.fn(),
    deleteCustomList: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useSavedRecipes.mockReturnValue(mockContext);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <SavedRecipes />
      </MemoryRouter>
    );
  };

  it('shows skeletons when context is loading', () => {
    useSavedRecipes.mockReturnValue({ ...mockContext, loading: true });
    renderComponent();
    
    const skeletons = document.querySelectorAll('.recipe-card-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders correctly with no saved recipes', async () => {
    renderComponent();
    
    // Wait for internal loadingRecipes to become false
    await waitFor(() => {
      expect(screen.getByText('Your kitchen is clean!')).toBeInTheDocument();
    });
  });

  it('renders saved recipes correctly', async () => {
    const mockSaves = [
      { recipeId: 'chicken-pasta', listNames: [], savedAt: '2024-01-01' }
    ];
    const mockFullRecipe = { id: 'chicken-pasta', title: 'Chicken Pasta' };
    
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: mockSaves 
    });
    
    const { getRecipeBySlug } = await import('../../services/recipeService');
    getRecipeBySlug.mockResolvedValue(mockFullRecipe);

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Chicken Pasta')).toBeInTheDocument();
    });
  });
});
