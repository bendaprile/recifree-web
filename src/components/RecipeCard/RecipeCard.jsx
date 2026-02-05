import { Link } from 'react-router-dom';
import AddToShoppingListButton from '../AddToShoppingListButton/AddToShoppingListButton';
import { ClockIcon, UsersIcon } from '../Icons/Icons';
import './RecipeCard.css';

function RecipeCard({ recipe }) {
    const { id, title, image, totalTime, servings, tags, difficulty } = recipe;

    // Placeholder image if none provided
    const defaultImage = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&auto=format&fit=crop&q=60';

    return (
        <Link to={`/recipe/${id}`} className="recipe-card">
            <div className="recipe-card-image">
                <img
                    src={image || defaultImage}
                    alt={title}
                    loading="lazy"
                    onError={(e) => {
                        e.target.src = defaultImage;
                    }}
                />
                <div className="card-actions">
                    <AddToShoppingListButton recipe={recipe} variant="icon-only" />
                </div>
                {difficulty && (
                    <span className={`recipe-difficulty difficulty-${difficulty.toLowerCase()}`}>
                        {difficulty}
                    </span>
                )}
            </div>

            <div className="recipe-card-content">
                <h3 className="recipe-card-title">{title}</h3>

                <div className="recipe-card-meta">
                    <div className="meta-item">
                        <ClockIcon size={16} className="meta-icon" />
                        <span>{totalTime}</span>
                    </div>
                    <div className="meta-item">
                        <UsersIcon size={16} className="meta-icon" />
                        <span>{servings} servings</span>
                    </div>
                </div>

                {tags && tags.length > 0 && (
                    <div className="recipe-card-tags">
                        {tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
}

export default RecipeCard;
