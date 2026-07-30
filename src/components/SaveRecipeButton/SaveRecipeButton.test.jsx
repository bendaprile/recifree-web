import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SaveRecipeButton from './SaveRecipeButton';
import * as SavedRecipesContext from '../../context/SavedRecipesContext';
import * as AuthContext from '../../context/AuthContext';

// Mock Icons
vi.mock('../Icons/Icons', () => ({
    BookmarkIcon: ({ size }) => <span data-testid="bookmark-icon" data-size={size} />,
    BookmarkSolidIcon: ({ size }) => <span data-testid="bookmark-solid-icon" data-size={size} />,
    CheckIcon: ({ size }) => <span data-testid="check-icon" data-size={size} />,
    MoreIcon: ({ size }) => <span data-testid="more-icon" data-size={size} />,
    BookmarkMinusIcon: ({ size }) => <span data-testid="bookmark-minus-icon" data-size={size} />
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

    it('unsaves via the bookmark even when custom lists exist', async () => {
        // Previously the bookmark stopped being a toggle as soon as the user had
        // any list — it opened the menu instead. It must always toggle now.
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites', 'To Try']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);

        fireEvent.click(screen.getByLabelText('Remove from saved recipes'));

        expect(mockToggleSaved).toHaveBeenCalledWith('test-recipe');
        expect(screen.queryByText('Add to list')).not.toBeInTheDocument();
    });

    it('only offers the manage-lists trigger once saved and lists exist', () => {
        // Queried by role so the assertions follow accessibility: when not saved
        // the button stays mounted (so it can animate) but is aria-hidden, and
        // must not be reachable.

        // Not saved -> present in the DOM but collapsed and out of the a11y tree
        setupMocks({ savedRecipesContext: { savedRecipes: [], lists: ['Favorites'] } });
        const { unmount } = render(<SaveRecipeButton recipe={mockRecipe} />);
        expect(screen.queryByRole('button', { name: 'Manage lists' })).not.toBeInTheDocument();
        expect(screen.getByLabelText('Manage lists')).toHaveClass('is-hidden');
        expect(screen.getByLabelText('Manage lists')).toHaveAttribute('tabindex', '-1');
        unmount();

        // Saved but no lists to organise into -> not rendered at all
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: []
            }
        });
        const second = render(<SaveRecipeButton recipe={mockRecipe} />);
        expect(screen.queryByLabelText('Manage lists')).not.toBeInTheDocument();
        second.unmount();

        // Saved with lists -> trigger is exposed and expanded
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        const trigger = screen.getByRole('button', { name: 'Manage lists' });
        expect(trigger).toBeInTheDocument();
        expect(trigger).not.toHaveClass('is-hidden');
    });

    it('shows list menu when clicking the manage-lists trigger', async () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites', 'To Try']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByLabelText('Manage lists'));
        
        expect(screen.getByText('Add to list')).toBeInTheDocument();
        expect(screen.getByText('Favorites')).toBeInTheDocument();
        expect(screen.getByText('To Try')).toBeInTheDocument();
        // Removal now lives on the bookmark's hover state, not in this menu
        expect(screen.queryByText('Remove from library')).not.toBeInTheDocument();
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
        fireEvent.click(screen.getByLabelText('Manage lists'));
        
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
        
        fireEvent.click(screen.getByLabelText('Manage lists'));
        
        const favoritesBtn = screen.getByText('Favorites').closest('button');
        expect(favoritesBtn).toHaveClass('active-list');
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('offers the removal affordance on the saved bookmark, and closes the menu', async () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} variant="icon-only" />);

        // The hover-swapped "remove" icon is rendered alongside the solid one so
        // the swap can be pure CSS; both live in the DOM while saved.
        expect(screen.getByTestId('bookmark-solid-icon')).toBeInTheDocument();
        expect(screen.getByTestId('bookmark-minus-icon')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Manage lists'));
        expect(screen.getByText('Add to list')).toBeInTheDocument();

        // Clicking the bookmark removes it and dismisses the open menu
        fireEvent.click(screen.getByLabelText('Remove from saved recipes'));
        expect(mockToggleSaved).toHaveBeenCalledWith('test-recipe');
        await waitFor(() => {
            expect(screen.queryByText('Add to list')).not.toBeInTheDocument();
        });
    });

    it('does not render the removal icon until the recipe is saved', () => {
        setupMocks();
        render(<SaveRecipeButton recipe={mockRecipe} variant="icon-only" />);

        expect(screen.getByTestId('bookmark-icon')).toBeInTheDocument();
        expect(screen.queryByTestId('bookmark-minus-icon')).not.toBeInTheDocument();
    });

    it('closes menu when clicking outside', () => {
        setupMocks({
            savedRecipesContext: {
                savedRecipes: [{ recipeId: 'test-recipe', listNames: [] }],
                lists: ['Favorites']
            }
        });
        render(<SaveRecipeButton recipe={mockRecipe} />);
        
        fireEvent.click(screen.getByLabelText('Manage lists'));
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
        
        fireEvent.click(screen.getByLabelText('Manage lists'));
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
        
        fireEvent.click(screen.getByLabelText('Manage lists'));
        
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
        
        fireEvent.click(screen.getByLabelText('Manage lists'));
        expect(screen.getByText('Add to list')).toBeInTheDocument();
        
        // Click inside the menu (e.g., the header)
        fireEvent.mouseDown(screen.getByText('Add to list'));
        expect(screen.getByText('Add to list')).toBeInTheDocument();
    });
});
