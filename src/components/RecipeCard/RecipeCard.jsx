import { Link } from 'react-router-dom';
import SaveRecipeButton from '../SaveRecipeButton/SaveRecipeButton';
import { ClockIcon, UsersIcon } from '../Icons/Icons';
import './RecipeCard.css';

function RecipeCard({ recipe }) {
    const { id, title, description, image, totalTime, servings, tags, difficulty } = recipe;

    // Placeholder image if none provided
    const defaultImage = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=60';

    return (
        <Link to={`/recipe/${id}`} className="recipe-card">
            {/* Outside .recipe-card-image on purpose: that element clips its
                overflow for the hover zoom, which would trap the list menu. */}
            <div className="card-actions">
                <SaveRecipeButton recipe={recipe} variant="icon-only" />
            </div>

            <div className="recipe-card-image">
                <img
                    src={image || defaultImage}
                    alt={title}
                    loading="lazy"
                    onError={(e) => {
                        e.target.src = defaultImage;
                    }}
                />
                {totalTime && (
                    <span className="card-badge">
                        <ClockIcon size={13} />
                        {totalTime}
                    </span>
                )}
            </div>

            <div className="recipe-card-content">
                {tags && tags.length > 0 && (
                    <div className="recipe-card-tags">
                        {tags.slice(0, 2).map((tag, index) => (
                            <span key={index} className="card-tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <h3 className="recipe-card-title">{title}</h3>

                {description && <p className="recipe-card-desc">{description}</p>}

                <div className="recipe-card-footer">
                    <span className="card-footer-servings">
                        <UsersIcon size={13} />
                        {servings} servings
                    </span>
                    {difficulty && (
                        <span className={`card-footer-difficulty difficulty-${difficulty.toLowerCase()}`}>
                            {difficulty}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

export default RecipeCard;
