import { useShoppingList } from '../../context/ShoppingListContext';
import { CheckIcon } from '../../components/Icons/Icons';

function StoreView() {
    const { itemsByCategory, toggleItem, removeItem } = useShoppingList();

    const categories = Object.values(itemsByCategory);

    if (categories.length === 0) {
        return null;
    }

    return (
        <div className="store-view">
            {categories.map((category) => (
                <div key={category.id} className="category-section">
                    <div className="category-header">
                        <span className="category-icon">{category.icon}</span>
                        <span className="category-name">{category.name}</span>
                        <span className="category-count">
                            ({category.aggregatedItems.length})
                        </span>
                    </div>

                    <ul className="category-items">
                        {category.aggregatedItems.map((aggregatedItem, index) => {
                            // Determine if all quantities are checked
                            const allChecked = aggregatedItem.quantities.every(q => q.checked);
                            const someChecked = aggregatedItem.quantities.some(q => q.checked);

                            // Format display quantity
                            const quantityDisplay = aggregatedItem.quantities
                                .map(q => {
                                    const parts = [];
                                    if (q.amount) parts.push(q.amount);
                                    if (q.unit) parts.push(q.unit);
                                    return parts.join(' ');
                                })
                                .filter(Boolean)
                                .join(' + ');

                            return (
                                <li
                                    key={`${aggregatedItem.normalizedName}-${index}`}
                                    className={`aggregated-item ${allChecked ? 'checked' : ''} ${someChecked && !allChecked ? 'partial' : ''}`}
                                >
                                    <div
                                        className="item-main"
                                        onClick={() => {
                                            // Toggle all quantities
                                            aggregatedItem.quantities.forEach(q => {
                                                toggleItem(q.recipeId, q.id);
                                            });
                                        }}
                                    >
                                        <div className="checkbox-visual">
                                            {allChecked && <CheckIcon size={14} />}
                                            {someChecked && !allChecked && <span className="partial-check">–</span>}
                                        </div>
                                        <div className="item-content">
                                            {quantityDisplay && (
                                                <span className="item-quantity">{quantityDisplay} </span>
                                            )}
                                            <span className="item-name">{aggregatedItem.displayName}</span>
                                        </div>
                                    </div>

                                    {aggregatedItem.sources.length > 0 && (
                                        <div className="recipe-hints">
                                            {aggregatedItem.sources.join(', ')}
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Remove all instances
                                            aggregatedItem.quantities.forEach(q => {
                                                removeItem(q.recipeId, q.id);
                                            });
                                        }}
                                        className="remove-item-btn"
                                        title="Remove item"
                                    >
                                        ×
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
}

export default StoreView;
