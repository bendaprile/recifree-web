import { auth } from '../config/firebase';

/**
 * publishService.js
 * Promotes a shelf recipe into the public catalog via the publishRecipe
 * Cloud Function, which is the only thing allowed to write to `recipes`.
 */

// Phone photos routinely run 4000px and 8MB. Recifree promises sub-second
// loads, and the function receives the image base64-encoded in the request
// body, so downscale before either becomes a problem.
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.82;

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function endpoint() {
  const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  return isEmulator
    ? 'http://127.0.0.1:5001/recifree-web-4731f/us-central1/publishRecipe'
    : 'https://us-central1-recifree-web-4731f.cloudfunctions.net/publishRecipe';
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
    img.src = url;
  });
}

/**
 * Downscales to fit MAX_EDGE_PX and re-encodes as JPEG.
 * Returns { data, contentType } where data is base64 without the data: prefix.
 */
export async function prepareImage(file) {
  if (!file) throw new Error('Choose a photo of the finished dish.');
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('The photo must be a JPEG, PNG, or WebP.');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return {
    data: dataUrl.split(',')[1],
    contentType: 'image/jpeg'
  };
}

/**
 * Publishes a shelf recipe. Requires a signed-in caller on the admin
 * allowlist; the function rejects everyone else while DMCA registration is
 * outstanding.
 *
 * @returns {Promise<{slug: string, image: string}>}
 */
export async function publishRecipe(recipe, imageFile) {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to publish a recipe.');

  const image = await prepareImage(imageFile);
  const token = await user.getIdToken();

  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ recipe, image })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.error || `HTTP error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
