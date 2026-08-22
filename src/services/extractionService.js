import { auth } from '../config/firebase';

/**
 * Initiates the recipe extraction from a URL using the Cloud Function.
 *
 * @param {string} recipeUrl - The recipe URL to extract.
 * @returns {Promise<Object>} The extracted recipe data in the Recifree schema.
 */
export async function extractRecipeFromUrl(recipeUrl) {
  // Signed out is a supported case. The backend admits anonymous callers at a
  // restricted tier: free parser layers only, never the paid Gemini fallback.
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  const endpoint = isEmulator 
    ? 'http://127.0.0.1:5001/recifree-web-4731f/us-central1/extractRecipe'
    : 'https://us-central1-recifree-web-4731f.cloudfunctions.net/extractRecipe';
    
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Omitted entirely when signed out; a Bearer header with no token is a 401.
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ url: recipeUrl })
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.error || `HTTP error ${response.status}`);
    error.status = response.status;
    // Set when the parser layers found nothing and the caller is not entitled
    // to the AI fallback. The UI offers manual entry rather than a dead end.
    error.canRetryManually = Boolean(errData.canRetryManually);
    throw error;
  }
  
  return response.json();
}
