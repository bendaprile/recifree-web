import { collection, doc, setDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * shelfService.js
 * Firestore operations for a user's private shelf: recipes they have extracted
 * but not published to the public catalog.
 *
 * A shelf recipe is only ever visible to its owner. It lives at
 * `users/{uid}/shelf/{recipeId}` and never touches the public `recipes`
 * collection until the user publishes it.
 */

/**
 * Firestore cannot store arrays of arrays, so stepIngredients is persisted as a
 * JSON string. Both directions are trapped here so callers only ever handle the
 * standard Recifree schema.
 */
function toFirestoreShape(recipe) {
  const payload = { ...recipe };
  if (Array.isArray(payload.stepIngredients)) {
    payload.stepIngredients = JSON.stringify(payload.stepIngredients);
  }
  return payload;
}

function fromFirestoreShape(data) {
  const recipe = { ...data };
  if (typeof recipe.stepIngredients === 'string') {
    try {
      recipe.stepIngredients = JSON.parse(recipe.stepIngredients);
    } catch {
      recipe.stepIngredients = [];
    }
  }
  return recipe;
}

/**
 * Reads every recipe on a user's shelf.
 * Returns an empty array rather than throwing, so a Firestore outage degrades
 * to an empty shelf instead of a broken page.
 */
export async function getUserShelf(uid) {
  if (!uid) return [];
  try {
    const snapshot = await getDocs(collection(db, `users/${uid}/shelf`));
    return snapshot.docs.map(d => fromFirestoreShape({ ...d.data(), id: d.id }));
  } catch (error) {
    console.error('[shelfService] Failed to read shelf:', error);
    return [];
  }
}

/**
 * Writes one recipe to a user's shelf. Overwrites any existing entry with the
 * same id, which is what makes re-extracting a URL idempotent.
 */
export async function addToShelf(uid, recipe) {
  if (!uid) throw new Error('User must be authenticated to write to the shelf');
  if (!recipe?.id) throw new Error('Shelf recipes require an id');

  const payload = toFirestoreShape(recipe);
  delete payload.id; // The document id carries it; storing it twice invites drift.

  await setDoc(doc(db, `users/${uid}/shelf`, recipe.id), {
    ...payload,
    shelvedAt: serverTimestamp()
  });
}

/** Removes one recipe from a user's shelf. */
export async function removeFromShelf(uid, recipeId) {
  if (!uid) throw new Error('User must be authenticated to modify the shelf');
  await deleteDoc(doc(db, `users/${uid}/shelf`, recipeId));
}
