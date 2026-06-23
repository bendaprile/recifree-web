const crypto = require('crypto');
const admin = require('firebase-admin');

/**
 * Normalizes a URL:
 * - Converts host to lowercase.
 * - Strips trailing slash.
 * - Strips anchor/hash (#...).
 * - Drops UTM marketing params: utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid.
 * - Sorts remaining query parameters deterministically.
 * 
 * @param {string} urlStr
 * @returns {string} Normalized URL
 */
function normalizeUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (err) {
    throw new Error('Invalid URL');
  }

  // Lowercase hostname (URL standard already does this, but let's be safe)
  const host = parsed.hostname.toLowerCase();

  // Handle standard marketing query parameters
  const searchParams = new URLSearchParams(parsed.search);
  const marketingParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid'
  ];

  marketingParams.forEach(param => {
    searchParams.delete(param);
  });

  // Sort remaining parameters for determinism
  searchParams.sort();

  const searchStr = searchParams.toString();
  const queryPart = searchStr ? `?${searchStr}` : '';

  // Standardize path (remove trailing slash unless it's just '/')
  let pathname = parsed.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Construct normalized URL
  const protocol = parsed.protocol.toLowerCase();
  const portPart = parsed.port ? `:${parsed.port}` : '';
  const domainPart = host + portPart;

  let normalized = `${protocol}//${domainPart}${pathname}${queryPart}`;

  // Strip trailing slash of normalized URL (e.g. if it ended in '/' with empty path)
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Creates a SHA-256 hash of the normalized URL (hex representation).
 * 
 * @param {string} normalizedUrl
 * @returns {string} Hex representation of the SHA-256 hash
 */
function hashUrl(normalizedUrl) {
  if (!normalizedUrl || typeof normalizedUrl !== 'string') {
    throw new Error('Normalized URL must be a non-empty string');
  }
  return crypto.createHash('sha256').update(normalizedUrl).digest('hex');
}

/**
 * Checks Firestore collection 'extraction_cache' for cached recipe document.
 * If hit, returns data with cacheHit metadata.
 * 
 * @param {string} urlHash
 * @returns {Promise<object|null>} Cached recipe data or null
 */
async function checkCache(urlHash) {
  if (!urlHash) return null;
  
  try {
    const db = admin.firestore();
    const docRef = db.collection('extraction_cache').doc(urlHash);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      if (data) {
        if (!data._extractionMeta) {
          data._extractionMeta = {};
        }
        data._extractionMeta.cacheHit = true;

        if (data.stepIngredients && typeof data.stepIngredients === 'string') {
          try {
            data.stepIngredients = JSON.parse(data.stepIngredients);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }

        return data;
      }
    }
  } catch (error) {
    console.error('Error checking extraction cache:', error);
  }
  
  return null;
}

/**
 * Saves successfully parsed/normalized recipe to 'extraction_cache' collection.
 * 
 * @param {string} urlHash
 * @param {object} recipeData
 * @returns {Promise<void>}
 */
async function saveToCache(urlHash, recipeData) {
  if (!urlHash || !recipeData) return;
  
  try {
    const db = admin.firestore();
    const docRef = db.collection('extraction_cache').doc(urlHash);

    const payload = { ...recipeData };
    if (Array.isArray(payload.stepIngredients)) {
      payload.stepIngredients = JSON.stringify(payload.stepIngredients);
    }

    await docRef.set(payload);
  } catch (error) {
    console.error('Error saving to extraction cache:', error);
  }
}

module.exports = {
  normalizeUrl,
  hashUrl,
  checkCache,
  saveToCache
};
