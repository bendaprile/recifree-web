import { render, screen, fireEvent, act } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Firebase SDK mocks ──────────────────────────────────────────────────────
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  connectAuthEmulator: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
}));

// ─── Service Mocks ───────────────────────────────────────────────────────────
vi.mock('../../services/extractionService', () => ({
  extractRecipeFromUrl: vi.fn(),
}));

vi.mock('../../services/recipeService', () => ({
  addRecipe: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import AddRecipe from './AddRecipe';
import { extractRecipeFromUrl } from '../../services/extractionService';
import { addRecipe } from '../../services/recipeService';

describe('AddRecipe Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAddRecipe = () => {
    const router = createMemoryRouter(
      [{ path: '/add', element: <AddRecipe /> }],
      { initialEntries: ['/add'] }
    );
    return render(<RouterProvider router={router} />);
  };

  it('renders the initial state with ExtractionCard and Manual entry option', () => {
    renderAddRecipe();

    expect(screen.getByText('Add a Recipe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. https:\/\/www.bonappetit.com/)).toBeInTheDocument();
    expect(screen.getByText('Write Recipe Manually')).toBeInTheDocument();
  });

  it('transitions to loading and then to edit on successful extraction', async () => {
    const mockExtractedData = {
      title: 'Lasagna Extraordinaire',
      description: 'The best lasagna ever',
      prepTime: '20 mins',
      cookTime: '40 mins',
      servings: '6',
      ingredients: [
        {
          title: '',
          items: [{ amount: '1', unit: 'pack', item: 'pasta sheets' }],
        },
      ],
      instructions: ['Boil water', 'Bake it'],
    };

    let resolvePromise;
    const asyncPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    extractRecipeFromUrl.mockReturnValue(asyncPromise);

    renderAddRecipe();

    const input = screen.getByPlaceholderText(/e.g. https:\/\/www.bonappetit.com/);
    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff' });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com/recipe' } });
      fireEvent.click(submitBtn);
    });

    // Check loading indicator shows up or witty copy
    expect(screen.getByText('Stripping the Fluff...')).toBeInTheDocument();

    // Resolve the promise to transition to the edit state
    await act(async () => {
      resolvePromise(mockExtractedData);
    });

    // Wait for the form edit screen to render after successful extraction promise resolves
    await screen.findByText('Review & Save');
    expect(screen.getByLabelText(/Recipe Title/)).toHaveValue('Lasagna Extraordinaire');
  });

  it('handles manual entry trigger from scratch', async () => {
    renderAddRecipe();

    const manualBtn = screen.getByRole('button', { name: 'Write Recipe Manually' });

    await act(async () => {
      fireEvent.click(manualBtn);
    });

    expect(screen.getByText('New Custom Recipe')).toBeInTheDocument();
    expect(screen.getByLabelText(/Recipe Title/)).toHaveValue('');
  });

  it('displays a friendly beta gate message on 403 Forbidden and offers manual fallback', async () => {
    const error403 = new Error('Forbidden');
    error403.status = 403;

    extractRecipeFromUrl.mockRejectedValue(error403);

    renderAddRecipe();

    const input = screen.getByPlaceholderText(/e.g. https:\/\/www.bonappetit.com/);
    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff' });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com/recipe/lasagna-classic' } });
      fireEvent.click(submitBtn);
    });

    // Verify error message is rendered
    expect(screen.getByText(/Extraction is currently gated for beta testers/)).toBeInTheDocument();

    // Verify the prefill/write manually action button is available
    const fallbackBtn = screen.getByRole('button', { name: 'Pre-fill & Write Manually' });
    expect(fallbackBtn).toBeInTheDocument();

    // Click prefill and check if form loads with prefilled estimated title from URL
    await act(async () => {
      fireEvent.click(fallbackBtn);
    });

    expect(screen.getByText('New Custom Recipe')).toBeInTheDocument();
    expect(screen.getByLabelText(/Recipe Title/)).toHaveValue('Lasagna Classic');
  });

  it('saves the recipe successfully and redirects user to details page', async () => {
    renderAddRecipe();

    // Go directly to manual entry
    const manualBtn = screen.getByRole('button', { name: 'Write Recipe Manually' });
    await act(async () => {
      fireEvent.click(manualBtn);
    });

    // Populate required fields
    fireEvent.change(screen.getByLabelText(/Recipe Title/), { target: { value: 'Easy Mug Cake' } });
    
    // Ingredients amount/item fields
    fireEvent.change(screen.getByPlaceholderText('e.g. fresh mozzarella'), { target: { value: 'flour' } });
    
    // Instructions field
    fireEvent.change(screen.getByPlaceholderText('Describe step 1...'), { target: { value: 'Mix in mug' } });

    // Tried & True checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    addRecipe.mockResolvedValue({ slug: 'easy-mug-cake' });

    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff & Save Recipe' });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(addRecipe).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Easy Mug Cake',
      slug: 'easy-mug-cake',
    }));
    expect(mockNavigate).toHaveBeenCalledWith('/recipe/easy-mug-cake');
  });

  it('preserves stepIngredients from extraction data and does not override with empty arrays', async () => {
    const mockExtractedData = {
      title: 'Greek Salad',
      description: 'A classic salad',
      prepTime: '10 mins',
      cookTime: '0 mins',
      servings: '4',
      ingredients: [
        { amount: '1', unit: '', item: 'cucumber' },
        { amount: '2', unit: 'tbsp', item: 'olive oil' },
      ],
      instructions: ['Chop the cucumber.', 'Drizzle with olive oil.'],
      stepIngredients: [[0], [1]], // pre-mapped by backend
    };

    extractRecipeFromUrl.mockResolvedValue(mockExtractedData);
    addRecipe.mockResolvedValue({ slug: 'greek-salad' });

    renderAddRecipe();

    const input = screen.getByPlaceholderText(/e.g. https:\/\/www.bonappetit.com/);
    const stripBtn = screen.getByRole('button', { name: 'Strip the Fluff' });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com/greek-salad' } });
      fireEvent.click(stripBtn);
    });

    await screen.findByText('Review & Save');

    // Check the Tried & True checkbox and submit
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff & Save Recipe' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // The backend-generated stepIngredients should be preserved, not replaced with []
    expect(addRecipe).toHaveBeenCalledWith(expect.objectContaining({
      stepIngredients: [[0], [1]],
    }));
  });

  it('automatically adjusts height of instruction textareas to match scrollHeight', async () => {
    // Mock scrollHeight of HTMLTextAreaElement
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return this.value.length * 5 + 40;
      },
    });

    try {
      renderAddRecipe();

      // Go directly to manual entry
      const manualBtn = screen.getByRole('button', { name: 'Write Recipe Manually' });
      await act(async () => {
        fireEvent.click(manualBtn);
      });

      const textarea = screen.getByPlaceholderText('Describe step 1...');
      expect(textarea).toBeInTheDocument();

      // Since value is empty initially, length is 0, scrollHeight mock returns 40
      expect(textarea.style.height).toBe('40px');

      // Change text to something longer to trigger change and auto-resize
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'This is a very long instruction step that will wrap and increase scrollHeight' } });
      });

      // value length is 77. 77 * 5 + 40 = 425
      expect(textarea.style.height).toBe('425px');
    } finally {
      // Restore original scrollHeight property
      if (originalScrollHeight) {
        Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originalScrollHeight);
      } else {
        delete HTMLTextAreaElement.prototype.scrollHeight;
      }
    }
  });

  it('handles cancel/abandon confirm and deny scenarios when editing', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderAddRecipe();

    // Go directly to manual entry
    const manualBtn = screen.getByRole('button', { name: 'Write Recipe Manually' });
    await act(async () => {
      fireEvent.click(manualBtn);
    });

    const backBtn = screen.getByText('← Back to options');

    // Case 1: User denies confirmation
    confirmSpy.mockReturnValueOnce(false);
    await act(async () => {
      fireEvent.click(backBtn);
    });
    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to abandon this recipe? Any unsaved changes will be lost.'
    );
    expect(screen.getByText('New Custom Recipe')).toBeInTheDocument();

    // Case 2: User confirms confirmation
    confirmSpy.mockReturnValueOnce(true);
    await act(async () => {
      fireEvent.click(backBtn);
    });
    expect(screen.getByText('Add a Recipe')).toBeInTheDocument();
  });

  it('shows an alert when recipe saving fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderAddRecipe();

    // Go to manual entry
    const manualBtn = screen.getByRole('button', { name: 'Write Recipe Manually' });
    await act(async () => {
      fireEvent.click(manualBtn);
    });

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Recipe Title/), { target: { value: 'Bad Recipe' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. fresh mozzarella'), { target: { value: 'sugar' } });
    fireEvent.change(screen.getByPlaceholderText('Describe step 1...'), { target: { value: 'eat it' } });
    fireEvent.click(screen.getByRole('checkbox'));

    addRecipe.mockRejectedValueOnce(new Error('Database Down'));

    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff & Save Recipe' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith('Failed to save recipe: Database Down');
    alertSpy.mockRestore();
  });

  it('triggers window beforeunload event correctly when editing', async () => {
    renderAddRecipe();

    // Go to manual entry
    const manualBtn = screen.getByRole('button', { name: 'Write Recipe Manually' });
    await act(async () => {
      fireEvent.click(manualBtn);
    });

    const event = new Event('beforeunload', { cancelable: true });
    vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('triggers router blocker confirmation modal when navigating away while editing', async () => {
    const router = createMemoryRouter(
      [
        { path: '/add', element: <AddRecipe /> },
        { path: '/other', element: <div>Other Page</div> }
      ],
      { initialEntries: ['/add'] }
    );

    render(<RouterProvider router={router} />);

    // Go to EDIT mode
    const manualBtn = screen.getByRole('button', { name: 'Write Recipe Manually' });
    await act(async () => {
      fireEvent.click(manualBtn);
    });

    // Try navigating to /other
    await act(async () => {
      router.navigate('/other');
    });

    // Blocker should be active, modal should be rendered
    expect(screen.getByText('Unsaved Recipe')).toBeInTheDocument();

    // Click "Keep Editing" -> blocker is reset, modal closes, remains on /add
    const keepEditingBtn = screen.getByRole('button', { name: 'Keep Editing' });
    await act(async () => {
      fireEvent.click(keepEditingBtn);
    });
    expect(screen.queryByText('Unsaved Recipe')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/add');

    // Try navigating to /other again
    await act(async () => {
      router.navigate('/other');
    });
    expect(screen.getByText('Unsaved Recipe')).toBeInTheDocument();

    // Click "Leave Page" -> blocker proceeds, navigates to /other
    const leavePageBtn = screen.getByRole('button', { name: 'Leave Page' });
    await act(async () => {
      fireEvent.click(leavePageBtn);
    });
    expect(screen.queryByText('Unsaved Recipe')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/other');
  });
});
