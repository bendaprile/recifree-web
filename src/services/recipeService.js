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

/** @returns {Promise<Object[]>} All recipes, sorted by title */
export async function getAllRecipes() {
  const start = performance.now();
  console.info('[recipeService] Starting getAllRecipes fetch...');
  try {
    const recipesRef = collection(db, 'recipes');
    const snapshot = await getDocs(recipesRef);
    const end = performance.now();
    console.info(`[recipeService] getAllRecipes took ${Math.round(end - start)}ms for ${snapshot.size} docs.`);

    if (snapshot.empty) {
      console.warn('[recipeService] Firestore recipes collection is empty, using fallback.');
      return staticRecipes;
    }

    return snapshot.docs
      .map(doc => mapRecipeFromFirestore(doc))
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch (err) {
    const end = performance.now();
    console.warn(`[recipeService] Firestore fetch failed after ${Math.round(end - start)}ms:`, err.message);
    return staticRecipes;
  }
}

/**
 * Fetch a single recipe by its URL slug.
 * @param {string} slug - The kebab-case slug (e.g. "hot-honey-feta-chicken")
 * @returns {Promise<Object|null>} The recipe object or null if not found
 */
  // Check for hydration data from the Cloud Function SSR
  if (typeof window !== 'undefined' && window.__INITIAL_RECIPE__) {
    const hydratedData = window.__INITIAL_RECIPE__;
    const isMatch = hydratedData.slug === slug || hydratedData.id === slug;
    
    // Clear the global to prevent stale reuse on subsequent navigations
    window.__INITIAL_RECIPE__ = null;

    if (isMatch) {
      console.info(`[recipeService] Found hydrated data for ${slug} in ${Math.round(performance.now() - start)}ms`);
      // Ensure the hydrated data goes through the same mapping logic as Firestore docs
      return mapRecipeFromHydration(hydratedData);
    }
  }

  try {
    const q = query(collection(db, 'recipes'), where('slug', '==', slug));
    const snapshot = await getDocs(q);
    const end = performance.now();
    console.info(`[recipeService] getRecipeBySlug took ${Math.round(end - start)}ms`);

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return mapRecipeFromFirestore(doc);
  } catch (err) {
    const end = performance.now();
    console.warn(`[recipeService] getRecipeBySlug failed after ${Math.round(end - start)}ms:`, err.message);
    return staticRecipes.find(r => r.id === slug) ?? null;
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
