import React from 'react';
import { CheckIcon } from '../Icons/Icons';

const InstructionItem = ({
    step,
    index,
    isChecked,
    isExpanded,
    hasIngredients,
    inlineIngredients,
    onToggle,
    onExpand,
    onHover,
    onLeave
}) => {
    return (
        <li
            className={`instruction-item ${isChecked ? 'checked' : ''} ${isExpanded ? 'expanded' : ''}`}
            onClick={() => hasIngredients && onExpand(index)}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            style={{ cursor: hasIngredients ? 'pointer' : 'default' }}
            data-testid={`instruction-item-${index}`}
        >
            <div className="instruction-header">
                <div
                    className="instruction-checkbox-wrapper"
                    onClick={(e) => onToggle(index, e)}
                    data-testid={`instruction-checkbox-${index}`}
                >
                    <span className="step-number">
                        {isChecked ? <CheckIcon size={16} /> : index + 1}
                    </span>
                </div>
                <div className="instruction-content">
                    <p className="step-text">{step}</p>

                    {hasIngredients && (
                        <div className="step-ingredients-indicator">
                            <small>{isExpanded ? 'Hide ingredients' : 'Show ingredients'}</small>
                        </div>
                    )}
                </div>
            </div>

            {/* Inline Ingredients for Mobile/Expanded View */}
            {isExpanded && hasIngredients && (
                <div className="step-inline-ingredients" data-testid={`inline-ingredients-${index}`}>
                    <ul className="step-ingredients-list-inline">
                        {inlineIngredients.map((entry, i) => {
                            // entry is { amount, unit, item }
                            // we expect the parent to pass already resolved ingredients to avoid extensive logic here?
                            // OR we pass the raw entry and the resolution logic is here?
                            // The previous code did resolution inside the map. 
                            // To keep this component dumb, let's assume `inlineIngredients` is an array of objects { text, amount, unit, item }
                            // Actually, looking at Recipe.jsx, it does a lookup `flatIngredients[ingredientIndex]`.
                            // Passing that down is cleaner.

                            return (
                                <li key={`${index}-${i}`} className="step-ingredient-item-inline">
                                    <span className="step-ingredient-bullet">•</span>
                                    <span className="step-ingredient-text">
                                        {entry.amount && <strong>{entry.amount} {entry.unit} </strong>}
                                        {entry.item}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </li>
    );
};

export default InstructionItem;
