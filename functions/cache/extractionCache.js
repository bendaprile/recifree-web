const crypto = require('crypto');
const admin = require('firebase-admin');

/**
 * Parameters that identify a campaign, a click, or a share, and never the
 * page. Two addresses differing only in these are the same recipe.
 *
 * Prefixes cover the families that keep adding members (utm_, Matomo's mtm_
 * and pk_, HubSpot's hsa_); the exact list covers the click ids that do not
 * follow a pattern.
 */
const TRACKING_PREFIXES = ['utm_', 'mtm_', 'pk_', 'piwik_', 'hsa_'];

const TRACKING_PARAMS = [
  // Google
  'gclid', 'gclsrc', 'dclid', 'wbraid', 'gbraid', 'srsltid', '_ga', '_gl',
  // Meta
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'igshid', 'igsh',
  // Other networks
  'msclkid', 'twclid', 'ttclid', 'li_fat_id', 'epik', 'yclid',
  // Email and marketing platforms
  'mc_cid', 'mc_eid', '_hsenc', '_hsmi', 'vero_conv', 'vero_id',
  'oly_anon_id', 'oly_enc_id',
  // Renders the AMP copy of the same page
  'amp'
];

function isTrackingParam(key) {
  const name = key.toLowerCase();
  return TRACKING_PARAMS.includes(name) || TRACKING_PREFIXES.some(prefix => name.startsWith(prefix));
}

/**
 * Canonicalizes a URL into a deduplication key.
 *
 * The result is only ever hashed — `extractRecipe` fetches the URL the user
 * pasted, never this one — so it canonicalizes harder than something you would
 * follow. The bar it has to clear: two addresses a reader would call the same
 * recipe page must produce the same string.
 *
 * What it collapses:
 * - `http` and `https`, which serve the same page on every recipe site that
 *   has not simply switched off port 80.
 * - `www.` and the bare domain.
 * - Host casing, and the default port.
 * - A trailing slash, and a trailing `/amp` segment from a mobile share.
 * - Every tracking parameter (see TRACKING_PARAMS), and the fragment.
 * - Query parameter order.
 *
 * What it deliberately leaves alone: path casing, because a case-sensitive
 * server can serve two different pages, and any subdomain other than `www.`,
 * because those routinely are different sites.
 *
 * Changing any of this changes every key. `sourceUrlHash` values already
 * stored on recipes have to be recomputed with
 * `npm run backfill:source-hash -- --rehash --apply` or deduplication silently
 * stops matching.
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

  // The scheme is not part of a page's identity here. A recipe pasted from an
  // old http bookmark is the recipe that now lives on https.
  const protocol = 'https:';

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

  // The parser has already dropped a default port; a non-default one is part
  // of the address.
  const portPart = parsed.port && parsed.port !== '443' && parsed.port !== '80' ? `:${parsed.port}` : '';

  const searchParams = new URLSearchParams(parsed.search);
  for (const key of [...searchParams.keys()]) {
    if (isTrackingParam(key)) searchParams.delete(key);
  }
  searchParams.sort();

  const searchStr = searchParams.toString();
  const queryPart = searchStr ? `?${searchStr}` : '';

  let pathname = parsed.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  // A mobile share often carries the AMP copy of the page.
  if (pathname.endsWith('/amp')) {
    pathname = pathname.slice(0, -'/amp'.length);
  }

  let normalized = `${protocol}//${host}${portPart}${pathname}${queryPart}`;

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
 * Removes fields that identify the user who performed an extraction.
 *
 * The extraction_cache is keyed on the URL alone and shared across every user,
 * so a document written by one user is returned verbatim to the next user who
 * pastes the same URL. Any identifying field stored here leaks between accounts.
 * Applied on both read and write so documents written before this guard existed
 * are also scrubbed.
 *
 * @param {object} recipeData
 * @returns {object} The same object, with identifying metadata removed
 */
function stripExtractorIdentity(recipeData) {
  if (recipeData && recipeData._extractionMeta) {
    delete recipeData._extractionMeta.extractedBy;
  }
  return recipeData;
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
        stripExtractorIdentity(data);

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
    // Deep-copy the metadata before scrubbing so we never mutate the caller's object.
    if (payload._extractionMeta) {
      payload._extractionMeta = { ...payload._extractionMeta };
    }
    stripExtractorIdentity(payload);
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
  saveToCache,
  stripExtractorIdentity
};
