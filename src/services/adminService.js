import { auth } from '../config/firebase';

/**
 * adminService.js
 * Catalog operations restricted to the admin allowlist.
 *
 * The client cannot read `app_config/admin_users` — `firestore.rules` denies it
 * — so it asks the server what it is allowed to do rather than inferring from a
 * profile field. Every one of these calls is re-checked server-side; the
 * capability answer only decides what the UI offers.
 */

function endpoint(name) {
  const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  return isEmulator
    ? `http://127.0.0.1:5001/recifree-web-4731f/us-central1/${name}`
    : `https://us-central1-recifree-web-4731f.cloudfunctions.net/${name}`;
}

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Asks the server what this caller may do.
 * Returns { admin: false } on any failure — the safe direction, since a
 * missing answer must never reveal destructive controls.
 */
export async function fetchCapabilities() {
  try {
    const user = auth.currentUser;
    if (!user) return { admin: false };

    const response = await fetch(endpoint('capabilities'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }
    });
    if (!response.ok) return { admin: false };
    return await response.json();
  } catch {
    return { admin: false };
  }
}

/** Removes a recipe from the public catalog. Admin only, enforced server-side. */
export async function deleteRecipe(slug) {
  const response = await fetch(endpoint('deleteRecipe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ slug })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.error || `HTTP error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
