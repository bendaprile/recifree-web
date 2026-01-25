import { Link } from 'react-router-dom';
import { useShoppingList } from '../../context/ShoppingListContext';
import './ShoppingList.css';

function ShoppingList() {
    const { items, toggleItem, removeItem, removeRecipe, clearList, itemCount } = useShoppingList();

    if (items.length === 0) {
        return (
            <div className="shopping-list-page section">
                <div className="container">
                    <div className="empty-list">
                        <span className="empty-icon">📝</span>
                        <h2>Your shopping list is empty</h2>
                        <p>Start adding ingredients from our delicious recipes!</p>
                        <Link to="/" className="btn btn-primary">
                            Browse Recipes
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="shopping-list-page section">
            <div className="container">
                <div className="shopping-list-header">
                    <h1 className="shopping-list-title">
                        Shopping List <span className="text-secondary text-lg">({itemCount} items)</span>
                    </h1>
                    <button onClick={clearList} className="btn btn-ghost text-error">
                        Clear All
                    </button>
                </div>

                <div className="shopping-list-grid">
                    {items.map((group) => (
                        <div key={group.recipeId} className="shopping-list-group">
                            <div className="group-header">
                                <Link to={`/recipe/${group.recipeId}`} className="group-title hover:text-primary">
                                    {group.recipeTitle}
                                </Link>
                                <button
                                    onClick={() => removeRecipe(group.recipeId)}
                                    className="remove-group-btn"
                                    title="Remove entire recipe"
                                >
                                    Remove Recipe
                                </button>
                            </div>

                            <ul className="shopping-items-list">
                                {group.ingredients.map((ing) => (
                                    <li
                                        key={ing.id}
                                        className={`shopping-item ${ing.checked ? 'checked' : ''}`}
                                        onClick={() => toggleItem(group.recipeId, ing.id)}
                                    >
                                        <div className="checkbox-visual">
                                            {ing.checked && '✓'}
                                        </div>
                                        <div className="item-content">
                                            {ing.amount && (
                                                <span className="item-amount">
                                                    {ing.amount} {ing.unit}{' '}
                                                </span>
                                            )}
                                            {ing.item}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeItem(group.recipeId, ing.id);
                                            }}
                                            className="remove-item-btn"
                                            title="Remove item"
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ShoppingList;
