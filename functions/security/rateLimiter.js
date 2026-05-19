const admin = require('firebase-admin');

/**
 * Checks and updates the rate limit for a given user email or UID.
 * Rejects if the user has made 10 or more requests within the last hour.
 * 
 * @param {string} userEmailOrUid - The identifier of the user (email or UID).
 * @returns {Promise<void>} Resolves if allowed, throws an error with message 'Too Many Requests' if blocked.
 */
async function checkRateLimit(userEmailOrUid) {
  if (!userEmailOrUid) {
    throw new Error('User identifier is required for rate limiting.');
  }

  const db = admin.firestore();
  const docRef = db.collection('rate_limits').doc(userEmailOrUid);

  await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(docRef);
    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;

    let timestamps = [];
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      timestamps = data.timestamps || [];
    }

    // Standardize and prune old timestamps (older than 1 hour)
    timestamps = timestamps
      .map(ts => {
        if (ts && typeof ts.toDate === 'function') {
          return ts.toDate().getTime();
        }
        if (typeof ts === 'string') {
          return new Date(ts).getTime();
        }
        return Number(ts);
      })
      .filter(ts => !isNaN(ts) && ts > oneHourAgo);

    if (timestamps.length >= 10) {
      throw new Error('Too Many Requests: Rate limit exceeded. Maximum 10 extractions per hour.');
    }

    // Add current timestamp
    timestamps.push(now);

    // Save back inside the transaction
    transaction.set(docRef, { timestamps }, { merge: true });
  });
}

module.exports = {
  checkRateLimit
};
