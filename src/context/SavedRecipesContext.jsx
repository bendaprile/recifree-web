import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
    getUserSavedRecipes,
    updateRecipeListsInFirestore,
    unsaveRecipeFromFirestore,
    getUserCustomLists,
    addCustomListToFirestore,
    renameCustomListInFirestore,
    deleteCustomListFromFirestore
} from '../services/savedRecipeService';

const SavedRecipesContext = createContext();

export function useSavedRecipes() {
    return useContext(SavedRecipesContext);
}

// Strip the legacy 'Saved' sentinel out of a listNames array.
// In the new model, existence of the record = saved; 'Saved' is not a real list.
function migrateLegacyListNames(listNames) {
    return (listNames || []).filter(l => l !== 'Saved');
}

export function SavedRecipesProvider({ children }) {
    const { currentUser, loadingAuth } = useAuth();
    // Each record: { recipeId, listNames: string[], savedAt }
    // listNames is the set of CUSTOM lists it belongs to (never includes 'Saved')
    const [savedRecipes, setSavedRecipes] = useState([]);
    // Custom list names created by the user (never includes 'Saved')
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);

    const LOCAL_STORAGE_KEY = 'recifree_saved_recipes';
    const LOCAL_STORAGE_CUSTOM_LISTS_KEY = 'recifree_custom_lists';

    useEffect(() => {
        let isMounted = true;

        async function loadSavedRecipes() {
            setLoading(true);
            try {
                if (currentUser) {
                    // 1. Migrate any local storage into Firestore
                    const localCustomLists = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]')
                        .filter(l => l !== 'Saved');
                    for (const listName of localCustomLists) {
                        await addCustomListToFirestore(currentUser.uid, listName);
                    }
                    if (localCustomLists.length > 0) localStorage.removeItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY);

                    const localSaves = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                    if (localSaves.length > 0) {
                        for (const save of localSaves) {
                            const listNames = migrateLegacyListNames(
                                save.listNames || (save.listName ? [save.listName] : [])
                            );
                            await updateRecipeListsInFirestore(currentUser.uid, save.recipeId, listNames);
                        }
                        localStorage.removeItem(LOCAL_STORAGE_KEY);
                    }

                    // 2. Load from Firestore and migrate legacy 'Saved' out of listNames
                    const firestoreSaves = await getUserSavedRecipes(currentUser.uid);
                    const firestoreCustomLists = (await getUserCustomLists(currentUser.uid))
                        .filter(l => l !== 'Saved');

                    if (isMounted) {
                        setSavedRecipes(firestoreSaves.map(r => ({
                            ...r,
                            listNames: migrateLegacyListNames(r.listNames)
                        })));
                        setLists(firestoreCustomLists);
                    }
                } else {
                    // Load from local storage and migrate
                    const localSaves = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                    const localCustomLists = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]')
                        .filter(l => l !== 'Saved');

                    const migrated = localSaves.map(save => ({
                        ...save,
                        listNames: migrateLegacyListNames(
                            save.listNames || (save.listName ? [save.listName] : [])
                        )
                    }));

                    if (isMounted) {
                        setSavedRecipes(migrated);
                        setLists(localCustomLists);
                    }
                }
            } catch (error) {
                console.error('Failed to load saved recipes', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        if (loadingAuth) return;
        loadSavedRecipes();

        return () => { isMounted = false; };
    }, [currentUser, loadingAuth]);

    const isRecipeSaved = (recipeId) => {
        return savedRecipes.some(r => r.recipeId === recipeId);
    };

    // ─── Global save / unsave ────────────────────────────────────────────────
    // Toggles a recipe in/out of the library entirely.
    // Called by the bookmark button click (no list context).
    const toggleSaved = async (recipeId) => {
        const existingRecord = savedRecipes.find(r => r.recipeId === recipeId);

        if (existingRecord) {
            // Unsave: remove from local state immediately
            setSavedRecipes(prev => prev.filter(r => r.recipeId !== recipeId));
            try {
                if (currentUser) {
                    await unsaveRecipeFromFirestore(currentUser.uid, recipeId);
                } else {
                    const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(
                        current.filter(r => r.recipeId !== recipeId)
                    ));
                }
            } catch (error) {
                console.error('Failed to unsave recipe', error);
                // Rollback on failure
                setSavedRecipes(prev => [...prev, existingRecord]);
            }
        } else {
            // Save with no custom list membership yet
            const newSave = { recipeId, listNames: [], savedAt: new Date().toISOString() };
            setSavedRecipes(prev => [...prev, newSave]);
            try {
                if (currentUser) {
                    await updateRecipeListsInFirestore(currentUser.uid, recipeId, []);
                } else {
                    const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...current, newSave]));
                }
            } catch (error) {
                console.error('Failed to save recipe', error);
                // Rollback on failure
                setSavedRecipes(prev => prev.filter(r => r.recipeId !== recipeId));
            }
        }
    };

    // ─── Custom list membership ──────────────────────────────────────────────
    // Adds or removes a recipe from a specific custom list.
    // If the recipe is not yet saved, it is saved first.
    // Removing from all lists does NOT unsave — use toggleSaved for that.
    const toggleListForRecipe = async (recipeId, listName) => {
        if (!listName || listName === 'Saved') return;

        const existingRecord = savedRecipes.find(r => r.recipeId === recipeId);
        const currentLists = existingRecord ? migrateLegacyListNames(existingRecord.listNames) : null;

        let newLists;
        if (currentLists === null) {
            // Not saved yet — save it and add to the list
            newLists = [listName];
        } else if (currentLists.includes(listName)) {
            // Already in this list — remove it (but keep saved)
            newLists = currentLists.filter(l => l !== listName);
        } else {
            // Add to this list
            newLists = [...currentLists, listName];
        }

        const newSave = {
            recipeId,
            listNames: newLists,
            savedAt: existingRecord ? existingRecord.savedAt : new Date().toISOString()
        };

        // Optimistic update
        setSavedRecipes(prev => {
            const filtered = prev.filter(r => r.recipeId !== recipeId);
            return [...filtered, newSave];
        });

        try {
            if (currentUser) {
                await updateRecipeListsInFirestore(currentUser.uid, recipeId, newLists);
            } else {
                const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                const filtered = current
                    .filter(r => r.recipeId !== recipeId)
                    .map(s => ({ ...s, listNames: migrateLegacyListNames(s.listNames) }));
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...filtered, newSave]));
            }
        } catch (error) {
            console.error('Failed to toggle recipe list', error);
        }
    };

    // ─── Custom list management ──────────────────────────────────────────────
    const createCustomList = async (listName) => {
        if (!listName || listName.trim() === '' || listName.trim().toLowerCase() === 'saved') return;

        const cleanName = listName.trim();
        if (lists.includes(cleanName)) return;

        setLists(prev => [...prev, cleanName]);

        try {
            if (currentUser) {
                await addCustomListToFirestore(currentUser.uid, cleanName);
            } else {
                const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]');
                if (!current.includes(cleanName)) {
                    localStorage.setItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY, JSON.stringify([...current, cleanName]));
                }
            }
        } catch (err) {
            console.error('Failed to create custom list', err);
        }
    };

    const renameCustomList = async (oldName, newName) => {
        if (!newName || newName.trim() === '' || newName.trim().toLowerCase() === 'saved' || oldName === 'Saved') return;
        const cleanName = newName.trim();

        // Optimistic
        setLists(prev => prev.map(l => l === oldName ? cleanName : l));
        setSavedRecipes(prev => prev.map(r => {
            const listNames = migrateLegacyListNames(r.listNames);
            if (!listNames.includes(oldName)) return r;
            return {
                ...r,
                listNames: listNames.map(l => l === oldName ? cleanName : l)
            };
        }));

        try {
            if (currentUser) {
                await renameCustomListInFirestore(currentUser.uid, oldName, cleanName);
            } else {
                let localLists = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]');
                localStorage.setItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY,
                    JSON.stringify(localLists.map(l => l === oldName ? cleanName : l)));

                let localSaves = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localSaves.map(r => {
                    const listNames = migrateLegacyListNames(r.listNames);
                    return { ...r, listNames: listNames.map(l => l === oldName ? cleanName : l) };
                })));
            }
        } catch (error) {
            console.error('Failed to rename list', error);
        }
    };

    const deleteCustomList = async (listName, recipeAction = 'move') => {
        if (listName === 'Saved') return;

        // Optimistic update — use a loop for clarity to avoid accidentally touching
        // uncategorised recipes (those with listNames: [])
        setLists(prev => prev.filter(l => l !== listName));
        setSavedRecipes(prev => {
            const result = [];
            for (const r of prev) {
                const listNames = migrateLegacyListNames(r.listNames);
                if (!listNames.includes(listName)) {
                    result.push(r); // Not in this list — untouched
                    continue;
                }
                const updated = listNames.filter(l => l !== listName);
                if (recipeAction === 'delete' && updated.length === 0) {
                    // Recipe was only in this list — fully unsave
                    continue;
                }
                result.push({ ...r, listNames: updated });
            }
            return result;
        });

        try {
            if (currentUser) {
                await deleteCustomListFromFirestore(currentUser.uid, listName, recipeAction);
            } else {
                let localLists = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]');
                localStorage.setItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY,
                    JSON.stringify(localLists.filter(l => l !== listName)));

                let localSaves = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                const updated = [];
                for (const r of localSaves) {
                    const listNames = migrateLegacyListNames(r.listNames);
                    if (!listNames.includes(listName)) {
                        updated.push(r);
                        continue;
                    }
                    const newListNames = listNames.filter(l => l !== listName);
                    if (recipeAction === 'delete' && newListNames.length === 0) continue;
                    updated.push({ ...r, listNames: newListNames });
                }
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            }
        } catch (error) {
            console.error('Failed to delete list', error);
        }
    };

    const value = {
        savedRecipes,
        lists,
        loading,
        isRecipeSaved,
        toggleSaved,
        toggleListForRecipe,
        createCustomList,
        renameCustomList,
        deleteCustomList
    };

    return (
        <SavedRecipesContext.Provider value={value}>
            {children}
        </SavedRecipesContext.Provider>
    );
}
