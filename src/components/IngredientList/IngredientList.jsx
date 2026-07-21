import React from 'react';
import { scaleAmount } from '../../utils/recipeScaler';

/**
 * Individual Ingredient Item Component
 */
export function IngredientItem({
    ingredient,
    index,
    isChecked,
    isHighlighted,
    currentScale,
    onToggle
}) {
    return (
        <li
            data-ing-id={index}
            className={`swiss-ing-item ${isChecked ? 'checked' : ''} ${isHighlighted ? 'step-highlight' : ''}`}
            onClick={() => onToggle(index)}
        >
            <div className={`swiss-ing-checkbox ${isChecked ? 'checked' : ''}`}>
                {isChecked && (
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </div>
            <span>
                {ingredient.amount && (
                    <strong className="swiss-qty">
                        {scaleAmount(ingredient.amount, currentScale)} {ingredient.unit}
                    </strong>
                )}
                {' '}{ingredient.item}
            </span>
        </li>
    );
}

/**
 * Ingredient List Component
 * Supports both sectioned (with sub-headers) and flat ingredient structures.
 */
export function IngredientList({
    ingredients,
    checkedIngredients,
    highlightedIngredientIds,
    currentScale,
    onToggleIngredient
}) {
    if (!ingredients || ingredients.length === 0) return null;

    let flatIndexCounter = 0;
    const isSectioned = Boolean(ingredients[0]?.items);

    if (isSectioned) {
        return (
            <div className="swiss-ingredients-sections">
                {ingredients.map((section, sIndex) => (
                    <div key={sIndex} className="ingredients-section">
                        {section.title && (
                            <h3 className="ingredient-section-title">{section.title}</h3>
                        )}
                        <ul className="swiss-ing-list">
                            {section.items.map((ingredient, iIndex) => {
                                const flatIdx = flatIndexCounter++;
                                const uniqueId = `${sIndex}-${iIndex}`;
                                const isChecked =
                                    checkedIngredients.includes(uniqueId) ||
                                    checkedIngredients.includes(flatIdx);
                                const isHighlighted = highlightedIngredientIds.includes(flatIdx);

                                return (
                                    <IngredientItem
                                        key={uniqueId}
                                        ingredient={ingredient}
                                        index={flatIdx}
                                        isChecked={isChecked}
                                        isHighlighted={isHighlighted}
                                        currentScale={currentScale}
                                        onToggle={() => onToggleIngredient(uniqueId)}
                                    />
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <ul className="swiss-ing-list">
            {ingredients.map((ingredient, index) => {
                const isChecked = checkedIngredients.includes(index);
                const isHighlighted = highlightedIngredientIds.includes(index);

                return (
                    <IngredientItem
                        key={index}
                        ingredient={ingredient}
                        index={index}
                        isChecked={isChecked}
                        isHighlighted={isHighlighted}
                        currentScale={currentScale}
                        onToggle={() => onToggleIngredient(index)}
                    />
                );
            })}
        </ul>
    );
}

export default IngredientList;
