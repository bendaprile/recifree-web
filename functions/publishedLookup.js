const { parse } = require('node-html-parser');

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

/**
 * The page's own address, as distinct from the one the user pasted.
 *
 * A paste rarely arrives clean. Pinterest and link shorteners redirect, and a
 * publisher's permalink often 301s to a slug-bearing canonical. Each of those
 * hashes differently from the address the reader copied, so without this the
 * same recipe gets extracted a second time.
 *
 * The canonical tag is only trusted when it points at the same host. A site
 * that misconfigures it to another domain would otherwise send readers to
 * someone else's recipe.
 *
 * @param {string} pastedUrl
 * @param {string} finalUrl `response.url` after redirects
 * @param {string} html
 * @returns {string[]} Other addresses for this page, excluding the pasted one
 */
function alternateUrlsFor(pastedUrl, finalUrl, html) {
  const alternates = [];

  if (finalUrl && finalUrl !== pastedUrl) alternates.push(finalUrl);

  const canonical = canonicalFromHtml(html);
  if (canonical && canonical !== pastedUrl && sameHost(canonical, pastedUrl)) {
    alternates.push(canonical);
  }

  return alternates;
}

function canonicalFromHtml(html) {
  if (!html || typeof html !== 'string') return null;

  try {
    const link = parse(html).querySelector('link[rel="canonical"]');
    const href = link && link.getAttribute('href');
    return href ? href.trim() : null;
  } catch {
    return null;
  }
}

function sameHost(a, b) {
  try {
    return new URL(a).hostname.replace(/^www\./, '').toLowerCase()
      === new URL(b).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return false;
  }
}

module.exports = { findPublishedByUrlHash, alternateUrlsFor, canonicalFromHtml };
