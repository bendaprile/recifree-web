import { auth } from '../config/firebase';

/**
 * Initiates the recipe extraction from a URL using the Cloud Function.
 *
 * @param {string} recipeUrl - The recipe URL to extract.
 * @returns {Promise<Object>} The extracted recipe data in the Recifree schema.
 */
export async function extractRecipeFromUrl(recipeUrl) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Authentication required to extract recipes.");
  }
  
  const token = await user.getIdToken();
  const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  const endpoint = isEmulator 
    ? 'http://127.0.0.1:5001/recifree-web-4731f/us-central1/extractRecipe'
    : 'https://us-central1-recifree-web-4731f.cloudfunctions.net/extractRecipe';
    
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ url: recipeUrl })
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.error || `HTTP error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  
  return response.json();
}
