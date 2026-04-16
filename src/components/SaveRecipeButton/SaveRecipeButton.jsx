import React, { useState, useEffect, useRef } from 'react';
import { useSavedRecipes } from '../../context/SavedRecipesContext';
import { useAuth } from '../../context/AuthContext';
import { BookmarkIcon, BookmarkSolidIcon, CheckIcon } from '../Icons/Icons';
import SignupPromptModal from '../SignupPromptModal/SignupPromptModal';
import './SaveRecipeButton.css';

function SaveRecipeButton({ recipe, variant = 'icon-only', className = '' }) {
    const { savedRecipes, isRecipeSaved, toggleListForRecipe, lists } = useSavedRecipes();
    const { currentUser } = useAuth();
    const [showSignupPrompt, setShowSignupPrompt] = useState(false);
    const [showListMenu, setShowListMenu] = useState(false);
    const menuRef = useRef(null);

    const savedRecord = savedRecipes.find(r => r.recipeId === recipe.id);
    const isSaved = !!savedRecord;
    const currentLists = savedRecord ? (savedRecord.listNames || (savedRecord.listName ? [savedRecord.listName] : ['Saved'])) : [];

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
        e.preventDefault(); // Prevent navigating if wrapped in a Link
        e.stopPropagation();

        if (lists.length <= 1) {
            // Just toggle 'Saved'
            await toggleListForRecipe(recipe.id, 'Saved');
            if (!isSaved && !currentUser) setShowSignupPrompt(true);
            return;
        }

        // Multiple lists - always show menu to let them manage lists
        setShowListMenu(!showListMenu);
    };

    const handleSaveToList = async (e, listName) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleListForRecipe(recipe.id, listName);

        // Show prompt if user is unauthenticated
        if (!currentUser) {
            setShowSignupPrompt(true);
        }
    };

    const buttonClass = `btn save-btn ${variant === 'icon-only' ? 'btn-icon' : 'btn-outline'} ${isSaved ? 'is-saved' : ''} ${className}`;

    return (
        <div className="save-button-wrapper" ref={menuRef}>
            <button 
                className={buttonClass}
                onClick={handleClick}
                aria-label={isSaved ? "Remove from saved recipes" : "Save recipe"}
                title={isSaved ? "Remove from saved recipes" : "Save recipe"}
            >
                {isSaved ? <BookmarkSolidIcon size={variant === 'icon-only' ? 20 : 18} /> : <BookmarkIcon size={variant === 'icon-only' ? 20 : 18} />}
                {variant !== 'icon-only' && (
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                )}
            </button>

            {/* List Selection Dropdown */}
            {showListMenu && (
                <div className="save-list-menu">
                    <div className="menu-header">Save to...</div>
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
                </div>
            )}

            {/* Unauthenticated Prompt */}
            <SignupPromptModal 
                isOpen={showSignupPrompt} 
                onClose={() => setShowSignupPrompt(false)} 
            />
        </div>
    );
}

export default SaveRecipeButton;
