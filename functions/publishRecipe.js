const admin = require('firebase-admin');
const { identifyCaller, TIER_ADMIN } = require('./security/callerTier');
const { uploadImageToStorage } = require('./imageGen/imagenService');

/**
 * publishRecipe
 *
 * Promotes a recipe from a user's private shelf into the public catalog.
 *
 * Publishing runs server-side for two reasons. It keeps one authority for who
 * may publish — the `app_config/admin_users` allowlist that `identifyCaller`
 * already reads — instead of the three disagreeing mechanisms the client had.
 * And it uploads the photo with the Admin SDK, so no client ever needs write
 * access to Storage.
 *
 * The gate is deliberately still admin-only. `ROADMAP.md` Phase 4a blocks
 * public publishing on DMCA safe harbor registration. When that is done, this
 * check is the single line that changes.
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Appends -2, -3 … until the slug is free. Mirrors recipeService on the client. */
async function generateUniqueSlug(db, baseSlug) {
  let slug = baseSlug;
  let counter = 2;

  for (;;) {
    const existing = await db.collection('recipes').where('slug', '==', slug).limit(1).get();
    if (existing.empty) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

/**
 * Rejects anything that is not a complete, cooked recipe with the uploader's
 * own photo. The photo requirement is the whole point of the publish gate:
 * a published recipe carries a picture taken by the person who made it.
 */
function validate(payload) {
  const { recipe, image } = payload || {};

  if (!recipe || typeof recipe !== 'object') return 'A recipe is required.';
  if (!recipe.title || !String(recipe.title).trim()) return 'The recipe needs a title.';
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) return 'The recipe needs at least one ingredient.';
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) return 'The recipe needs at least one instruction.';
  if (recipe.triedAndTrue !== true) return 'You have to confirm you cooked this before publishing it.';

  if (!image || typeof image !== 'object') return 'A photo of the finished dish is required to publish.';
  if (!ALLOWED_IMAGE_TYPES.includes(image.contentType)) return 'The photo must be a JPEG, PNG, or WebP.';
  if (!image.data || typeof image.data !== 'string') return 'The photo is missing or unreadable.';

  // base64 inflates by roughly 4/3; compare against the decoded size.
  const approximateBytes = Math.floor((image.data.length * 3) / 4);
  if (approximateBytes > MAX_IMAGE_BYTES) return 'That photo is too large. Please use one under 5MB.';

  return null;
}

async function publishRecipe(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  let caller;
  try {
    caller = await identifyCaller(req);
  } catch (authError) {
    res.status(401).json({ error: authError.message });
    return;
  }

  if (caller.tier !== TIER_ADMIN) {
    res.status(403).json({
      error: 'Publishing to the public catalog is not open yet. Your recipe stays on your shelf.'
    });
    return;
  }

  const validationError = validate(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { recipe, image } = req.body;

  try {
    const db = admin.firestore();
    const baseSlug = slugify(recipe.slug || recipe.id || recipe.title);
    const slug = await generateUniqueSlug(db, baseSlug);

    const imageUrl = await uploadImageToStorage(image.data, slug, image.contentType);
    if (!imageUrl) {
      // Never publish without the photo: a recipe with no image is exactly the
      // state the publish gate exists to prevent.
      res.status(502).json({ error: 'We could not store your photo, so the recipe was not published. Please try again.' });
      return;
    }

    const payload = { ...recipe };
    delete payload._extractionMeta;
    if (Array.isArray(payload.stepIngredients)) {
      payload.stepIngredients = JSON.stringify(payload.stepIngredients);
    }

    await db.collection('recipes').add({
      ...payload,
      id: slug,
      slug,
      image: imageUrl,
      publishedBy: caller.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ slug, image: imageUrl });
  } catch (error) {
    console.error('Publish failed:', error);
    res.status(500).json({ error: 'Something went wrong publishing the recipe. Your shelf copy is untouched.' });
  }
}

module.exports = { publishRecipe, slugify, validate };
