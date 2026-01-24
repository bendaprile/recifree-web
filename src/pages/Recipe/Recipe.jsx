import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import recipes from '../../data/recipes';
import './Recipe.css';

function Recipe() {
    const { id } = useParams();
    const [recipe, setRecipe] = useState(null);
    const [checkedIngredients, setCheckedIngredients] = useState([]);
    const [checkedSteps, setCheckedSteps] = useState([]);
    const [hoveredStep, setHoveredStep] = useState(null);
    const [hoveredStepY, setHoveredStepY] = useState(0);
    const [adjustedPopupY, setAdjustedPopupY] = useState(0);
    const popupRef = useRef(null);

    useEffect(() => {
        const foundRecipe = recipes.find(r => r.id === id);
        setRecipe(foundRecipe);
        setCheckedIngredients([]);
        setCheckedSteps([]);

        // Scroll to top when recipe loads
        window.scrollTo(0, 0);
    }, [id]);

    const toggleIngredient = (index) => {
        setCheckedIngredients(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const toggleStep = (index) => {
        setCheckedSteps(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const scrollToRecipe = () => {
        document.getElementById('ingredients')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Helper to get flat list of ingredients for indexed lookup
    const getFlatIngredients = () => {
        if (!recipe) return [];
        if (recipe.ingredients[0]?.items) {
            // Sectioned ingredients - flatten them
            return recipe.ingredients.flatMap(section => section.items);
        }
        return recipe.ingredients;
    };

    const flatIngredients = getFlatIngredients();

    // Dynamically adjust popup position based on actual height
    useLayoutEffect(() => {
        if (popupRef.current && hoveredStep !== null) {
            const popupHeight = popupRef.current.offsetHeight;
            const viewportHeight = window.innerHeight;
            const headerHeight = 80; // Space below header
            const padding = 20;

            // Calculate if popup would overflow bottom of viewport
            const wouldOverflow = hoveredStepY + popupHeight + padding > viewportHeight;

            if (wouldOverflow) {
                // Adjust Y to keep popup fully visible
                const adjusted = Math.max(headerHeight, viewportHeight - popupHeight - padding);
                setAdjustedPopupY(adjusted);
            } else {
                // Position next to the step
                setAdjustedPopupY(Math.max(headerHeight, hoveredStepY));
            }
        }
    }, [hoveredStep, hoveredStepY]);

    if (!recipe) {
        return (
            <div className="recipe-not-found">
                <div className="container">
                    <span className="not-found-icon">🔍</span>
                    <h1>Recipe Not Found</h1>
                    <p>Sorry, we couldn't find the recipe you're looking for.</p>
                    <Link to="/" className="btn btn-primary">
                        Browse All Recipes
                    </Link>
                </div>
            </div>
        );
    }

    const defaultImage = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&auto=format&fit=crop&q=80';

    return (
        <article className="recipe-page">
            {/* Hero Section */}
            <header className="recipe-hero">
                <div
                    className="recipe-hero-image"
                    style={{ backgroundImage: `url(${recipe.image || defaultImage})` }}
                >
                    <div className="recipe-hero-overlay"></div>
                </div>

                <div className="container">
                    <div className="recipe-hero-content">
                        <Link to="/" className="back-link">
                            ← Back to recipes
                        </Link>

                        <h1 className="recipe-title">{recipe.title}</h1>

                        {recipe.description && (
                            <p className="recipe-description">{recipe.description}</p>
                        )}

                        <div className="recipe-meta">
                            <div className="meta-card">
                                <span className="meta-label">Prep Time</span>
                                <span className="meta-value">{recipe.prepTime}</span>
                            </div>
                            <div className="meta-card">
                                <span className="meta-label">Cook Time</span>
                                <span className="meta-value">{recipe.cookTime}</span>
                            </div>
                            <div className="meta-card">
                                <span className="meta-label">Total Time</span>
                                <span className="meta-value">{recipe.totalTime}</span>
                            </div>
                            <div className="meta-card">
                                <span className="meta-label">Servings</span>
                                <span className="meta-value">{recipe.servings}</span>
                            </div>
                        </div>

                        <button onClick={scrollToRecipe} className="btn btn-primary jump-btn">
                            Jump to Recipe ↓
                        </button>
                    </div>
                </div>
            </header>

            <div className="recipe-content">
                <div className="container">
                    <div className="recipe-layout">
                        {/* Main Content */}
                        <div className="recipe-main">
                            {/* Ingredients */}
                            <section id="ingredients" className="recipe-section">
                                <h2 className="section-heading">
                                    <span className="heading-icon">🛒</span>
                                    Ingredients
                                </h2>
                                <p className="section-hint">Tap items to check them off</p>

                                {recipe.ingredients[0]?.items ? (
                                    // Sectioned Ingredients
                                    recipe.ingredients.map((section, sIndex) => (
                                        <div key={sIndex} className="ingredients-section">
                                            {section.title && <h3 className="ingredient-section-title">{section.title}</h3>}
                                            <ul className="ingredients-list">
                                                {section.items.map((ingredient, iIndex) => {
                                                    const uniqueId = `${sIndex}-${iIndex}`;
                                                    return (
                                                        <li
                                                            key={uniqueId}
                                                            className={`ingredient-item ${checkedIngredients.includes(uniqueId) ? 'checked' : ''}`}
                                                            onClick={() => toggleIngredient(uniqueId)}
                                                        >
                                                            <span className="ingredient-checkbox">
                                                                {checkedIngredients.includes(uniqueId) ? '✓' : ''}
                                                            </span>
                                                            <span className="ingredient-text">
                                                                {ingredient.amount && (
                                                                    <strong className="ingredient-amount">
                                                                        {ingredient.amount} {ingredient.unit}
                                                                    </strong>
                                                                )}
                                                                {' '}{ingredient.item}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))
                                ) : (
                                    // Flat List (Legacy Support)
                                    <ul className="ingredients-list">
                                        {recipe.ingredients.map((ingredient, index) => (
                                            <li
                                                key={index}
                                                className={`ingredient-item ${checkedIngredients.includes(index) ? 'checked' : ''}`}
                                                onClick={() => toggleIngredient(index)}
                                            >
                                                <span className="ingredient-checkbox">
                                                    {checkedIngredients.includes(index) ? '✓' : ''}
                                                </span>
                                                <span className="ingredient-text">
                                                    {ingredient.amount && (
                                                        <strong className="ingredient-amount">
                                                            {ingredient.amount} {ingredient.unit}
                                                        </strong>
                                                    )}
                                                    {' '}{ingredient.item}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {/* Instructions */}
                            <section className="recipe-section">
                                <h2 className="section-heading">
                                    <span className="heading-icon">👨‍🍳</span>
                                    Instructions
                                </h2>
                                <p className="section-hint">Tap steps to mark as complete</p>

                                <ol className="instructions-list">
                                    {recipe.instructions.map((step, index) => (
                                        <li
                                            key={index}
                                            className={`instruction-item ${checkedSteps.includes(index) ? 'checked' : ''}`}
                                            onClick={() => toggleStep(index)}
                                            onMouseEnter={(e) => {
                                                setHoveredStep(index);
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoveredStepY(rect.top);
                                            }}
                                            onMouseLeave={() => setHoveredStep(null)}
                                        >
                                            <span className="step-number">{index + 1}</span>
                                            <p className="step-text">{step}</p>
                                        </li>
                                    ))}
                                </ol>
                            </section>

                            {/* Nutrition (if available) */}
                            {recipe.nutrition && (
                                <section className="recipe-section nutrition-section">
                                    <h2 className="section-heading">
                                        <span className="heading-icon">📊</span>
                                        Nutrition (per serving)
                                    </h2>

                                    <div className="nutrition-grid">
                                        <div className="nutrition-item">
                                            <span className="nutrition-value">{recipe.nutrition.calories}</span>
                                            <span className="nutrition-label">Calories</span>
                                        </div>
                                        <div className="nutrition-item">
                                            <span className="nutrition-value">{recipe.nutrition.protein}</span>
                                            <span className="nutrition-label">Protein</span>
                                        </div>
                                        <div className="nutrition-item">
                                            <span className="nutrition-value">{recipe.nutrition.carbs}</span>
                                            <span className="nutrition-label">Carbs</span>
                                        </div>
                                        <div className="nutrition-item">
                                            <span className="nutrition-value">{recipe.nutrition.fat}</span>
                                            <span className="nutrition-label">Fat</span>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Source Attribution */}
                            {recipe.source && (
                                <div className="recipe-source">
                                    <p>
                                        Recipe adapted from{' '}
                                        <a
                                            href={recipe.source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="source-link"
                                        >
                                            {recipe.source.name}
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <aside className="recipe-sidebar">
                            <div className="sidebar-card">
                                <h3>Tags</h3>
                                <div className="sidebar-tags">
                                    {recipe.tags?.map((tag, index) => (
                                        <span key={index} className="tag">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="sidebar-card">
                                <h3>Difficulty</h3>
                                <span className={`difficulty-badge difficulty-${recipe.difficulty?.toLowerCase()}`}>
                                    {recipe.difficulty}
                                </span>
                            </div>

                            <div className="sidebar-card print-card">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => window.print()}
                                >
                                    🖨️ Print Recipe
                                </button>
                            </div>

                            {/* Step Ingredients Popup */}
                            {hoveredStep !== null && recipe.stepIngredients && recipe.stepIngredients[hoveredStep] && (
                                <div
                                    ref={popupRef}
                                    className="sidebar-card step-ingredients-card"
                                    style={{ top: `${adjustedPopupY}px` }}
                                >
                                    <h3>Step {hoveredStep + 1} Ingredients</h3>
                                    <ul className="step-ingredients-list">
                                        {recipe.stepIngredients[hoveredStep].map((ingredientIndex) => {
                                            const ingredient = flatIngredients[ingredientIndex];
                                            if (!ingredient) return null;
                                            return (
                                                <li key={ingredientIndex} className="step-ingredient-item">
                                                    {ingredient.amount && (
                                                        <span className="step-ingredient-amount">
                                                            {ingredient.amount} {ingredient.unit}
                                                        </span>
                                                    )}
                                                    <span className="step-ingredient-name">{ingredient.item}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
        </article>
    );
}

export default Recipe;
