import React, { useState, useEffect, useRef } from 'react';
import { useSavedRecipes } from '../../context/SavedRecipesContext';
import { useAuth } from '../../context/AuthContext';
import { BookmarkIcon, BookmarkSolidIcon, CheckIcon } from '../Icons/Icons';
import SignupPromptModal from '../SignupPromptModal/SignupPromptModal';
import './SaveRecipeButton.css';

function SaveRecipeButton({ recipe, variant = 'icon-only', className = '' }) {
    const { savedRecipes, toggleSaved, toggleListForRecipe, lists } = useSavedRecipes();
    const { currentUser } = useAuth();
    const [showSignupPrompt, setShowSignupPrompt] = useState(false);
    const [showListMenu, setShowListMenu] = useState(false);
    const menuRef = useRef(null);

    const savedRecord = savedRecipes.find(r => r.recipeId === recipe.id);
    const isSaved = !!savedRecord;
    // currentLists only ever contains custom list names — never 'Saved'
    const currentLists = savedRecord ? (savedRecord.listNames || []) : [];

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowListMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isSaved) {
            // Not saved — save immediately (goes into "All Saved", no specific list)
            await toggleSaved(recipe.id);
            if (!currentUser) setShowSignupPrompt(true);
            return;
        }

        if (lists.length === 0) {
            // Saved, but user has no custom lists — clicking again unsaves
            await toggleSaved(recipe.id);
            return;
        }

        // Saved and user has custom lists — show the list management menu
        setShowListMenu(prev => !prev);
    };

    const handleSaveToList = async (e, listName) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleListForRecipe(recipe.id, listName);
        if (!currentUser) setShowSignupPrompt(true);
    };

    const handleUnsave = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowListMenu(false);
        await toggleSaved(recipe.id);
    };

    const buttonClass = `btn save-btn ${variant === 'icon-only' ? 'btn-icon' : 'btn-outline'} ${isSaved ? 'is-saved' : ''} ${className}`;

    return (
        <div className="save-button-wrapper" ref={menuRef}>
            <button
                className={buttonClass}
                onClick={handleClick}
                aria-label={isSaved ? 'Remove from saved recipes' : 'Save recipe'}
                title={isSaved ? 'Remove from saved recipes' : 'Save recipe'}
            >
                {isSaved
                    ? <BookmarkSolidIcon size={variant === 'icon-only' ? 20 : 18} />
                    : <BookmarkIcon size={variant === 'icon-only' ? 20 : 18} />
                }
                {variant !== 'icon-only' && (
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                )}
            </button>

            {/* Custom-list management dropdown */}
            {showListMenu && (
                <div className="save-list-menu">
                    <div className="menu-header">Add to list</div>
                    <ul className="menu-lists">
                        {lists.map(listName => {
                            const inList = currentLists.includes(listName);
                            return (
                                <li key={listName}>
                                    <button
                                        className={`list-option-btn ${inList ? 'active-list' : ''}`}
                                        onClick={(e) => handleSaveToList(e, listName)}
                                    >
                                        <span>{listName}</span>
                                        {inList && <CheckIcon size={14} className="check-icon" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {/* Divider + destructive action */}
                    <div className="menu-divider">
                        <button className="list-option-btn remove-btn" onClick={handleUnsave}>
                            Remove from library
                        </button>
                    </div>
                </div>
            )}

            {/* Unauthenticated prompt */}
            <SignupPromptModal
                isOpen={showSignupPrompt}
                onClose={() => setShowSignupPrompt(false)}
            />
        </div>
    );
}

export default SaveRecipeButton;
