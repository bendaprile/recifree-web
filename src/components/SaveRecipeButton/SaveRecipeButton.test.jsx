import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SaveRecipeButton from './SaveRecipeButton';
import * as SavedRecipesContext from '../../context/SavedRecipesContext';
import * as AuthContext from '../../context/AuthContext';

// Mock Icons
vi.mock('../Icons/Icons', () => ({
    BookmarkIcon: ({ size }) => <span data-testid="bookmark-icon" data-size={size} />,
    BookmarkSolidIcon: ({ size }) => <span data-testid="bookmark-solid-icon" data-size={size} />,
    CheckIcon: ({ size }) => <span data-testid="check-icon" data-size={size} />
}));

// Mock SignupPromptModal
vi.mock('../SignupPromptModal/SignupPromptModal', () => ({
    default: ({ isOpen, onClose }) => isOpen ? (
        <div data-testid="signup-prompt">
            <button onClick={onClose}>Close</button>
        </div>
    ) : null
}));

const mockToggleSaved = vi.fn().mockResolvedValue(undefined);
const mockToggleListForRecipe = vi.fn().mockResolvedValue(undefined);

const mockRecipe = {
    id: 'test-recipe',
    title: 'Test Recipe'
};

describe('SaveRecipeButton Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockToggleSaved.mockResolvedValue(undefined);
        mockToggleListForRecipe.mockResolvedValue(undefined);
    });

    const setupMocks = (overrides = {}) => {
        const savedRecipesContextDefaults = {
            savedRecipes: [],
            toggleSaved: mockToggleSaved,
            toggleListForRecipe: mockToggleListForRecipe,
            lists: [],
            ...overrides.savedRecipesContext
        };

        const authContextDefaults = {
            currentUser: { uid: 'test-user' },
            ...overrides.authContext
        };

        vi.spyOn(SavedRecipesContext, 'useSavedRecipes').mockReturnValue(savedRecipesContextDefaults);
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue(authContextDefaults);
    };

    it('renders "Save" state when recipe is not saved', () => {
        setupMocks();
        render(<SaveRecipeButton recipe={mockRecipe} variant="text" />);
        
        expect(screen.getByLabelText('Save recipe')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByTestId('bookmark-icon')).toBeInTheDocument();
    });

    it('renders "Saved" state when recipe is saved', () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }]
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} variant="text" />);
        
        expect(screen.getByLabelText('Remove from saved recipes')).toBeInTheDocument();
        expect(screen.getByText('Saved')).toBeInTheDocument();
        expect(screen.getByTestId('bookmark-solid-icon')).toBeInTheDocument();
    });

    it('renders icon-only variant correctly', () => {
        setupMocks();
        render(<SaveRecipeButton recipe={mockRecipe} variant="icon-only" />);
        
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
        expect(screen.getByTestId('bookmark-icon')).toHaveAttribute('data-size', '20');
    });

    it('saves recipe immediately when not saved', async () => {
        setupMocks();
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        expect(mockToggleSaved).toHaveBeenCalledWith('test-recipe');
    });

    it('shows signup prompt if saving while unauthenticated', async () => {
        setupMocks({
            authContext: { currentUser: null }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        expect(mockToggleSaved).toHaveBeenCalledWith('test-recipe');
        expect(await screen.findByTestId('signup-prompt')).toBeInTheDocument();
    });

    it('unsaves recipe when clicking saved recipe with no custom lists', async () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: []
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        expect(mockToggleSaved).toHaveBeenCalledWith('test-recipe');
    });

    it('shows list menu when clicking saved recipe with custom lists', async () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites', 'To Try']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        
        expect(screen.getByText('Add to list')).toBeInTheDocument();
        expect(screen.getByText('Favorites')).toBeInTheDocument();
        expect(screen.getByText('To Try')).toBeInTheDocument();
        expect(screen.getByText('Remove from library')).toBeInTheDocument();
    });

    it('toggles list for recipe when list option is clicked', async () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: ['Favorites'] }],
                lists: ['Favorites', 'To Try']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        // Open menu
        fireEvent.click(screen.getByRole('button'));
        
        // Click 'To Try'
        fireEvent.click(screen.getByText('To Try'));
        expect(mockToggleListForRecipe).toHaveBeenCalledWith('test-recipe', 'To Try');
    });

    it('shows check icon for lists the recipe is in', () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: ['Favorites'] }],
                lists: ['Favorites', 'To Try']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        
        const favoritesBtn = screen.getByText('Favorites').closest('button');
        expect(favoritesBtn).toHaveClass('active-list');
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('calls toggleSaved and closes menu when "Remove from library" is clicked', async () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Remove from library'));
        
        expect(mockToggleSaved).toHaveBeenCalledWith('test-recipe');
        await waitFor(() => {
            expect(screen.queryByText('Add to list')).not.toBeInTheDocument();
        });
    });

    it('closes menu when clicking outside', () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('Add to list')).toBeInTheDocument();
        
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Add to list')).not.toBeInTheDocument();
    });

    it('shows signup prompt when toggling list while unauthenticated', async () => {
        setupMocks({
            authContext: { currentUser: null },
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Favorites'));
        
        expect(mockToggleListForRecipe).toHaveBeenCalledWith('test-recipe', 'Favorites');
        expect(await screen.findByTestId('signup-prompt')).toBeInTheDocument();
    });

    it('closes signup prompt when onClose is called', async () => {
        setupMocks({
            authContext: { currentUser: null }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        const prompt = await screen.findByTestId('signup-prompt');
        expect(prompt).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Close'));
        expect(screen.queryByTestId('signup-prompt')).not.toBeInTheDocument();
    });

    it('handles missing listNames in savedRecord', async () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe' }], // listNames missing
                lists: ['Favorites']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        
        // Should default to empty array and Favorites should not have check icon
        const favoritesBtn = (await screen.findByText('Favorites')).closest('button');
        expect(favoritesBtn).not.toHaveClass('active-list');
        expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    });

    it('does not close menu when clicking inside', () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('Add to list')).toBeInTheDocument();
        
        // Click inside the menu (e.g., the header)
        fireEvent.mouseDown(screen.getByText('Add to list'));
        expect(screen.getByText('Add to list')).toBeInTheDocument();
    });
});
