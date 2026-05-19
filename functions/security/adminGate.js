const admin = require('firebase-admin');

/**
 * Verifies if the decoded email is present in the Firestore-managed admin allowlist.
 * 
 * @param {string} decodedEmail - The email of the authenticated user.
 * @returns {Promise<boolean>} True if authorized, otherwise throws an error.
 */
async function verifyAdminAllowlist(decodedEmail) {
  if (process.env.FUNCTIONS_EMULATOR === 'true' && decodedEmail === 'admin-emulator-test@recifree.com') {
    return true;
  }

  if (!decodedEmail) {
    throw new Error('FORBIDDEN: No email provided for verification.');
  }

  const db = admin.firestore();
  const docSnap = await db.collection('app_config').doc('admin_users').get();

  if (!docSnap.exists) {
    throw new Error('FORBIDDEN: Admin configuration not found.');
  }

  const data = docSnap.data() || {};
  const allowlist = data.allowlist;

  if (!allowlist || !Array.isArray(allowlist)) {
    throw new Error('FORBIDDEN: Admin allowlist is missing or invalid.');
  }

  if (!allowlist.includes(decodedEmail)) {
    throw new Error(`FORBIDDEN: User ${decodedEmail} is not authorized to extract recipes.`);
  }

  return true;
}

module.exports = {
  verifyAdminAllowlist
};
