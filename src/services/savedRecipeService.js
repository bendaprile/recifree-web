import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, query, where, serverTimestamp, arrayUnion, arrayRemove, writeBatch, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * savedRecipeService.js
 * Handles Firestore operations for a user's saved recipes and lists.
 */

// Get all saved recipes for a user
export async function getUserSavedRecipes(uid) {
    if (!uid) return [];
    try {
        const q = query(collection(db, `users/${uid}/savedRecipes`));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            let listNames = data.listNames || [];
            
            // Migrate legacy users dynamically on read
            if (data.listName && !listNames.includes(data.listName)) {
                listNames.push(data.listName);
            }
            
            return {
                recipeId: doc.id,
                ...data,
                listNames
            };
        });
    } catch (error) {
        console.error('Error fetching saved recipes:', error);
        return [];
    }
}

// Add or Remove a recipe from lists
export async function updateRecipeListsInFirestore(uid, recipeId, newListNames) {
    if (!uid) throw new Error('User must be authenticated to save to Firestore');
    try {
        const docRef = doc(db, `users/${uid}/savedRecipes`, recipeId);
        
        if (newListNames.length === 0) {
            await deleteDoc(docRef);
        } else {
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                await setDoc(docRef, {
                    listNames: newListNames,
                    savedAt: serverTimestamp()
                });
            } else {
                await setDoc(docRef, {
                    listNames: newListNames,
                    listName: deleteField() // Clean up legacy field
                }, { merge: true });
            }
        }
    } catch (error) {
        console.error('Error updating recipe lists:', error);
        throw error;
    }
}

// Get user's custom created lists
export async function getUserCustomLists(uid) {
    if (!uid) return [];
    try {
        const docRef = doc(db, 'users', uid);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists() && snapshot.data().customLists) {
            return snapshot.data().customLists;
        }
        return [];
    } catch (error) {
        console.error('Error fetching custom lists:', error);
        return [];
    }
}

// Add a new custom list
export async function addCustomListToFirestore(uid, listName) {
    if (!uid) throw new Error('User must be authenticated to save custom list');
    try {
        const docRef = doc(db, 'users', uid);
        await setDoc(docRef, {
            customLists: arrayUnion(listName)
        }, { merge: true });
    } catch (error) {
        console.error('Error saving custom list:', error);
        throw error;
    }
}

// Rename a custom list
export async function renameCustomListInFirestore(uid, oldName, newName) {
    if (!uid) throw new Error('User must be authenticated to rename list');
    try {
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', uid);
        
        batch.set(userDocRef, {
            customLists: arrayRemove(oldName)
        }, { merge: true });
        
        batch.set(userDocRef, {
            customLists: arrayUnion(newName)
        }, { merge: true });

        // Batch update all recipes in the old list using array-contains
        const q = query(collection(db, `users/${uid}/savedRecipes`), where('listNames', 'array-contains', oldName));
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach((recipeDoc) => {
            const data = recipeDoc.data();
            const currentListNames = data.listNames || [];
            const updated = currentListNames.filter(l => l !== oldName);
            if (!updated.includes(newName)) updated.push(newName);
            
            batch.update(recipeDoc.ref, { listNames: updated });
        });

        // Also catch any un-migrated legacy docs
        const qLegacy = query(collection(db, `users/${uid}/savedRecipes`), where('listName', '==', oldName));
        const snapshotLegacy = await getDocs(qLegacy);
        snapshotLegacy.docs.forEach((recipeDoc) => {
            batch.update(recipeDoc.ref, { 
                listName: '', // wipe legacy
                listNames: arrayUnion(newName) 
            });
        });

        await batch.commit();
    } catch (error) {
        console.error('Error renaming custom list:', error);
        throw error;
    }
}

// Delete a custom list
export async function deleteCustomListFromFirestore(uid, listName, recipeAction = 'move') {
    if (!uid) throw new Error('User must be authenticated to delete list');
    try {
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', uid);
        
        batch.set(userDocRef, {
            customLists: arrayRemove(listName)
        }, { merge: true });

        const q = query(collection(db, `users/${uid}/savedRecipes`), where('listNames', 'array-contains', listName));
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach((recipeDoc) => {
            if (recipeAction === 'delete') {
                const updated = recipeDoc.data().listNames.filter(l => l !== listName);
                if (updated.length === 0) {
                    batch.delete(recipeDoc.ref);
                } else {
                    batch.update(recipeDoc.ref, { listNames: updated });
                }
            } else {
                // Move action
                const updated = recipeDoc.data().listNames.filter(l => l !== listName);
                if (!updated.includes('Saved')) updated.push('Saved');
                batch.update(recipeDoc.ref, { listNames: updated });
            }
        });

        // Legacy catch
        const qLegacy = query(collection(db, `users/${uid}/savedRecipes`), where('listName', '==', listName));
        const snapshotLegacy = await getDocs(qLegacy);
        snapshotLegacy.docs.forEach((recipeDoc) => {
             if (recipeAction === 'delete') {
                  batch.delete(recipeDoc.ref);
             } else {
                  batch.update(recipeDoc.ref, { listName: '', listNames: ['Saved'] });
             }
        });

        await batch.commit();
    } catch (error) {
        console.error('Error deleting custom list:', error);
        throw error;
    }
}
