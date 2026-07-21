import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ManualRecipeForm from './ManualRecipeForm';

describe('ManualRecipeForm Component', () => {
  const defaultInitialData = {
    title: 'Lemon Cake',
    description: 'Sweet and tangy cake',
    prepTime: '15 mins',
    cookTime: '30 mins',
    totalTime: '45 mins',
    servings: '8',
    difficulty: 'Easy',
    tags: ['Dessert', 'Baking'],
    ingredients: [
      {
        title: 'Cake batter',
        items: [
          { amount: '2', unit: 'cups', item: 'flour' },
          { amount: '1', unit: 'cup', item: 'sugar' }
        ]
      }
    ],
    instructions: ['Mix dry ingredients', 'Bake at 350F'],
    stepIngredients: [[0, 1], [0]]
  };

  it('populates fields correctly with initialData', () => {
    render(<ManualRecipeForm initialData={defaultInitialData} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/Recipe Title/)).toHaveValue('Lemon Cake');
    expect(screen.getByLabelText(/Description/)).toHaveValue('Sweet and tangy cake');
    expect(screen.getByLabelText(/Prep Time/)).toHaveValue('15 mins');
    expect(screen.getByLabelText(/Cook Time/)).toHaveValue('30 mins');
    expect(screen.getByLabelText(/Total Time/)).toHaveValue('45 mins');
    expect(screen.getByLabelText(/Servings/)).toHaveValue('8');
    expect(screen.getByLabelText(/Difficulty/)).toHaveValue('Easy');
    expect(screen.getByText('Dessert')).toBeInTheDocument();
    expect(screen.getByText('Baking')).toBeInTheDocument();

    // Check section title input and ingredient item inputs
    expect(screen.getByPlaceholderText('Section Title (e.g. For Sauce, Optional)')).toHaveValue('Cake batter');
    expect(screen.getByDisplayValue('flour')).toBeInTheDocument();
    expect(screen.getByDisplayValue('sugar')).toBeInTheDocument();

    // Check instructions textareas
    expect(screen.getByDisplayValue('Mix dry ingredients')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bake at 350F')).toBeInTheDocument();
  });

  it('supports legacy flat format ingredients from initialData', () => {
    const legacyData = {
      ...defaultInitialData,
      ingredients: [
        { amount: '1', unit: 'cup', item: 'water' }
      ]
    };
    render(<ManualRecipeForm initialData={legacyData} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByDisplayValue('water')).toBeInTheDocument();
  });

  it('automatically calculates total time when prep and cook times change', () => {
    render(<ManualRecipeForm onSave={vi.fn()} onCancel={vi.fn()} />);
    
    const prepInput = screen.getByLabelText(/Prep Time/);
    const cookInput = screen.getByLabelText(/Cook Time/);
    const totalInput = screen.getByLabelText(/Total Time/);

    fireEvent.change(prepInput, { target: { value: '12 mins' } });
    fireEvent.change(cookInput, { target: { value: '25 mins' } });

    expect(totalInput).toHaveValue('37 mins');
  });

  it('manages tags (adding and removing)', () => {
    render(<ManualRecipeForm onSave={vi.fn()} onCancel={vi.fn()} />);
    
    const tagInput = screen.getByPlaceholderText('e.g. Italian, Baking');
    
    // Add "Vegan" tag
    fireEvent.change(tagInput, { target: { value: 'Vegan' } });
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('Vegan')).toBeInTheDocument();

    // Add duplicate -> shouldn't add duplicate
    fireEvent.change(tagInput, { target: { value: 'Vegan' } });
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

    // Add with comma
    fireEvent.change(tagInput, { target: { value: 'Healthy,' } });
    fireEvent.keyDown(tagInput, { key: ',', code: 'Comma' });
    expect(screen.getByText('Healthy')).toBeInTheDocument();

    // Remove "Vegan" tag
    const veganSpan = screen.getByText('Vegan').closest('.form-tag-chip');
    const veganCloseBtn = veganSpan.querySelector('button');
    fireEvent.click(veganCloseBtn);
    expect(screen.queryByText('Vegan')).not.toBeInTheDocument();
  });

  it('manages ingredient sections and items (add/remove)', () => {
    render(<ManualRecipeForm onSave={vi.fn()} onCancel={vi.fn()} />);

    // Add Section
    const addSectionBtn = screen.getByRole('button', { name: '+ Add Ingredient Section' });
    fireEvent.click(addSectionBtn);

    const sectionHeaders = screen.getAllByPlaceholderText('Section Title (e.g. For Sauce, Optional)');
    expect(sectionHeaders).toHaveLength(2); // Initial section + new section

    // Edit new section header title
    fireEvent.change(sectionHeaders[1], { target: { value: 'Frosting' } });

    // Add Ingredient in second section
    const addIngredientBtns = screen.getAllByRole('button', { name: '+ Add Ingredient' });
    fireEvent.click(addIngredientBtns[1]);

    const nameInputs = screen.getAllByPlaceholderText('e.g. fresh mozzarella');
    expect(nameInputs).toHaveLength(3); // 1 in first section + 2 in second section

    // Change value of frosting ingredient
    fireEvent.change(nameInputs[2], { target: { value: 'icing sugar' } });

    // Remove first ingredient row in second section
    const removeIngredientBtns = screen.getAllByTitle('Remove ingredient');
    fireEvent.click(removeIngredientBtns[1]); // remove the empty row in Frosting section

    // Remove first section
    const removeSectionBtns = screen.getAllByRole('button', { name: 'Remove Section' });
    fireEvent.click(removeSectionBtns[0]);
    
    expect(screen.getAllByPlaceholderText('Section Title (e.g. For Sauce, Optional)')).toHaveLength(1);
    expect(screen.getByPlaceholderText('Section Title (e.g. For Sauce, Optional)')).toHaveValue('Frosting');
  });

  it('manages instruction steps (add/remove)', () => {
    render(<ManualRecipeForm onSave={vi.fn()} onCancel={vi.fn()} />);

    const stepInputs = screen.getAllByPlaceholderText(/Describe step/);
    expect(stepInputs).toHaveLength(1);

    // Add step
    const addStepBtn = screen.getByRole('button', { name: '+ Add Step' });
    fireEvent.click(addStepBtn);

    expect(screen.getAllByPlaceholderText(/Describe step/)).toHaveLength(2);

    // Write text to step 2
    fireEvent.change(screen.getAllByPlaceholderText(/Describe step/)[1], { target: { value: 'Eat it' } });

    // Remove step 1
    const removeStepBtns = screen.getAllByTitle('Remove step');
    fireEvent.click(removeStepBtns[0]);

    const remainingSteps = screen.getAllByPlaceholderText(/Describe step/);
    expect(remainingSteps).toHaveLength(1);
    expect(remainingSteps[0]).toHaveValue('Eat it');
  });

  it('validates fields on submit and fires onSave', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const mockOnSave = vi.fn();
    vi.useFakeTimers();

    const { container } = render(<ManualRecipeForm onSave={mockOnSave} onCancel={vi.fn()} />);

    // Bypass HTML5 validation so custom JS validation is invoked
    const form = container.querySelector('form');
    form.setAttribute('novalidate', 'true');

    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff & Save Recipe' });

    // 1. Submit without Tried & True signoff
    fireEvent.click(submitBtn);
    expect(mockOnSave).not.toHaveBeenCalled();
    // Fast forward warning shake timers
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Sign off Tried & True
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // 2. Submit with empty title
    fireEvent.click(submitBtn);
    expect(alertSpy).toHaveBeenCalledWith('Please provide a recipe title.');

    // Enter title
    const titleInput = screen.getByLabelText(/Recipe Title/);
    fireEvent.change(titleInput, { target: { value: 'Quick Toast' } });

    // 3. Submit with empty ingredients
    fireEvent.click(submitBtn);
    expect(alertSpy).toHaveBeenCalledWith('Please add at least one ingredient.');

    // Add ingredient item name
    const ingredientInput = screen.getByPlaceholderText('e.g. fresh mozzarella');
    fireEvent.change(ingredientInput, { target: { value: 'Bread' } });

    // 4. Submit with empty instructions
    fireEvent.click(submitBtn);
    expect(alertSpy).toHaveBeenCalledWith('Please add at least one instruction step.');

    // Add instruction step
    const stepInput = screen.getByPlaceholderText(/Describe step/);
    fireEvent.change(stepInput, { target: { value: 'Toast the bread' } });

    // 5. Successful submit
    fireEvent.click(submitBtn);
    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Quick Toast',
      ingredients: [
        {
          title: '',
          items: [{ amount: '', unit: '', item: 'Bread' }]
        }
      ],
      instructions: ['Toast the bread'],
      triedAndTrue: true
    }));

    alertSpy.mockRestore();
    vi.useRealTimers();
  });
});
