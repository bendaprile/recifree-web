const crypto = require('crypto');
const admin = require('firebase-admin');
const { verifyAdminAllowlist } = require('./adminGate');

/**
 * Who is calling extractRecipe, and what are they allowed to cost.
 *
 * ADMIN      — on the Firestore allowlist. May use the paid layers: the Gemini
 *              LLM fallback and Imagen photo generation.
 * RESTRICTED — everyone else, signed in or not. Parser layers only. No call
 *              that spends API budget may run for this tier.
 *
 * The tier exists so an anonymous visitor can extract a recipe onto their
 * private shelf without being able to run up a bill.
 */
const TIER_ADMIN = 'admin';
const TIER_RESTRICTED = 'restricted';

/**
 * Rate limiting needs a stable key for anonymous callers. Store a hash rather
 * than the address itself: Recifree does not keep a log of who read what, and
 * a raw IP in Firestore would be exactly that.
 */
function anonymousId(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' && forwarded.length > 0)
    ? forwarded.split(',')[0].trim()
    : (req.ip || 'unknown');

  return 'anon_' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

/**
 * Identifies the caller and the spend tier they are entitled to.
 *
 * Throws only when a token is present but invalid. A missing token is not an
 * error — it is an anonymous caller, who is allowed in at the restricted tier.
 *
 * @param {object} req
 * @returns {Promise<{id: string, tier: string}>}
 */
async function identifyCaller(req) {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    if (isEmulator) {
      console.warn('⚠️ Emulator detected: proceeding as the admin test user.');
      return { id: 'admin-emulator-test@recifree.com', tier: TIER_ADMIN };
    }
    return { id: anonymousId(req), tier: TIER_RESTRICTED };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new Error('UNAUTHORIZED: Invalid Authorization Header format');
  }

  let email;
  try {
    const decodedToken = await admin.auth().verifyIdToken(parts[1]);
    email = decodedToken.email;
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    throw new Error(`UNAUTHORIZED: ${error.message}`);
  }

  try {
    await verifyAdminAllowlist(email);
    return { id: email, tier: TIER_ADMIN };
  } catch {
    // A signed-in non-admin is a legitimate caller, just not a paying one.
    return { id: email || anonymousId(req), tier: TIER_RESTRICTED };
  }
}

module.exports = {
  identifyCaller,
  anonymousId,
  TIER_ADMIN,
  TIER_RESTRICTED
};
