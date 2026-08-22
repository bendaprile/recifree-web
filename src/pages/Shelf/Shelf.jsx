import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useShelf } from '../../context/ShelfContext';
import { useAuth } from '../../context/AuthContext';
import { getRecipeBySlug } from '../../services/recipeService';
import RecipeCard from '../../components/RecipeCard/RecipeCard';
import { NotepadIcon, TrashIcon } from '../../components/Icons/Icons';
import './Shelf.css';

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'private', label: 'Private' },
    { key: 'published', label: 'Published' }
];

/**
 * The private shelf: recipes this user extracted but has not published.
 * Nobody else can see anything on this page.
 */
function Shelf() {
    const { privateRecipes, publishedRefs, loading, unshelveRecipe, isAtRisk } = useShelf();
    const { currentUser } = useAuth();
    const [filter, setFilter] = useState('all');
    const [publishedRecipes, setPublishedRecipes] = useState([]);
    const [resolving, setResolving] = useState(false);

    // A published entry holds only a slug. Resolve it against the catalog so the
    // shelf shows the live recipe rather than a stale copy of it.
    const slugKey = useMemo(
        () => publishedRefs.map(r => r.slug).sort().join(','),
        [publishedRefs]
    );

    useEffect(() => {
        let active = true;
        const slugs = slugKey ? slugKey.split(',') : [];
        if (slugs.length === 0) {
            setPublishedRecipes([]);
            return () => { active = false; };
        }

        setResolving(true);
        Promise.all(slugs.map(slug =>
            getRecipeBySlug(slug)
                // Carry the slug we resolved with rather than trusting the
                // document to echo it back; it is what the card links to.
                .then(found => (found ? { ...found, slug } : null))
                .catch(() => null)
        ))
            .then(results => {
                // A recipe an admin removed resolves to nothing. Drop it rather
                // than rendering a broken card.
                if (active) setPublishedRecipes(results.filter(Boolean));
            })
            .finally(() => { if (active) setResolving(false); });

        return () => { active = false; };
    }, [slugKey]);

    const handleRemove = (e, recipeId) => {
        // The card is a Link; without this the click navigates instead of deleting.
        e.preventDefault();
        e.stopPropagation();
        unshelveRecipe(recipeId);
    };

    const publishedCards = publishedRecipes.map(r => ({ ...r, isPublished: true }));
    const allCards = [...privateRecipes, ...publishedCards];
    const total = allCards.length;

    const visible = filter === 'private'
        ? privateRecipes
        : filter === 'published'
            ? publishedCards
            : allCards;

    const countFor = (key) =>
        key === 'private' ? privateRecipes.length
            : key === 'published' ? publishedCards.length
                : total;

    if (loading || resolving) {
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

                {total === 0 ? (
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
                        {publishedRecipes.length > 0 && (
                            <div className="shelf-filters" role="tablist" aria-label="Filter your shelf">
                                {FILTERS.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={filter === key}
                                        className={`shelf-filter${filter === key ? ' is-active' : ''}`}
                                        onClick={() => setFilter(key)}
                                    >
                                        {label}
                                        <span className="shelf-filter-count">{countFor(key)}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <p className="shelf-count">
                            {visible.length} {visible.length === 1 ? 'recipe' : 'recipes'}
                            {currentUser ? ' · synced to your account' : ' · on this device only'}
                        </p>

                        {visible.length === 0 ? (
                            <p className="shelf-empty-filter">Nothing here yet.</p>
                        ) : (
                            <div className="recipe-grid">
                                {visible.map(recipe => (
                                    <RecipeCard
                                        key={recipe.id}
                                        recipe={recipe}
                                        to={recipe.isPublished ? `/recipe/${recipe.slug}` : `/shelf/${recipe.id}`}
                                        actions={recipe.isPublished ? (
                                            // Published recipes cannot be pulled back.
                                            // Removing the reference would only hide the
                                            // author's own record of it.
                                            <span className="shelf-published-badge" title="Published to Recifree">
                                                Live
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="shelf-remove-btn"
                                                aria-label={`Remove ${recipe.title} from your shelf`}
                                                onClick={(e) => handleRemove(e, recipe.id)}
                                            >
                                                <TrashIcon size={16} />
                                            </button>
                                        )}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default Shelf;
