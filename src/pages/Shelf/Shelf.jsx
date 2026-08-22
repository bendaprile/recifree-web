import { Link } from 'react-router-dom';
import { useShelf } from '../../context/ShelfContext';
import { useAuth } from '../../context/AuthContext';
import RecipeCard from '../../components/RecipeCard/RecipeCard';
import { NotepadIcon, TrashIcon } from '../../components/Icons/Icons';
import './Shelf.css';

/**
 * The private shelf: recipes this user extracted but has not published.
 * Nobody else can see anything on this page.
 */
function Shelf() {
    const { shelf, loading, unshelveRecipe, isAtRisk } = useShelf();
    const { currentUser } = useAuth();

    const handleRemove = (e, recipeId) => {
        // The card is a Link; without this the click navigates instead of deleting.
        e.preventDefault();
        e.stopPropagation();
        unshelveRecipe(recipeId);
    };

    if (loading) {
        return (
            <div className="shelf-page section">
                <div className="container">
                    <div className="skeleton-header" />
                    <div className="recipe-grid-loading mt-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="recipe-card-skeleton" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="shelf-page section">
            <div className="container">
                <div className="shelf-header">
                    <h1>Your Shelf</h1>
                    <p className="shelf-subtitle">
                        Recipes you've pulled in, private to you. Cook one, then publish it
                        with your own photo when you're ready to share it.
                    </p>
                </div>

                {isAtRisk && (
                    <div className="shelf-risk-banner" role="alert">
                        <div className="shelf-risk-copy">
                            <strong>These recipes only exist on this device.</strong>
                            <span>
                                Clear your browser and they're gone. An account keeps them
                                synced — no newsletters, no tracking.
                            </span>
                        </div>
                        <Link to="/signup" className="btn btn-primary shelf-risk-action">
                            Keep them
                        </Link>
                    </div>
                )}

                {shelf.length === 0 ? (
                    <div className="empty-shelf-state text-center">
                        <div className="empty-icon-wrapper">
                            <NotepadIcon size={48} className="empty-icon" />
                        </div>
                        <h2>Nothing on the shelf yet</h2>
                        <p>Paste a recipe link and it lands here, stripped of the fluff.</p>
                        <Link to="/add" className="btn btn-primary mt-4">Extract a Recipe</Link>
                    </div>
                ) : (
                    <>
                        <p className="shelf-count">
                            {shelf.length} {shelf.length === 1 ? 'recipe' : 'recipes'}
                            {currentUser ? ' · synced to your account' : ' · on this device only'}
                        </p>
                        <div className="recipe-grid">
                            {shelf.map(recipe => (
                                <RecipeCard
                                    key={recipe.id}
                                    recipe={recipe}
                                    to={`/shelf/${recipe.id}`}
                                    actions={
                                        <button
                                            type="button"
                                            className="shelf-remove-btn"
                                            aria-label={`Remove ${recipe.title} from your shelf`}
                                            onClick={(e) => handleRemove(e, recipe.id)}
                                        >
                                            <TrashIcon size={16} />
                                        </button>
                                    }
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Shelf;
