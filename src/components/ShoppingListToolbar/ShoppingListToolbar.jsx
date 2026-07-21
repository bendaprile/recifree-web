import React from 'react';
import { CheckIcon, TrashIcon } from '../Icons/Icons';
import './ShoppingListToolbar.css';

const ShoppingListToolbar = ({
  itemCount,
  checkedCount,
  onCheckAll,
  onUncheckAll,
  onClearAll,
  viewMode,
  onViewModeChange
}) => {
  const renderStatusText = () => {
    if (itemCount === 0 || checkedCount === 0) {
      return <span>0 checked</span>;
    }
    if (checkedCount === itemCount) {
      return <span>All checked!</span>;
    }
    return (
      <span>
        <span className="status-number">{checkedCount}</span> of {itemCount} checked
      </span>
    );
  };

  return (
    <div className="shopping-toolbar">
      <div className="toolbar-status">
        {renderStatusText()}
      </div>
      <div className="toolbar-actions">
        <button className="toolbar-btn" onClick={onCheckAll}>Check All</button>
        <button className="toolbar-btn" onClick={onUncheckAll}>Uncheck All</button>
      </div>
      <div className="toolbar-right">
        <button className="toolbar-btn toolbar-btn-danger" onClick={onClearAll}>
          <TrashIcon /> Clear All
        </button>
        <div className="toolbar-view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'consolidated' ? 'active' : ''}`}
            onClick={() => onViewModeChange('consolidated')}
            aria-label="Consolidated view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 4h12v2H2V4zm0 4h12v2H2V8zm0 4h12v2H2v-2z" />
            </svg>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'recipe' ? 'active' : ''}`}
            onClick={() => onViewModeChange('recipe')}
            aria-label="Recipe view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListToolbar;
