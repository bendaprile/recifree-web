import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon } from '../Icons/Icons';
import './ConsolidatedIngredientItem.css';

const ConsolidatedIngredientItem = ({ consolidatedItem, onToggle, onRemoveItem }) => {
  const [expanded, setExpanded] = useState(false);

  const {
    key,
    displayName,
    quantities,
    sources,
    checked
  } = consolidatedItem;

  const handleToggle = (e) => {
    // Only toggle if not clicking inside the sources toggle or the expanded list
    if (e.target.closest('.sources-toggle') || e.target.closest('.sources-list')) {
      return;
    }
    onToggle(key);
  };

  const handleToggleExpanded = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleRemoveSource = (e, recipeId, ingredientId) => {
    e.stopPropagation();
    onRemoveItem(recipeId, ingredientId);
  };

  const formattedQuantities = quantities.map((q) => {
    const space = q.displayAmount && q.displayUnit ? ' ' : '';
    return `${q.displayAmount || ''}${space}${q.displayUnit || ''}`.trim();
  }).filter(Boolean).join(' + ');

  return (
    <div
      className={`consolidated-item ${checked ? 'checked' : ''}`}
      onClick={handleToggle}
      data-testid={`consolidated-item-${key}`}
    >
      <div className={`consolidated-checkbox ${checked ? 'checked' : ''}`}>
        {checked && <CheckIcon />}
      </div>
      
      <div className="consolidated-content">
        <div className="consolidated-header">
          {formattedQuantities && (
            <span className="consolidated-quantities">{formattedQuantities} </span>
          )}
          <span className="consolidated-name">{displayName}</span>
        </div>

        {sources && sources.length > 0 && (
          <div className="sources-container">
            <button 
              className="sources-toggle" 
              onClick={handleToggleExpanded}
              type="button"
            >
              from {sources.length} recipe{sources.length !== 1 ? 's' : ''}
              <span className={`chevron ${expanded ? 'expanded' : ''}`}>▼</span>
            </button>
            
            {expanded && (
              <div className="sources-list">
                {sources.map(source => (
                  <div key={`${source.recipeId}-${source.ingredientId}`} className="source-item">
                    <Link to={`/recipe/${source.recipeId}`} className="source-link" onClick={e => e.stopPropagation()}>
                      {source.recipeTitle}
                    </Link>
                    <span className="source-amount">
                      ({source.originalAmount} {source.originalUnit})
                    </span>
                    <button 
                      className="source-remove-btn" 
                      onClick={(e) => handleRemoveSource(e, source.recipeId, source.ingredientId)}
                      type="button"
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsolidatedIngredientItem;
