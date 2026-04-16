/**
 * recipeService.js
 *
 * The single source of truth for recipe data access. All pages and components
 * should use these functions rather than importing data directly.
 *
 * Strategy:
 *  1. Try Firestore (production + emulator)
 *  2. Fall back to local static JSON if Firestore is unavailable (tests, CI)
 */
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import staticRecipes from '../data/recipes';

/**
 * Helper to wrap a promise with a timeout.
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Error message if timed out
 */
function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

const FIRESTORE_TIMEOUT = 3000; // 3 seconds is plenty for healthy Firestore

/** @returns {Promise<Object[]>} All recipes, sorted by title */
export async function getAllRecipes() {
  try {
    const recipesRef = collection(db, 'recipes');
    const snapshot = await withTimeout(
      getDocs(recipesRef),
      FIRESTORE_TIMEOUT,
      'Firestore connection timed out'
    );

    if (snapshot.empty) {
      return staticRecipes;
    }

    return snapshot.docs
      .map(doc => mapRecipeFromFirestore(doc))
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch (err) {
    return staticRecipes;
  }
}

export async function getRecipeBySlug(slug) {
  // Check for hydration data from the Cloud Function SSR
  if (typeof window !== 'undefined' && window.__INITIAL_RECIPE__) {
    const hydratedData = window.__INITIAL_RECIPE__;
    const isMatch = hydratedData.slug === slug || hydratedData.id === slug;
    
    // Clear the global to prevent stale reuse on subsequent navigations
    window.__INITIAL_RECIPE__ = null;

    if (isMatch) {
      // Ensure the hydrated data goes through the same mapping logic as Firestore docs
      return mapRecipeFromHydration(hydratedData);
    }
  }

  try {
    const q = query(collection(db, 'recipes'), where('slug', '==', slug));
    const snapshot = await withTimeout(
      getDocs(q),
      FIRESTORE_TIMEOUT,
      'Firestore connection timed out'
    );

    if (snapshot.empty) {
      // Fallback to static recipes if not found in DB (essential for local dev/emulator)
      return staticRecipes.find(r => r.id === slug || r.slug === slug) ?? null;
    }

    const doc = snapshot.docs[0];
    return mapRecipeFromFirestore(doc);
  } catch (err) {
    return staticRecipes.find(r => r.id === slug || r.slug === slug) ?? null;
  }
}

/**
 * Check if a slug is already taken in the database.
 * @param {string} slug
 * @returns {Promise<boolean>}
 */
export async function isSlugTaken(slug) {
  try {
    const q = query(collection(db, 'recipes'), where('slug', '==', slug));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch {
    return false;
  }
}

/**
 * Generate a unique slug, appending a numeric suffix if needed.
 * e.g. "chicken-soup" → "chicken-soup-2" → "chicken-soup-3"
 * @param {string} baseSlug
 * @returns {Promise<string>}
 */
export async function generateUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let taken = await isSlugTaken(slug);
  let counter = 2;
  while (taken) {
    slug = `${baseSlug}-${counter}`;
    taken = await isSlugTaken(slug);
    counter++;
  }
  return slug;
}

/**
 * Add a new recipe to Firestore. Handles slug uniqueness automatically.
 * The Firestore document ID is auto-generated; the slug is stored as a field.
 * @param {Object} recipeData - Recipe object matching the Recifree schema
 * @returns {Promise<{docId: string, slug: string}>}
 */
export async function addRecipe(recipeData) {
  const baseSlug = recipeData.id || recipeData.slug;
  const uniqueSlug = await generateUniqueSlug(baseSlug);

  const docRef = await addDoc(collection(db, 'recipes'), {
    ...recipeData,
    id: uniqueSlug,     // keep id === slug for JSON compatibility
    slug: uniqueSlug,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { docId: docRef.id, slug: uniqueSlug };
}

/**
 * Maps a Firestore document to a plain recipe object.
 * Reconstitutes stringified stepIngredients back into an array of arrays.
 */
function mapRecipeFromFirestore(doc) {
  const data = doc.data();
  return {
    ...mapRecipeData(data),
    _docId: doc.id
  };
}

/**
 * Maps hydrated data (already a plain object) to a recipe object.
 */
function mapRecipeFromHydration(data) {
  return mapRecipeData(data);
}

/**
 * Shared mapping logic for recipe data (handles stepIngredients parsing).
 */
function mapRecipeData(data) {
  if (data.stepIngredients && typeof data.stepIngredients === 'string') {
    try {
      data.stepIngredients = JSON.parse(data.stepIngredients);
    } catch {
      // Keep it as a string or fallback if parsing fails
    }
  }
  return data;
}
