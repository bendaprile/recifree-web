/**
 * Finds an already-published recipe by the URL it was adapted from.
 *
 * Paste deduplication: when a user pastes a URL someone has already published,
 * Recifree routes them to that recipe instead of extracting a second copy of
 * it. Two copies of one recipe split the reviews, the saves, and the search
 * ranking, and the reader has no way to tell which one to trust.
 *
 * The key is the SHA-256 of the normalized URL from `cache/extractionCache.js`,
 * the same key the extraction cache uses, so `?utm_source=`, a trailing slash,
 * and a reordered query string all match.
 */

/**
 * @param {object} db Firestore instance
 * @param {string} urlHash SHA-256 of the normalized source URL
 * @returns {Promise<string|null>} The slug of the published recipe, or null
 */
async function findPublishedByUrlHash(db, urlHash) {
  if (!urlHash) return null;

  try {
    const snapshot = await db
      .collection('recipes')
      .where('sourceUrlHash', '==', urlHash)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const data = snapshot.docs[0].data();
    return (data && data.slug) || null;
  } catch (error) {
    // A failed lookup means the extraction proceeds as though nothing matched.
    // A duplicate is a worse outcome than an extra parse, but a dead extraction
    // is worse than both.
    console.error('Duplicate lookup failed:', error.message);
    return null;
  }
}

module.exports = { findPublishedByUrlHash };
