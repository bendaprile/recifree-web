import { useState, useEffect } from 'react';
import './ManualRecipeForm.css';



const COMMON_UNITS = ['', 'g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cup', 'cups', 'pcs', 'pinch', 'slices', 'can', 'cans', 'pack', 'packs'];

function ManualRecipeForm({ initialData = null, onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState([]);
  
  // Ingredients structured as sections: [{ title: '', items: [{ amount: '', unit: '', item: '' }] }]
  const [ingredientSections, setIngredientSections] = useState([
    { title: '', items: [{ amount: '', unit: '', item: '' }] }
  ]);
  
  // Instructions as dynamic array of strings
  const [instructions, setInstructions] = useState(['']);



  // Tried & True Sign-off
  const [triedAndTrue, setTriedAndTrue] = useState(false);
  const [showSignoffShake, setShowSignoffShake] = useState(false);

  // Load initial data (e.g. from extraction)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setPrepTime(initialData.prepTime || '');
      setCookTime(initialData.cookTime || '');
      setTotalTime(initialData.totalTime || '');
      setServings(initialData.servings || '');
      setDifficulty(initialData.difficulty || 'Medium');
      setTags(initialData.tags || []);
      
      if (initialData.ingredients && initialData.ingredients.length > 0) {
        // Map ingredients to sections
        if (initialData.ingredients[0].items) {
          setIngredientSections(initialData.ingredients.map(sec => ({
            title: sec.title || '',
            items: sec.items.map(item => ({
              amount: item.amount || '',
              unit: item.unit || '',
              item: item.item || ''
            }))
          })));
        } else {
          // Flat list legacy support
          setIngredientSections([{
            title: '',
            items: initialData.ingredients.map(item => ({
              amount: item.amount || '',
              unit: item.unit || '',
              item: item.item || ''
            }))
          }]);
        }
      }

      if (initialData.instructions && initialData.instructions.length > 0) {
        setInstructions(initialData.instructions);
      }


    }
  }, [initialData]);

  // Handle auto-total time computation
  useEffect(() => {
    // Basic auto-calculation if prep and cook times are simple integers
    const prepMatch = prepTime.match(/^(\d+)/);
    const cookMatch = cookTime.match(/^(\d+)/);
    if (prepMatch && cookMatch && !totalTime) {
      const sum = parseInt(prepMatch[1]) + parseInt(cookMatch[1]);
      setTotalTime(`${sum} mins`);
    }
  }, [prepTime, cookTime, totalTime]);

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleanTag = tagsInput.trim().replace(/,/g, '');
      if (cleanTag && !tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
      }
      setTagsInput('');
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  // Section Handlers
  const handleAddSection = () => {
    setIngredientSections([...ingredientSections, { title: '', items: [{ amount: '', unit: '', item: '' }] }]);
  };

  const handleRemoveSection = (sectionIndex) => {
    setIngredientSections(ingredientSections.filter((_, idx) => idx !== sectionIndex));
  };

  const handleSectionTitleChange = (sectionIndex, newTitle) => {
    const updated = [...ingredientSections];
    updated[sectionIndex].title = newTitle;
    setIngredientSections(updated);
  };

  // Ingredient Item Handlers
  const handleAddIngredient = (sectionIndex) => {
    const updated = [...ingredientSections];
    updated[sectionIndex].items.push({ amount: '', unit: '', item: '' });
    setIngredientSections(updated);
  };

  const handleRemoveIngredient = (sectionIndex, itemIndex) => {
    const updated = [...ingredientSections];
    updated[sectionIndex].items = updated[sectionIndex].items.filter((_, idx) => idx !== itemIndex);
    setIngredientSections(updated);
  };

  const handleIngredientChange = (sectionIndex, itemIndex, field, value) => {
    const updated = [...ingredientSections];
    updated[sectionIndex].items[itemIndex][field] = value;
    setIngredientSections(updated);
  };

  // Instruction Handlers
  const handleAddStep = () => {
    setInstructions([...instructions, '']);
  };

  const handleRemoveStep = (index) => {
    setInstructions(instructions.filter((_, idx) => idx !== index));
  };

  const handleStepChange = (index, value) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!triedAndTrue) {
      setShowSignoffShake(true);
      setTimeout(() => setShowSignoffShake(false), 800);
      return;
    }

    // Basic Validation
    if (!title.trim()) {
      alert("Please provide a recipe title.");
      return;
    }

    // Filter empty ingredients out of sections
    const formattedIngredients = ingredientSections
      .map(section => ({
        title: section.title.trim(),
        items: section.items
          .map(item => ({
            amount: item.amount.trim(),
            unit: item.unit.trim(),
            item: item.item.trim()
          }))
          .filter(item => item.item !== '')
      }))
      .filter(section => section.items.length > 0);

    if (formattedIngredients.length === 0) {
      alert("Please add at least one ingredient.");
      return;
    }

    const formattedInstructions = instructions
      .map(step => step.trim())
      .filter(step => step !== '');

    if (formattedInstructions.length === 0) {
      alert("Please add at least one instruction step.");
      return;
    }



    // Generate unique ID / slug base
    const slugBase = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const recipePayload = {
      id: slugBase,
      slug: slugBase,
      title: title.trim(),
      description: description.trim(),
      prepTime: prepTime.trim() || '10 mins',
      cookTime: cookTime.trim() || '0 mins',
      totalTime: totalTime.trim() || `${parseInt(prepTime) + parseInt(cookTime) || 10} mins`,
      servings: servings.trim() || '4',
      difficulty,
      tags,
      ingredients: formattedIngredients,
      instructions: formattedInstructions,
      stepIngredients: formattedInstructions.map(() => []), // empty links for manual entries
      image: initialData?.image || '',
      triedAndTrue: true,
      source: initialData?.source || {
        name: "Recifree Community",
        url: window.location.origin
      }
    };

    onSave(recipePayload);
  };

  return (
    <form onSubmit={handleSubmit} className="manual-recipe-form animate-slide-up">
      <div className="form-section-card">
        <h3 className="section-title">Recipe Basics</h3>
        
        <div className="form-grid-columns-2">
          <div className="form-group span-2">
            <label htmlFor="recipe-title">Recipe Title <span className="text-error">*</span></label>
            <input
              id="recipe-title"
              type="text"
              className="text-input"
              placeholder="e.g. Classic Margherita Pizza"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group span-2">
            <label htmlFor="recipe-desc">Short Description</label>
            <textarea
              id="recipe-desc"
              className="text-input textarea-input"
              placeholder="Give a quick summary of what makes this recipe incredible..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="recipe-prep">Prep Time</label>
            <input
              id="recipe-prep"
              type="text"
              className="text-input font-mono"
              placeholder="e.g. 15 mins"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="recipe-cook">Cook Time</label>
            <input
              id="recipe-cook"
              type="text"
              className="text-input font-mono"
              placeholder="e.g. 30 mins"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="recipe-total">Total Time</label>
            <input
              id="recipe-total"
              type="text"
              className="text-input font-mono"
              placeholder="e.g. 45 mins"
              value={totalTime}
              onChange={(e) => setTotalTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="recipe-servings">Servings</label>
            <input
              id="recipe-servings"
              type="text"
              className="text-input font-mono"
              placeholder="e.g. 4"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="recipe-difficulty">Difficulty</label>
            <select
              id="recipe-difficulty"
              className="text-input select-input"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="recipe-tags">Tags <span className="hint-label">(press Enter to add)</span></label>
            <div className="tags-input-container">
              <input
                id="recipe-tags"
                type="text"
                className="text-input"
                placeholder="e.g. Italian, Baking"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
              {tags.length > 0 && (
                <div className="form-tags-list">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="form-tag-chip">
                      {tag}
                      <button type="button" className="remove-tag-btn" onClick={() => handleRemoveTag(idx)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients Section */}
      <div className="form-section-card">
        <div className="section-header-flex">
          <h3 className="section-title">Ingredients</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddSection}>
            + Add Ingredient Section
          </button>
        </div>

        {ingredientSections.map((section, sIdx) => (
          <div key={sIdx} className="form-ingredient-section">
            <div className="section-title-input-row">
              <input
                type="text"
                className="text-input section-title-input"
                placeholder="Section Title (e.g. For Sauce, Optional)"
                value={section.title}
                onChange={(e) => handleSectionTitleChange(sIdx, e.target.value)}
              />
              {ingredientSections.length > 1 && (
                <button type="button" className="remove-section-btn" onClick={() => handleRemoveSection(sIdx)}>
                  Remove Section
                </button>
              )}
            </div>

            <div className="ingredient-items-list">
              <div className="ingredients-header-row">
                <span className="header-label span-width-amount">Amount</span>
                <span className="header-label span-width-unit">Unit</span>
                <span className="header-label span-width-name">Ingredient Name</span>
                <span className="header-label span-width-action"></span>
              </div>

              {section.items.map((item, iIdx) => (
                <div key={iIdx} className="ingredient-item-row">
                  <input
                    type="text"
                    className="text-input font-mono text-center span-width-amount"
                    placeholder="e.g. 2"
                    value={item.amount}
                    onChange={(e) => handleIngredientChange(sIdx, iIdx, 'amount', e.target.value)}
                  />
                  <select
                    className="text-input select-input font-mono span-width-unit"
                    value={item.unit}
                    onChange={(e) => handleIngredientChange(sIdx, iIdx, 'unit', e.target.value)}
                  >
                    {COMMON_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit || 'none'}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="text-input span-width-name"
                    placeholder="e.g. fresh mozzarella"
                    value={item.item}
                    onChange={(e) => handleIngredientChange(sIdx, iIdx, 'item', e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="remove-row-btn span-width-action"
                    onClick={() => handleRemoveIngredient(sIdx, iIdx)}
                    title="Remove ingredient"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="btn btn-outline btn-sm add-row-btn" onClick={() => handleAddIngredient(sIdx)}>
              + Add Ingredient
            </button>
          </div>
        ))}
      </div>

      {/* Instructions Section */}
      <div className="form-section-card">
        <h3 className="section-title">Instructions</h3>

        <div className="instructions-editor-list">
          {instructions.map((step, idx) => (
            <div key={idx} className="instruction-step-row">
              <span className="step-number font-mono">{idx + 1}</span>
              <textarea
                className="text-input textarea-input instruction-textarea"
                placeholder={`Describe step ${idx + 1}...`}
                value={step}
                onChange={(e) => handleStepChange(idx, e.target.value)}
                rows={2}
                required
              />
              <button
                type="button"
                className="remove-row-btn"
                onClick={() => handleRemoveStep(idx)}
                disabled={instructions.length <= 1}
                title="Remove step"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-outline btn-sm add-step-btn" onClick={handleAddStep}>
          + Add Step
        </button>
      </div>



      {/* Tried & True Sign-off & Submit block */}
      <div className={`form-section-card tried-true-card ${showSignoffShake ? 'card-shake' : ''}`}>
        <div className="tried-true-checkbox-row">
          <label className="checkbox-label-container">
            <input
              type="checkbox"
              className="real-checkbox"
              checked={triedAndTrue}
              onChange={(e) => setTriedAndTrue(e.target.checked)}
            />
            <span className="custom-checkbox"></span>
            <span className="checkbox-text">
              <strong>I have actually cooked this, and it is delicious. <span className="text-error">*</span></strong>
              <p className="checkbox-subtext">
                Recifree is an ad-free culinary sanctuary. We require every contributor to sign off that they have personally taste-tested and loved this recipe.
              </p>
            </span>
          </label>
        </div>
      </div>

      <div className="form-action-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className={`btn btn-primary submit-recipe-btn ${!triedAndTrue ? 'btn-disabled' : ''}`}
        >
          Strip the Fluff & Save Recipe
        </button>
      </div>
    </form>
  );
}

export default ManualRecipeForm;
