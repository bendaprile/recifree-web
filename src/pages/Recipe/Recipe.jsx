import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { getRecipeBySlug } from '../../services/recipeService';
import { useShelf } from '../../context/ShelfContext';
import { useAuth } from '../../context/AuthContext';
import { deleteRecipe as deleteRecipeFromCatalog } from '../../services/adminService';
import PublishPanel from '../../components/PublishPanel/PublishPanel';
import AddToShoppingListButton from '../../components/AddToShoppingListButton/AddToShoppingListButton';
import SaveRecipeButton from '../../components/SaveRecipeButton/SaveRecipeButton';
import { PrinterIcon, PlateIcon } from '../../components/Icons/Icons';
import SourceAttribution from '../../components/SourceAttribution/SourceAttribution';
import Reviews from '../../components/Reviews/Reviews';
import IngredientList from '../../components/IngredientList/IngredientList';
import { scaleAmount } from '../../utils/recipeScaler';
import './Recipe.css';

/**
 * The SSR hydration payload comes from the raw Firestore document and does not
 * pass through recipeService's mapping, where stepIngredients is parsed back
 * from its stored JSON string. Guard here as well as at the producer: a string
 * reaching the renderer takes the whole page down with a .map error.
 */
function normalizeHydratedRecipe(data) {
    if (typeof data?.stepIngredients !== 'string') return data;

    try {
        return { ...data, stepIngredients: JSON.parse(data.stepIngredients) };
    } catch {
        return { ...data, stepIngredients: [] };
    }
}

/**
 * @param {boolean} [fromShelf]  Read the recipe from the user's private shelf
 *                               instead of the public catalog. Set by the
 *                               /shelf/:id route only.
 */
function Recipe({ fromShelf = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // Shelf recipes are private and live outside the public `recipes` collection.
    // The route decides which source to read, so a private recipe can never be
    // served from the public /recipe/:id URL.
    const { shelf, loading: shelfLoading, markPublished } = useShelf();
    const { isAdmin } = useAuth();
    const [deleting, setDeleting] = useState(false);

    // Initialize state from window.__INITIAL_RECIPE__ if it exists (SSR Hydration)
    const [recipe, setRecipe] = useState(() => {
        if (typeof window !== 'undefined' && window.__INITIAL_RECIPE__) {
            const data = window.__INITIAL_RECIPE__;
            if (data.slug === id || data.id === id) return normalizeHydratedRecipe(data);
        }
        return null;
    });

    const [loading, setLoading] = useState(() => !recipe);
    const [checkedIngredients, setCheckedIngredients] = useState([]);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [hoveredStepIndex, setHoveredStepIndex] = useState(null);
    const [currentScale, setCurrentScale] = useState(1);
    // The photo chosen in the publish bar, shown as the hero background so the
    // user sees the published article before committing to it.
    const [publishPreview, setPublishPreview] = useState('');

    useEffect(() => {
        if (recipe && (recipe.slug === id || recipe.id === id)) {
            setLoading(false);
        } else {
            setLoading(true);
            setRecipe(null);
            setCheckedIngredients([]);
            setActiveStepIndex(0);
            setHoveredStepIndex(null);
            setCurrentScale(1);

            if (fromShelf) {
                // Wait for the shelf to load before deciding the recipe is missing.
                if (!shelfLoading) {
                    setRecipe(shelf.find(r => r.id === id) || null);
                    setLoading(false);
                }
            } else {
                getRecipeBySlug(id)
                    .then(setRecipe)
                    .finally(() => setLoading(false));
            }
        }

        window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, fromShelf, shelfLoading]);

    const toggleIngredient = (index) => {
        setCheckedIngredients(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const handleBack = (e) => {
        e.preventDefault();
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    // Helper to get flat list of ingredients for indexed lookup
    const getFlatIngredients = () => {
        if (!recipe) return [];
        if (recipe.ingredients[0]?.items) {
            return recipe.ingredients.flatMap(section => section.items);
        }
        return recipe.ingredients;
    };

    // Determine effective step index for highlighting: hovered step takes precedence, else active step
    const effectiveStepIndex = hoveredStepIndex !== null ? hoveredStepIndex : activeStepIndex;

    // Get ingredient indices used in the effective step
    const getStepIngredientIds = (stepIndex) => {
        if (stepIndex === null || stepIndex === undefined || !recipe?.stepIngredients?.[stepIndex]) return [];
        return recipe.stepIngredients[stepIndex].map(entry =>
            typeof entry === 'object' && entry !== null ? entry.id : entry
        );
    };

    const highlightedIngredientIds = getStepIngredientIds(effectiveStepIndex);

    if (loading) {
        return (
            <div className="recipe-not-found">
                <div className="container">
                    <div className="recipe-loading-skeleton" role="status" aria-label="Loading recipe" />
                </div>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="recipe-not-found">
                <div className="container">
                    <PlateIcon size={48} className="not-found-icon" />
                    <h1>Recipe Not Found</h1>
                    <p>Sorry, we couldn't find the recipe you're looking for.</p>
                    <Link to="/" className="btn btn-primary">
                        Browse All Recipes
                    </Link>
                </div>
            </div>
        );
    }

    // Recipes carry a photo only once someone has cooked and published them, so
    // an unpublished one legitimately has none. Falling back to a stock photo of
    // a different dish would undercut the Tried & True promise, so the header
    // drops to a flat editorial treatment instead.
    // Catalog removal is admin-only and enforced server-side; isAdmin only
    // decides whether the control is offered. Required for DMCA takedowns.
    const handleAdminDelete = async () => {
        const confirmed = window.confirm(
            `Remove "${recipe.title}" from the public catalog? This cannot be undone.`
        );
        if (!confirmed) return;

        setDeleting(true);
        try {
            await deleteRecipeFromCatalog(recipe.slug || recipe.id);
            navigate('/');
        } catch (err) {
            setDeleting(false);
            alert(`Could not remove the recipe: ${err.message}`);
        }
    };

    const heroImage = recipe.image || publishPreview;
    const hasHeroImage = Boolean(heroImage);

    return (
        <div className="recipe-page-container">
            <article className="swiss-wrapper">

                {/* Paste deduplication landed the user here: they pasted a
                    URL someone had already published. Without a word of
                    explanation, a paste that silently becomes a different
                    page reads as a bug. */}
                {location.state?.alreadyPublished && (
                    <div className="duplicate-paste-notice">
                        <p>
                            <strong>Recifree already had this one.</strong>{' '}
                            {location.state.alreadyPublished.saved
                                ? 'We added it to your saved recipes instead of making a second copy.'
                                : 'It is already in your saved recipes, so nothing was copied.'}
                        </p>
                    </div>
                )}

                {fromShelf && (
                    <PublishPanel
                        recipe={recipe}
                        onPreviewChange={setPublishPreview}
                        onPublished={async (slug) => {
                            // Keep the shelf entry, but as a reference. One copy
                            // of the recipe, and the author can still find it.
                            await markPublished(recipe.id, slug);
                            navigate(`/recipe/${slug}`);
                        }}
                    />
                )}

                {/* HYBRID HERO OVERLAY HEADER */}
                <header
                    className={`hero-overlay-header${hasHeroImage ? '' : ' hero-overlay-header--flat'}`}
                    style={hasHeroImage ? { backgroundImage: `url('${heroImage}')` } : undefined}
                >
                    {hasHeroImage && <div className="hero-overlay-backdrop"></div>}

                    <div className="hero-overlay-content">
                        <div className="hero-top-nav">
                            <Link to="/" className="hero-back-link" onClick={handleBack}>
                                ← Back to recipes
                            </Link>

                            {recipe.triedAndTrue && (
                                <div className="hero-tried-true-badge" title="Tried & True: Kitchen-tested & verified tasty!">
                                    ✓ Tried & True
                                </div>
                            )}
                        </div>

                        <h1 className="hero-title">{recipe.title}</h1>

                        {/* Half of the dual attribution. The other half, the
                            site this came from, is credited by SourceAttribution
                            at the foot of the page. */}
                        {recipe.publishedByName && (
                            <p className="hero-byline">
                                Cooked and published by <strong>{recipe.publishedByName}</strong>
                            </p>
                        )}

                        {recipe.description && (
                            <p className="hero-description">{recipe.description}</p>
                        )}

                        <div className="hero-meta-row">
                            <div className="hero-badges">
                                {recipe.prepTime && (
                                    <div>
                                        Prep: <strong>{recipe.prepTime}</strong>
                                    </div>
                                )}
                                {recipe.cookTime && (
                                    <div>
                                        Cook: <strong>{recipe.cookTime}</strong>
                                    </div>
                                )}
                                {recipe.totalTime && (
                                    <div>
                                        Total: <strong>{recipe.totalTime}</strong>
                                    </div>
                                )}
                                {recipe.servings && (
                                    <div>
                                        Yield: <strong>{typeof recipe.servings === 'number' ? recipe.servings * currentScale : recipe.servings} Servings</strong>
                                    </div>
                                )}
                            </div>

                            <div className="hero-actions">
                                <button className="hero-btn" onClick={() => window.print()}>
                                    <PrinterIcon size={16} /> Print Recipe
                                </button>
                                {/* Saving stores only a recipe id, which SavedRecipes later
                                    resolves through getRecipeBySlug. A shelf recipe is not in
                                    the public catalog, so the save would resolve to nothing and
                                    silently vanish from the saved list. Publish it first. */}
                                {!fromShelf && (
                                    <SaveRecipeButton recipe={recipe} variant="large" className="hero-action-btn" />
                                )}
                                <AddToShoppingListButton recipe={recipe} variant="large" className="hero-action-btn" />
                                {isAdmin && !fromShelf && (
                                    <button
                                        type="button"
                                        className="hero-btn hero-admin-delete"
                                        onClick={handleAdminDelete}
                                        disabled={deleting}
                                    >
                                        {deleting ? 'Removing…' : 'Remove from catalog'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* SWISS EDITORIAL 2-COLUMN BODY CONTENT */}
                <div className="swiss-body-content">
                    <div className="swiss-grid">

                        {/* Ingredients Column */}
                        <div className="swiss-ingredients-panel" id="ingredients">
                            <div className="swiss-panel-title">
                                <span>Ingredients</span>
                                <div className="swiss-scaler">
                                    <button
                                        className={`swiss-scale-btn ${currentScale === 1 ? 'active' : ''}`}
                                        onClick={() => setCurrentScale(1)}
                                    >
                                        1x
                                    </button>
                                    <button
                                        className={`swiss-scale-btn ${currentScale === 2 ? 'active' : ''}`}
                                        onClick={() => setCurrentScale(2)}
                                    >
                                        2x
                                    </button>
                                    <button
                                        className={`swiss-scale-btn ${currentScale === 3 ? 'active' : ''}`}
                                        onClick={() => setCurrentScale(3)}
                                    >
                                        3x
                                    </button>
                                </div>
                            </div>

                            <IngredientList
                                ingredients={recipe.ingredients}
                                checkedIngredients={checkedIngredients}
                                highlightedIngredientIds={highlightedIngredientIds}
                                currentScale={currentScale}
                                onToggleIngredient={toggleIngredient}
                            />
                        </div>

                        {/* Instructions Column */}
                        <div className="swiss-instructions-panel" id="instructions">
                            <div className="swiss-panel-title">
                                <span>Instructions</span>
                            </div>

                            <div className="swiss-step-list">
                                {recipe.instructions.map((stepText, index) => {
                                    const stepNumStr = String(index + 1).padStart(2, '0');
                                    const isActive = activeStepIndex === index;

                                    return (
                                        <div
                                            key={index}
                                            className={`swiss-step-card ${isActive ? 'active' : ''}`}
                                            onClick={() => setActiveStepIndex(index)}
                                            onMouseEnter={() => setHoveredStepIndex(index)}
                                            onMouseLeave={() => setHoveredStepIndex(null)}
                                            data-testid={`instruction-item-${index}`}
                                        >
                                            <div className="swiss-step-num">{stepNumStr}</div>
                                            <div className="swiss-step-content">
                                                {stepText}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Nutrition (if available) */}
                    {recipe.nutrition && (
                        <section className="recipe-section nutrition-section">
                            <h2 className="section-heading">
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

                    {/* Reviews are keyed on the slug and read from the public
                        catalog, so a shelf draft has nothing to show and nobody
                        to show it to. Suppressed there for the same reason Save
                        is. */}
                    {!fromShelf && <Reviews slug={recipe.slug} />}

                    {/* Source Attribution */}
                    <SourceAttribution source={recipe.source} />

                </div>

            </article>
        </div>
    );
}

export default Recipe;
