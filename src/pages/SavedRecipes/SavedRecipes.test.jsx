import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SavedRecipes from './SavedRecipes';
import { useSavedRecipes } from '../../context/SavedRecipesContext';
import * as recipeService from '../../services/recipeService';

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
  BookmarkIcon: ({ size, className }) => <div data-testid="bookmark-icon" className={className} style={{ width: size, height: size }} />,
  EditIcon: ({ size }) => <div data-testid="edit-icon" style={{ width: size, height: size }} />,
  TrashIcon: ({ size }) => <div data-testid="trash-icon" style={{ width: size, height: size }} />,
  PlusIcon: ({ size }) => <div data-testid="plus-icon" style={{ width: size, height: size }} />
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
    recipeService.getRecipeBySlug.mockResolvedValue({ id: 'test-recipe', title: 'Test Recipe' });
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
    
    recipeService.getRecipeBySlug.mockResolvedValue(mockFullRecipe);

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Chicken Pasta')).toBeInTheDocument();
    });
  });

  it('handles creating a new list', async () => {
    const mockSaves = [{ recipeId: 'r1', listNames: [] }];
    useSavedRecipes.mockReturnValue({ ...mockContext, savedRecipes: mockSaves });
    
    renderComponent();
    
    await waitFor(() => expect(screen.queryByTestId('plus-icon')).toBeInTheDocument());
    
    const addButton = screen.getByTitle('Create new list');
    fireEvent.click(addButton);
    
    const input = screen.getByPlaceholderText('List Name...');
    fireEvent.change(input, { target: { value: 'New List' } });
    fireEvent.submit(input.closest('form'));
    
    expect(mockContext.createCustomList).toHaveBeenCalledWith('New List');
  });

  it('cancels list creation on empty input or blur', async () => {
    const mockSaves = [{ recipeId: 'r1', listNames: [] }];
    useSavedRecipes.mockReturnValue({ ...mockContext, savedRecipes: mockSaves });
    
    renderComponent();
    
    await waitFor(() => expect(screen.queryByTestId('plus-icon')).toBeInTheDocument());
    
    // Test empty submit
    fireEvent.click(screen.getByTitle('Create new list'));
    const input = screen.getByPlaceholderText('List Name...');
    fireEvent.submit(input.closest('form'));
    expect(mockContext.createCustomList).not.toHaveBeenCalled();
    
    // Test blur
    fireEvent.click(screen.getByTitle('Create new list'));
    const input2 = screen.getByPlaceholderText('List Name...');
    fireEvent.blur(input2);
    expect(mockContext.createCustomList).not.toHaveBeenCalled();
  });

  it('handles renaming a list', async () => {
    const mockSaves = [{ recipeId: 'r1', listNames: ['My List'] }];
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: mockSaves,
      lists: ['My List']
    });
    
    renderComponent();
    
    await waitFor(() => expect(screen.getByText('My List')).toBeInTheDocument());
    
    // Switch to the list
    fireEvent.click(screen.getByText('My List'));
    
    // Click edit
    const editButton = screen.getByTitle('Rename list');
    fireEvent.click(editButton);
    
    const input = screen.getByPlaceholderText('List Name');
    fireEvent.change(input, { target: { value: 'Renamed List' } });
    fireEvent.submit(input.closest('form'));
    
    expect(mockContext.renameCustomList).toHaveBeenCalledWith('My List', 'Renamed List');
  });

  it('handles deleting a list with "move" action', async () => {
    const mockSaves = [{ recipeId: 'r1', listNames: ['My List'] }];
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: mockSaves,
      lists: ['My List']
    });
    
    renderComponent();
    
    await waitFor(() => expect(screen.getByText('My List')).toBeInTheDocument());
    fireEvent.click(screen.getByText('My List'));
    
    const deleteButton = screen.getByTitle('Delete list');
    fireEvent.click(deleteButton);
    
    expect(screen.getByText('Delete "My List"?')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Keep them saved'));
    expect(mockContext.deleteCustomList).toHaveBeenCalledWith('My List', 'move');
  });

  it('handles deleting a list with "delete" action', async () => {
    const mockSaves = [{ recipeId: 'r1', listNames: ['My List'] }];
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: mockSaves,
      lists: ['My List']
    });
    
    renderComponent();
    
    await waitFor(() => expect(screen.getByText('My List')).toBeInTheDocument());
    fireEvent.click(screen.getByText('My List'));
    
    fireEvent.click(screen.getByTitle('Delete list'));
    fireEvent.click(screen.getByText('Unsave them completely'));
    
    expect(mockContext.deleteCustomList).toHaveBeenCalledWith('My List', 'delete');
  });

  it('cancels list deletion', async () => {
    const mockSaves = [{ recipeId: 'r1', listNames: ['My List'] }];
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: mockSaves,
      lists: ['My List']
    });
    
    renderComponent();
    
    await waitFor(() => expect(screen.getByText('My List')).toBeInTheDocument());
    fireEvent.click(screen.getByText('My List'));
    
    fireEvent.click(screen.getByTitle('Delete list'));
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.queryByText('Delete "My List"?')).not.toBeInTheDocument();
  });

  it('filters recipes by custom list and handles missing listNames', async () => {
    const mockSaves = [
      { recipeId: 'r1', listNames: ['List A'] },
      { recipeId: 'r2', listNames: null } // Test null listNames branch
    ];
    
    recipeService.getRecipeBySlug.mockImplementation((id) => {
      if (id === 'r1') return Promise.resolve({ id: 'r1', title: 'Recipe A' });
      if (id === 'r2') return Promise.resolve({ id: 'r2', title: 'Recipe B' });
      return Promise.resolve(null);
    });

    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: mockSaves,
      lists: ['List A', 'List B']
    });
    
    renderComponent();
    
    await waitFor(() => expect(screen.getByText('Recipe A')).toBeInTheDocument());
    
    // Switch to List A
    fireEvent.click(screen.getByText('List A'));
    expect(screen.getByText('Recipe A')).toBeInTheDocument();
    expect(screen.queryByText('Recipe B')).not.toBeInTheDocument();
  });

  it('handles unmounting during recipe fetch', async () => {
    let resolveFetch;
    const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });
    recipeService.getRecipeBySlug.mockReturnValue(fetchPromise);
    
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: [{ recipeId: 'r1', listNames: [] }] 
    });

    const { unmount } = renderComponent();
    
    // Unmount before fetch completes
    unmount();
    
    // Resolve fetch
    resolveFetch({ id: 'r1', title: 'Recipe 1' });
    
    // Nothing should happen (no state updates on unmounted component)
    // This covers the !isMounted branches
  });

  it('resets activeList if it no longer exists', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <SavedRecipes />
      </MemoryRouter>
    );

    // Initial state: custom list exists and is active
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: [{ recipeId: 'r1', listNames: ['Deleted List'] }],
      lists: ['Deleted List']
    });

    rerender(
      <MemoryRouter>
        <SavedRecipes />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Deleted List')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Deleted List'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Deleted List');

    // Update context: list is gone
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: [],
      lists: [] 
    });

    rerender(
      <MemoryRouter>
        <SavedRecipes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your Kitchen');
    });
  });

  it('logs error if fetching recipes fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    recipeService.getRecipeBySlug.mockRejectedValue(new Error('Fetch failed'));
    
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: [{ recipeId: 'r1', listNames: [] }] 
    });

    renderComponent();
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching full recipes', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('shows empty list state when a custom list has no recipes', async () => {
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: [{ recipeId: 'r1', listNames: ['Other'] }],
      lists: ['Empty List']
    });
    
    renderComponent();
    
    await waitFor(() => expect(screen.getByText('Empty List')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Empty List'));
    
    expect(screen.getByText('No recipes in this list yet.')).toBeInTheDocument();
  });

  it('switches back to "All Saved" tab', async () => {
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: [{ recipeId: 'r1', listNames: ['List A'] }],
      lists: ['List A']
    });
    
    renderComponent();
    
    await waitFor(() => expect(screen.getByText('List A')).toBeInTheDocument());
    fireEvent.click(screen.getByText('List A'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('List A');
    
    fireEvent.click(screen.getByText('All Saved'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your Kitchen');
  });

  it('closes delete modal when clicking overlay', async () => {
    useSavedRecipes.mockReturnValue({ 
      ...mockContext, 
      savedRecipes: [{ recipeId: 'r1', listNames: ['My List'] }],
      lists: ['My List']
    });
    
    const { container } = renderComponent();
    
    await waitFor(() => expect(screen.getByText('My List')).toBeInTheDocument());
    fireEvent.click(screen.getByText('My List'));
    fireEvent.click(screen.getByTitle('Delete list'));
    
    expect(screen.getByText('Delete "My List"?')).toBeInTheDocument();
    
    // Click the overlay
    const overlay = container.querySelector('.delete-modal-overlay');
    fireEvent.click(overlay);
    
    expect(screen.queryByText('Delete "My List"?')).not.toBeInTheDocument();
  });
});

