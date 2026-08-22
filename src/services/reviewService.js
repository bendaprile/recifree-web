import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

/**
 * reviewService.js
 *
 * Ratings and reviews, stored at `reviews/{slug}/entries/{uid}`.
 *
 * Keyed by slug rather than by document id because a server-rendered recipe
 * page hydrates from the document's fields and never learns its Firestore id.
 * Keyed by uid because that makes one review per account per recipe structural:
 * a second review overwrites the first instead of stacking.
 *
 * Display only. Nothing here changes what any reader is shown — no ranking, no
 * ordering, no badge — which is what makes a sockpuppet account worthless.
 * `firestore.rules` enforces the same limits this file does, and
 * `npm run prove:reviews` checks them against the emulator.
 */

export const MAX_REVIEW_TEXT = 1000;

function entriesPath(slug) {
  return `reviews/${slug}/entries`;
}

/**
 * Rejects a review the rules would reject anyway, but with a sentence a person
 * can act on instead of a permission error.
 *
 * @returns {string|null} The problem, or null when the review is fine.
 */
export function validateReview({ rating, text } = {}) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'Choose a rating from 1 to 5 stars.';
  }
  if (typeof text !== 'string') {
    return 'Review text must be text.';
  }
  if (text.length > MAX_REVIEW_TEXT) {
    return `Keep your review under ${MAX_REVIEW_TEXT} characters.`;
  }
  return null;
}

/**
 * Every review of one recipe, newest first.
 *
 * Returns an empty list on failure rather than throwing: a recipe page that
 * cannot reach the reviews collection should still show the recipe.
 */
export async function getReviews(slug) {
  if (!slug) return [];

  try {
    const snapshot = await getDocs(collection(db, entriesPath(slug)));
    return snapshot.docs
      .map(entry => ({ uid: entry.id, ...entry.data() }))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/** Firestore hands back a Timestamp; a just-written document hands back null. */
function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return new Date(value).getTime() || 0;
}

/**
 * Writes the signed-in user's review of a recipe, creating or replacing it.
 *
 * The author name is read from the signed-in user rather than accepted as an
 * argument, because `firestore.rules` pins it to the name the identity provider
 * issued. A caller cannot sign a review with someone else's name, and this
 * keeps that invariant in one place.
 */
export async function saveReview(slug, { rating, text }) {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to review a recipe.');
  if (!user.emailVerified) throw new Error('Verify your email address before reviewing a recipe.');

  const problem = validateReview({ rating, text });
  if (problem) throw new Error(problem);

  const ref = doc(db, entriesPath(slug), user.uid);
  const existing = await getDoc(ref);

  await setDoc(ref, {
    rating,
    text: text.trim(),
    authorName: user.displayName || null,
    // Preserved across an edit, so revising a review does not make it look new.
    createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/** Removes the signed-in user's own review. */
export async function deleteReview(slug) {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to remove a review.');

  await deleteDoc(doc(db, entriesPath(slug), user.uid));
}

/**
 * The average and count shown above the list.
 *
 * Computed from the reviews already on the page rather than denormalised onto
 * the recipe, because at this phase the number is displayed and nothing else
 * reads it. A stored counter would need a transaction to stay honest and would
 * be the first step towards ranking, which Phase 4a deliberately does not have.
 */
export function summarizeReviews(reviews = []) {
  const rated = reviews.filter(r => Number.isInteger(r.rating));
  if (rated.length === 0) return { count: 0, average: null };

  const total = rated.reduce((sum, r) => sum + r.rating, 0);
  return {
    count: rated.length,
    average: Math.round((total / rated.length) * 10) / 10
  };
}
