import React, { useState, useEffect, useRef } from 'react';
import { useSavedRecipes } from '../../context/SavedRecipesContext';
import { useAuth } from '../../context/AuthContext';
import { BookmarkIcon, BookmarkSolidIcon, BookmarkMinusIcon, CheckIcon, MoreIcon } from '../Icons/Icons';
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

    // The bookmark is a plain toggle in every state. List management lives on its
    // own trigger, so this button never changes meaning under the user.
    const handleToggleSave = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const wasSaved = isSaved;
        setShowListMenu(false);
        await toggleSaved(recipe.id);
        // Only nudge for signup on the way in, not when removing
        if (!wasSaved && !currentUser) setShowSignupPrompt(true);
    };

    const handleToggleMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowListMenu(prev => !prev);
    };

    const handleSaveToList = async (e, listName) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleListForRecipe(recipe.id, listName);
        if (!currentUser) setShowSignupPrompt(true);
    };

    const buttonClass = `btn save-btn ${variant === 'icon-only' ? 'btn-icon' : 'btn-outline'} ${variant === 'large' ? 'large' : ''} ${isSaved ? 'is-saved' : ''} ${className}`;

    return (
        <div className="save-button-wrapper" ref={menuRef}>
            <button
                className={buttonClass}
                onClick={handleToggleSave}
                aria-label={isSaved ? 'Remove from saved recipes' : 'Save recipe'}
                title={isSaved ? 'Remove from saved recipes' : 'Save recipe'}
            >
                {isSaved ? (
                    <>
                        <BookmarkSolidIcon size={variant === 'icon-only' ? 20 : 18} className="save-icon-rest" />
                        {/* Swapped in on hover by CSS to preview what a click does */}
                        {variant === 'icon-only' && (
                            <BookmarkMinusIcon size={20} className="save-icon-remove" />
                        )}
                    </>
                ) : (
                    <BookmarkIcon size={variant === 'icon-only' ? 20 : 18} />
                )}
                {variant !== 'icon-only' && (
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                )}
            </button>

            {/* Secondary trigger, only once there is something to organise into.
                Kept mounted and collapsed with CSS rather than conditionally
                rendered, so it can animate out as well as in. Staying mounted
                also means no transition fires on first paint. */}
            {lists.length > 0 && (
                <button
                    className={`list-menu-btn ${variant === 'large' ? 'large' : ''} ${showListMenu ? 'is-open' : ''} ${isSaved ? '' : 'is-hidden'}`}
                    onClick={handleToggleMenu}
                    aria-label="Manage lists"
                    aria-haspopup="true"
                    aria-expanded={showListMenu}
                    aria-hidden={isSaved ? undefined : 'true'}
                    tabIndex={isSaved ? undefined : -1}
                    title="Manage lists"
                >
                    <MoreIcon size={variant === 'large' ? 18 : 16} />
                </button>
            )}

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
                                        <span className="list-check" aria-hidden="true">
                                            {inList && <CheckIcon size={11} className="check-icon" />}
                                        </span>
                                        <span className="list-option-label">{listName}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
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
