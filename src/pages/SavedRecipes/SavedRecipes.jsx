import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSavedRecipes } from '../../context/SavedRecipesContext';
import { getRecipeBySlug } from '../../services/recipeService';
import RecipeCard from '../../components/RecipeCard/RecipeCard';
import { BookmarkIcon, EditIcon, TrashIcon, PlusIcon } from '../../components/Icons/Icons';
import './SavedRecipes.css';

function SavedRecipes() {
    const { savedRecipes, lists, loading: contextLoading, createCustomList, renameCustomList, deleteCustomList } = useSavedRecipes();
    const [activeList, setActiveList] = useState('all');
    // Keep activeList valid — 'all' is always valid; custom lists check membership
    useEffect(() => {
        if (activeList !== 'all' && !lists.includes(activeList) && lists.length > 0) {
            setActiveList('all');
        }
    }, [lists, activeList]);

    const [fullRecipes, setFullRecipes] = useState([]);
    const [loadingRecipes, setLoadingRecipes] = useState(true);
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [isRenamingList, setIsRenamingList] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [listToDelete, setListToDelete] = useState(null);

    const uniqueRecipeIdKey = useMemo(() =>
        [...new Set(savedRecipes.map(r => r.recipeId))].sort().join(','),
    [savedRecipes]);

    const handleCreateListSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!newListName.trim()) {
            setIsCreatingList(false);
            return;
        }
        await createCustomList(newListName);
        setActiveList(newListName.trim());
        setNewListName('');
        setIsCreatingList(false);
    };

    const handleRenameSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const newName = renameValue.trim();
        if (newName && newName !== activeList) {
            await renameCustomList(activeList, newName);
            setActiveList(newName);
        }
        setIsRenamingList(false);
    };

    const startRenaming = () => {
        setRenameValue(activeList);
        setIsRenamingList(true);
    };

    const handleDeleteList = async (action) => {
        if (!listToDelete) return;
        await deleteCustomList(listToDelete, action);
        setListToDelete(null);
    };

    // Fetch full recipe details — only when the actual SET of saved IDs changes.
    useEffect(() => {
        if (contextLoading) return;

        let isMounted = true;

        async function fetchFullRecipes() {
            // Only show the skeleton on the very first load (no cached data yet)
            if (fullRecipes.length === 0) setLoadingRecipes(true);
            
            try {
                const ids = uniqueRecipeIdKey ? uniqueRecipeIdKey.split(',') : [];
                
                if (ids.length === 0) {
                    setFullRecipes([]);
                    return;
                }

                const fetches = ids.map(id => getRecipeBySlug(id));
                const results = await Promise.all(fetches);
                
                if (isMounted) {
                    setFullRecipes(results.filter(Boolean));
                }
            } catch (err) {
                console.error('Error fetching full recipes', err);
            } finally {
                if (isMounted) {
                    setLoadingRecipes(false);
                }
            }
        }

        fetchFullRecipes();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uniqueRecipeIdKey, contextLoading]);

    // 'all' shows the entire library; any other value filters by custom list membership
    const visibleRecipes = useMemo(() => {
        if (activeList === 'all') return fullRecipes;
        const recordsInList = savedRecipes.filter(r => (r.listNames || []).includes(activeList));
        const idsInList = new Set(recordsInList.map(r => r.recipeId));
        return fullRecipes.filter(recipe => idsInList.has(recipe.id));
    }, [fullRecipes, savedRecipes, activeList]);

    if (contextLoading || loadingRecipes) {

        return (
            <div className="saved-recipes-page section">
                <div className="container">
                    <div className="skeleton-header"></div>
                    <div className="recipe-grid-loading mt-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="recipe-card-skeleton" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="saved-recipes-page section">
            <div className="container">
                <div className="saved-header">
                    {isRenamingList && activeList !== 'all' ? (
                        <form onSubmit={handleRenameSubmit} className="rename-list-form">
                            <input 
                                type="text"
                                autoFocus
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onBlur={handleRenameSubmit}
                                className="rename-list-input"
                                placeholder="List Name"
                            />
                        </form>
                    ) : (
                    <div className="header-title-row">
                            <h1>{activeList === 'all' ? 'Your Kitchen' : activeList}</h1>
                            {activeList !== 'all' && (
                                <div className="list-actions">
                                    <button className="icon-btn" onClick={startRenaming} title="Rename list">
                                        <EditIcon size={20} />
                                    </button>
                                    <button className="icon-btn delete-btn" onClick={() => setListToDelete(activeList)} title="Delete list">
                                        <TrashIcon size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="lead">
                        {activeList === 'all'
                            ? 'Your personal collection, free from the noise.'
                            : `Manage your ${activeList} recipes.`}
                    </p>
                </div>

                {savedRecipes.length === 0 ? (
                    <div className="empty-saved-state text-center">
                        <div className="empty-icon-wrapper">
                            <BookmarkIcon size={48} className="empty-icon" />
                        </div>
                        <h2>Your kitchen is clean!</h2>
                        <p>You haven't saved any recipes yet. Your kitchen, zero pop-ups.</p>
                        <Link to="/" className="btn btn-primary mt-4">Browse Recipes</Link>
                    </div>
                ) : (
                    <>
                        {/* List Tabs */}
                        <div className="list-tabs-container">
                            <div className="list-tabs">
                                {/* 'All Saved' aggregate tab — always first */}
                                <button
                                    className={`list-tab-btn ${activeList === 'all' ? 'active' : ''}`}
                                    onClick={() => setActiveList('all')}
                                >
                                    All Saved
                                </button>
                                {/* Custom list tabs */}
                                {lists.map(listName => (
                                    <button
                                        key={listName}
                                        className={`list-tab-btn ${activeList === listName ? 'active' : ''}`}
                                        onClick={() => setActiveList(listName)}
                                    >
                                        {listName}
                                    </button>
                                ))}
                                {isCreatingList ? (
                                    <form onSubmit={handleCreateListSubmit} className="create-list-form">
                                        <input 
                                            type="text" 
                                            autoFocus
                                            value={newListName}
                                            onChange={(e) => setNewListName(e.target.value)}
                                            onBlur={handleCreateListSubmit}
                                            placeholder="List Name..."
                                            className="list-tab-input"
                                        />
                                    </form>
                                ) : (
                                    <button 
                                        className="create-list-icon-btn"
                                        onClick={() => setIsCreatingList(true)}
                                        title="Create new list"
                                        aria-label="Create new list"
                                    >
                                        <PlusIcon size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Recipes Grid */}
                        <div className="saved-recipes-content">
                            <p className="recipe-count">
                                Showing {visibleRecipes.length} {visibleRecipes.length === 1 ? 'recipe' : 'recipes'}
                                {activeList !== 'all' && ` in "${activeList}"`}
                            </p>

                            {visibleRecipes.length > 0 ? (
                                <div className="recipe-grid columns-4">
                                    {visibleRecipes.map(recipe => (
                                        <RecipeCard key={recipe.id} recipe={recipe} />
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-list-state">
                                    <p>No recipes in this list yet.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Delete List Modal */}
            {listToDelete && (
                <div className="delete-modal-overlay" onClick={() => setListToDelete(null)}>
                    <div className="delete-modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Delete "{listToDelete}"?</h2>
                        <p>What would you like to do with the recipes currently inside this list?</p>
                        <div className="delete-modal-actions">
                            <button className="btn btn-primary" onClick={() => handleDeleteList('move')}>
                                Keep them saved
                            </button>
                            <button className="btn btn-outline danger" onClick={() => handleDeleteList('delete')}>
                                Unsave them completely
                            </button>
                            <button className="btn btn-text" onClick={() => setListToDelete(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SavedRecipes;
