import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserSavedRecipes, updateRecipeListsInFirestore, getUserCustomLists, addCustomListToFirestore, renameCustomListInFirestore, deleteCustomListFromFirestore } from '../services/savedRecipeService';

const SavedRecipesContext = createContext();

export function useSavedRecipes() {
    return useContext(SavedRecipesContext);
}

export function SavedRecipesProvider({ children }) {
    const { currentUser, loadingAuth } = useAuth();
    const [savedRecipes, setSavedRecipes] = useState([]); // [{recipeId, listName, savedAt}]
    const [explicitLists, setExplicitLists] = useState([]);
    const [lists, setLists] = useState(['Saved']); 
    const [loading, setLoading] = useState(true);
    
    // For local storage, format is just simple JSON array of objects
    const LOCAL_STORAGE_KEY = 'recifree_saved_recipes';
    const LOCAL_STORAGE_CUSTOM_LISTS_KEY = 'recifree_custom_lists';

    useEffect(() => {
        let isMounted = true;

        async function loadSavedRecipes() {
            setLoading(true);
            try {
                if (currentUser) {
                    // 1. Migrate local storage if exists
                    const localCustomLists = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]');
                    for (const listName of localCustomLists) {
                        await addCustomListToFirestore(currentUser.uid, listName);
                    }
                    if (localCustomLists.length > 0) localStorage.removeItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY);

                    const localSaves = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                    if (localSaves.length > 0) {
                        for (const save of localSaves) {
                            const listNames = save.listNames || (save.listName ? [save.listName] : ['Saved']);
                            await updateRecipeListsInFirestore(currentUser.uid, save.recipeId, listNames);
                        }
                        localStorage.removeItem(LOCAL_STORAGE_KEY);
                    }

                    // 2. Load from Firestore
                    const firestoreSaves = await getUserSavedRecipes(currentUser.uid);
                    const firestoreCustomLists = await getUserCustomLists(currentUser.uid);
                    
                    if (isMounted) {
                        setSavedRecipes(firestoreSaves);
                        setExplicitLists(firestoreCustomLists);
                    }
                } else {
                    // Load purely from local storage
                    const localSaves = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                    const localCustomLists = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]');
                    
                    const migratedLocalSaves = localSaves.map(save => {
                       if (!save.listNames) {
                           return { ...save, listNames: save.listName ? [save.listName] : ['Saved'] };
                       }
                       return save;
                    });

                    if (isMounted) {
                        setSavedRecipes(migratedLocalSaves);
                        setExplicitLists(localCustomLists);
                    }
                }
            } catch (error) {
                console.error("Failed to load saved recipes", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (loadingAuth) return;
        loadSavedRecipes();

        return () => {
            isMounted = false;
        };
    }, [currentUser, loadingAuth]);

    // Extract unique lists
    useEffect(() => {
        const recipeLists = new Set();
        savedRecipes.forEach(r => {
             if (r.listNames) {
                 r.listNames.forEach(l => recipeLists.add(l));
             } else if (r.listName) {
                 recipeLists.add(r.listName);
             } else {
                 recipeLists.add('Saved');
             }
        });
        
        const hasSavedRecipes = recipeLists.has('Saved');
        
        let allLists = new Set([...explicitLists, ...recipeLists]);
        
        // Hide 'Saved' only if it's empty AND we have custom lists
        if (!hasSavedRecipes && explicitLists.length > 0) {
             allLists.delete('Saved');
        } else {
             allLists.add('Saved');
        }
        
        // Ensure 'Saved' is always first if it exists
        const uniqueLists = Array.from(allLists);
        if (uniqueLists.includes('Saved')) {
             uniqueLists.sort((a,b) => a === 'Saved' ? -1 : b === 'Saved' ? 1 : 0);
        }

        setLists(uniqueLists);
    }, [savedRecipes, explicitLists]);

    const isRecipeSaved = (recipeId) => {
        return savedRecipes.some(r => r.recipeId === recipeId);
    };

    const createCustomList = async (listName) => {
        if (!listName || listName.trim() === '' || listName.trim().toLowerCase() === 'saved') return;
        
        const cleanName = listName.trim();
        if (lists.includes(cleanName)) return;

        setExplicitLists(prev => [...prev, cleanName]);
        
        try {
            if (currentUser) {
                await addCustomListToFirestore(currentUser.uid, cleanName);
            } else {
                const currentLocal = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]');
                if (!currentLocal.includes(cleanName)) {
                    currentLocal.push(cleanName);
                    localStorage.setItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY, JSON.stringify(currentLocal));
                }
            }
        } catch (err) {
            console.error("Failed to create custom list", err);
        }
    };

    const renameCustomList = async (oldName, newName) => {
        if (!newName || newName.trim() === '' || newName.trim().toLowerCase() === 'saved' || oldName === 'Saved') return;
        const cleanName = newName.trim();
        
        // Optimistic
        setExplicitLists(prev => prev.map(l => l === oldName ? cleanName : l));
        setSavedRecipes(prev => prev.map(r => {
            const listNames = r.listNames || (r.listName ? [r.listName] : ['Saved']);
            const updated = listNames.filter(l => l !== oldName);
            if (listNames.includes(oldName) && !updated.includes(cleanName)) {
                updated.push(cleanName);
            }
            return { ...r, listNames: updated };
        }));

        try {
            if (currentUser) {
                await renameCustomListInFirestore(currentUser.uid, oldName, cleanName);
            } else {
                let currentLocalLists = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]');
                currentLocalLists = currentLocalLists.map(l => l === oldName ? cleanName : l);
                localStorage.setItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY, JSON.stringify(currentLocalLists));

                let currentLocalSaves = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                currentLocalSaves = currentLocalSaves.map(r => {
                    const listNames = r.listNames || (r.listName ? [r.listName] : ['Saved']);
                    const updated = listNames.filter(l => l !== oldName);
                    if (listNames.includes(oldName) && !updated.includes(cleanName)) {
                        updated.push(cleanName);
                    }
                    return { ...r, listNames: updated };
                });
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentLocalSaves));
            }
        } catch (error) {
            console.error("Failed to rename list", error);
        }
    };

    const deleteCustomList = async (listName, recipeAction = 'move') => {
        if (listName === 'Saved') return;

        // Optimistic
        setExplicitLists(prev => prev.filter(l => l !== listName));
        setSavedRecipes(prev => {
             return prev.map(r => {
                 const listNames = r.listNames || (r.listName ? [r.listName] : ['Saved']);
                 if (!listNames.includes(listName)) return r;
                 
                 const updated = listNames.filter(l => l !== listName);
                 if (recipeAction !== 'delete') {
                     if (!updated.includes('Saved')) updated.push('Saved');
                     return { ...r, listNames: updated };
                 } else {
                     return { ...r, listNames: updated };
                 }
             }).filter(r => r.listNames.length > 0);
        });

        try {
            if (currentUser) {
                await deleteCustomListFromFirestore(currentUser.uid, listName, recipeAction);
            } else {
                let currentLocalLists = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY) || '[]');
                currentLocalLists = currentLocalLists.filter(l => l !== listName);
                localStorage.setItem(LOCAL_STORAGE_CUSTOM_LISTS_KEY, JSON.stringify(currentLocalLists));

                let currentLocalSaves = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                currentLocalSaves = currentLocalSaves.map(r => {
                     const listNames = r.listNames || (r.listName ? [r.listName] : ['Saved']);
                     if (!listNames.includes(listName)) return r;
                     
                     const updated = listNames.filter(l => l !== listName);
                     if (recipeAction !== 'delete') {
                         if (!updated.includes('Saved')) updated.push('Saved');
                         return { ...r, listNames: updated };
                     } else {
                         return { ...r, listNames: updated };
                     }
                 }).filter(r => r.listNames.length > 0);
                
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentLocalSaves));
            }
        } catch (error) {
            console.error("Failed to delete list", error);
        }
    };

    const toggleListForRecipe = async (recipeId, listName = 'Saved') => {
        const existingRecord = savedRecipes.find(r => r.recipeId === recipeId);
        const currentLists = existingRecord ? (existingRecord.listNames || (existingRecord.listName ? [existingRecord.listName] : ['Saved'])) : [];
        
        let newLists;
        if (currentLists.includes(listName)) {
             newLists = currentLists.filter(l => l !== listName);
        } else {
             newLists = [...currentLists, listName];
        }

        const newSave = { 
            recipeId, 
            listNames: newLists, 
            savedAt: existingRecord ? existingRecord.savedAt : new Date().toISOString() 
        };

        // Optimistic UI
        setSavedRecipes(prev => {
            const filtered = prev.filter(r => r.recipeId !== recipeId);
            if (newLists.length === 0) return filtered;
            
            // Explicitly ensure no legacy 'listName' in state
            const { listName, ...rest } = newSave;
            return [...filtered, rest];
        });

        try {
            if (currentUser) {
                await updateRecipeListsInFirestore(currentUser.uid, recipeId, newLists);
            } else {
                const currentLocal = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
                const filteredLocal = currentLocal.filter(r => r.recipeId !== recipeId);
                const localMigrated = filteredLocal.map(s => {
                    return { ...s, listNames: s.listNames || (s.listName ? [s.listName] : ['Saved']) };
                });
                
                if (newLists.length > 0) {
                     localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...localMigrated, newSave]));
                } else {
                     localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localMigrated));
                }
            }
        } catch (error) {
            console.error('Failed to toggle recipe list', error);
        }
    };

    const value = {
        savedRecipes,
        lists,
        loading,
        isRecipeSaved,
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
