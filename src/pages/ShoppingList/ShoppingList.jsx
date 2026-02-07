import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShoppingList } from '../../context/ShoppingListContext';
import { CheckIcon } from '../../components/Icons/Icons';
import StoreView from './StoreView';
import './ShoppingList.css';

function ShoppingList() {
    const {
        items,
        toggleItem,
        removeItem,
        removeRecipe,
        clearList,
        clearChecked,
        itemCount,
        getPlainTextList
    } = useShoppingList();

    const [viewMode, setViewMode] = useState('store'); // 'store' or 'recipe'
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopyToClipboard = async () => {
        try {
            const text = getPlainTextList();
            await navigator.clipboard.writeText(text);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Count checked items
    const checkedCount = items.reduce((total, group) =>
        total + group.ingredients.filter(ing => ing.checked).length, 0
    );

    if (items.length === 0) {
        return (
            <div className="shopping-list-page section">
                <div className="container">
                    <div className="empty-list">
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
                    <div className="header-title-row">
                        <h1 className="shopping-list-title">
                            Shopping List <span className="text-secondary text-lg">({itemCount} items)</span>
                        </h1>
                    </div>

                    <div className="header-actions">
                        {/* View Toggle */}
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewMode === 'store' ? 'active' : ''}`}
                                onClick={() => setViewMode('store')}
                            >
                                Store View
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'recipe' ? 'active' : ''}`}
                                onClick={() => setViewMode('recipe')}
                            >
                                By Recipe
                            </button>
                        </div>

                        {/* Bulk Actions */}
                        <div className="bulk-actions">
                            <button
                                onClick={handleCopyToClipboard}
                                className="btn btn-secondary btn-sm"
                                title="Copy list to clipboard"
                            >
                                {copySuccess ? 'Copied!' : 'Copy'}
                            </button>
                            {checkedCount > 0 && (
                                <button
                                    onClick={clearChecked}
                                    className="btn btn-ghost btn-sm"
                                >
                                    Clear Checked ({checkedCount})
                                </button>
                            )}
                            <button
                                onClick={clearList}
                                className="btn btn-ghost btn-sm text-error"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>

                {viewMode === 'store' ? (
                    <StoreView />
                ) : (
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
                                                {ing.checked && <CheckIcon size={14} />}
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
                )}
            </div>
        </div>
    );
}

export default ShoppingList;
