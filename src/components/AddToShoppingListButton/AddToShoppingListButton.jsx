import { useShoppingList } from '../../context/ShoppingListContext';
import './AddToShoppingListButton.css';

function AddToShoppingListButton({ recipe, variant = 'default', className = '' }) {
    const { addRecipe, removeRecipe, items } = useShoppingList();

    // Check if recipe is already in the list
    const isInList = items.some(item => item.recipeId === recipe.id);

    const handleClick = (e) => {
        e.preventDefault(); // Prevent navigation if inside a Link
        e.stopPropagation();

        if (isInList) {
            removeRecipe(recipe.id);
        } else {
            addRecipe(recipe);
        }
    };

    const getButtonContent = () => {
        if (isInList) {
            return (
                <>
                    <span className="btn-icon">✓</span>
                    {variant !== 'icon-only' && <span>Added!</span>}
                </>
            );
        }

        return (
            <>
                <span className="btn-icon plus-icon">+</span>
                {variant !== 'icon-only' && <span>Add to List</span>}
                {variant === 'icon-only' && <span className="tooltip">Add Ingredients to Shopping List</span>}
            </>
        );
    };

    return (
        <button
            onClick={handleClick}
            className={`add-to-list-btn ${variant} ${isInList ? 'added' : ''} ${className}`}
            title={isInList ? "Remove from shopping list" : "Add ingredients to shopping list"}
            aria-label={isInList ? "Remove from shopping list" : "Add ingredients to shopping list"}
        >
            {getButtonContent()}
        </button>
    );
}

export default AddToShoppingListButton;
