import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUserShelf, addToShelf, removeFromShelf } from '../services/shelfService';

/**
 * ShelfContext
 * The user's collection of recipes they brought in themselves.
 *
 * An entry is one of two things:
 *   - a private draft, holding the full recipe, visible only to its owner
 *   - a published reference, holding just the slug, pointing at the public
 *     catalog copy
 *
 * Publishing converts the first into the second. It deliberately does not keep
 * a second copy of the recipe: two copies drift, and the public one has to win.
 * The shelf page resolves references against the catalog for display.
 *
 * Signed out, the shelf lives in localStorage and is explicitly at risk — the UI
 * must tell the user they will lose it without an account. On sign-in, the local
 * shelf drains into Firestore and the local copy is cleared, so nothing a user
 * extracted before signing up is thrown away.
 */

export const SHELF_PRIVATE = 'private';
export const SHELF_PUBLISHED = 'published';

const LOCAL_STORAGE_KEY = 'recifree_shelf';

const ShelfContext = createContext();

export function useShelf() {
  return useContext(ShelfContext);
}

function readLocalShelf() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to read shelf from localStorage', error);
    return [];
  }
}

function writeLocalShelf(recipes) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recipes));
  } catch (error) {
    console.error('Failed to write shelf to localStorage', error);
  }
}

export function ShelfProvider({ children }) {
  const { currentUser, loadingAuth } = useAuth();
  const [shelf, setShelf] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadShelf() {
      setLoading(true);
      try {
        if (currentUser) {
          // Drain anything extracted while signed out, then clear it locally so
          // the same recipe is not counted twice on the next sign-in.
          const localShelf = readLocalShelf();
          for (const recipe of localShelf) {
            await addToShelf(currentUser.uid, recipe);
          }
          if (localShelf.length > 0) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }

          const stored = await getUserShelf(currentUser.uid);
          if (isMounted) setShelf(stored);
        } else if (isMounted) {
          setShelf(readLocalShelf());
        }
      } catch (error) {
        console.error('Failed to load shelf', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (loadingAuth) return;
    loadShelf();

    return () => { isMounted = false; };
  }, [currentUser, loadingAuth]);

  const isOnShelf = useCallback(
    (recipeId) => shelf.some(r => r.id === recipeId),
    [shelf]
  );

  // Entries written before status existed are drafts.
  const privateRecipes = shelf.filter(r => r.status !== SHELF_PUBLISHED);
  const publishedRefs = shelf.filter(r => r.status === SHELF_PUBLISHED);

  /**
   * Adds a recipe to the shelf, or replaces the existing entry with the same id.
   * Re-extracting the same URL updates in place rather than duplicating.
   */
  const shelveRecipe = useCallback(async (recipe) => {
    if (!recipe?.id) throw new Error('Shelf recipes require an id');

    const next = [...shelf.filter(r => r.id !== recipe.id), recipe];
    setShelf(next);

    if (currentUser) {
      await addToShelf(currentUser.uid, recipe);
    } else {
      writeLocalShelf(next);
    }
  }, [shelf, currentUser]);

  /**
   * Converts a draft into a reference once it reaches the public catalog.
   * Keeps the entry so the author can still find what they contributed, while
   * leaving exactly one copy of the recipe itself.
   */
  const markPublished = useCallback(async (recipeId, slug) => {
    const reference = {
      id: recipeId,
      slug,
      status: SHELF_PUBLISHED,
      publishedAt: new Date().toISOString()
    };
    const next = [...shelf.filter(r => r.id !== recipeId), reference];
    setShelf(next);

    if (currentUser) {
      await addToShelf(currentUser.uid, reference);
    } else {
      writeLocalShelf(next);
    }
  }, [shelf, currentUser]);

  const unshelveRecipe = useCallback(async (recipeId) => {
    const next = shelf.filter(r => r.id !== recipeId);
    setShelf(next);

    if (currentUser) {
      await removeFromShelf(currentUser.uid, recipeId);
    } else {
      writeLocalShelf(next);
    }
  }, [shelf, currentUser]);

  const value = {
    shelf,
    privateRecipes,
    publishedRefs,
    loading,
    isOnShelf,
    shelveRecipe,
    markPublished,
    unshelveRecipe,
    // True when the shelf is only in localStorage and would be lost.
    // Only drafts are at risk; a published reference can be rebuilt from the catalog.
    isAtRisk: !currentUser && privateRecipes.length > 0
  };

  return (
    <ShelfContext.Provider value={value}>
      {children}
    </ShelfContext.Provider>
  );
}
