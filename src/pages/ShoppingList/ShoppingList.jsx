import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShoppingList } from '../../context/ShoppingListContext';
import { CheckIcon } from '../../components/Icons/Icons';
import ShoppingListToolbar from '../../components/ShoppingListToolbar/ShoppingListToolbar';
import ConsolidatedIngredientItem from '../../components/ConsolidatedIngredientItem/ConsolidatedIngredientItem';
import './ShoppingList.css';

function ShoppingList() {
    const {
        items,
        consolidatedItems,
        toggleItem,
        toggleConsolidatedItem,
        removeItem,
        removeRecipe,
        checkAll,
        uncheckAll,
        clearList,
        itemCount,
        checkedCount
    } = useShoppingList();

    const [viewMode, setViewMode] = useState('consolidated');

    if (items.length === 0) {
        return (
            <div className="shopping-list-page section">
                <div className="container">
                    <div className="empty-list">
                        <span className="empty-icon">🛒</span>
                        <h2>Nothing on the list yet</h2>
                        <p>Your grocery run starts here. Add ingredients from any recipe and we'll merge the duplicates for you.</p>
                        <Link to="/" className="btn btn-primary">
                            Browse Recipes
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Split consolidated items: unchecked first, checked at bottom
    const uncheckedItems = consolidatedItems.filter(item => !item.checked);
    const checkedItems = consolidatedItems.filter(item => item.checked);

    return (
        <div className="shopping-list-page section">
            <div className="container">
                <h1 className="shopping-list-title">Shopping List</h1>

                <ShoppingListToolbar
                    itemCount={itemCount}
                    checkedCount={checkedCount}
                    onCheckAll={checkAll}
                    onUncheckAll={uncheckAll}
                    onClearAll={clearList}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />

                {viewMode === 'consolidated' ? (
                    <div className="consolidated-list">
                        {uncheckedItems.map(item => (
                            <ConsolidatedIngredientItem
                                key={item.key}
                                consolidatedItem={item}
                                onToggle={toggleConsolidatedItem}
                                onRemoveItem={removeItem}
                            />
                        ))}

                        {checkedItems.length > 0 && uncheckedItems.length > 0 && (
                            <div className="checked-divider">
                                <span>Checked off ({checkedItems.length})</span>
                            </div>
                        )}

                        {checkedItems.map(item => (
                            <ConsolidatedIngredientItem
                                key={item.key}
                                consolidatedItem={item}
                                onToggle={toggleConsolidatedItem}
                                onRemoveItem={removeItem}
                            />
                        ))}
                    </div>
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
