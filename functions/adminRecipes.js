const admin = require('firebase-admin');
const { identifyCaller, TIER_ADMIN } = require('./security/callerTier');

/**
 * Admin operations on the public catalog.
 *
 * Deletion lives server-side for the same reason publishing does: the
 * `app_config/admin_users` allowlist is the one authority, and `firestore.rules`
 * stays locked so no client can mutate `recipes` directly.
 *
 * This is not a convenience feature. DMCA safe harbor requires removing
 * infringing material expeditiously on a valid notice, which is impossible
 * without it. See the Opening the doors checklist in ROADMAP.md.
 */

function cors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

/**
 * Reports what the caller is allowed to do.
 *
 * The client cannot read `app_config/admin_users` — `firestore.rules` denies it
 * — and no account carries an admin custom claim. Without this, the UI has no
 * way to know whether to offer destructive controls, and would either hide them
 * from admins or show them to everyone.
 */
async function capabilities(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const caller = await identifyCaller(req);
    res.status(200).json({ admin: caller.tier === TIER_ADMIN });
  } catch {
    // An unreadable token is not an error worth surfacing here; it simply
    // means no elevated capabilities.
    res.status(200).json({ admin: false });
  }
}

/** Removes every stored image for a recipe. Best effort: a missing object must
 *  not stop the document deletion, or a half-deleted recipe stays visible. */
async function deleteStoredImages(slug) {
  try {
    const { getStorageBucket } = require('./imageGen/imagenService');
    const bucket = await getStorageBucket();
    await bucket.deleteFiles({ prefix: `recipes/${slug}/` });
  } catch (error) {
    console.warn(`Could not remove stored images for ${slug}: ${error.message}`);
  }
}

async function deleteRecipe(req, res) {
  cors(res);
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
    res.status(403).json({ error: 'Only an administrator can remove a recipe from the catalog.' });
    return;
  }

  const slug = req.body && req.body.slug;
  if (!slug || typeof slug !== 'string') {
    res.status(400).json({ error: 'A recipe slug is required.' });
    return;
  }

  try {
    const db = admin.firestore();
    const matches = await db.collection('recipes').where('slug', '==', slug).get();

    if (matches.empty) {
      res.status(404).json({ error: 'No recipe with that slug.' });
      return;
    }

    const batch = db.batch();
    matches.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    await deleteStoredImages(slug);

    console.log(`Recipe "${slug}" removed from the catalog by ${caller.id}`);
    res.status(200).json({ slug, deleted: matches.size });
  } catch (error) {
    console.error('Recipe deletion failed:', error);
    res.status(500).json({ error: 'Could not remove the recipe. Nothing was changed.' });
  }
}

module.exports = { capabilities, deleteRecipe };
