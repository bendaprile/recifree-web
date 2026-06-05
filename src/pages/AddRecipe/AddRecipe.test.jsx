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
});
