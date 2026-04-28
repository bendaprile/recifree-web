import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const USERS_COLLECTION = 'users';

/**
 * Fetches a user profile from Firestore by UID.
 * @param {string} uid The user's Firebase Auth UID.
 * @returns {Promise<Object|null>} The user profile data or null if not found.
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const docRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

/**
 * Creates a new user profile document in Firestore.
 * @param {string} uid The user's Firebase Auth UID.
 * @param {Object} data The initial profile data (e.g., displayName, preferences).
 * @returns {Promise<void>}
 */
export async function createUserProfile(uid, data = {}) {
  if (!uid) throw new Error("A UID is required to create a user profile.");
  
  const defaultProfile = {
    displayName: data.displayName || '',
    measurementPreference: data.measurementPreference || 'imperial',
    dietaryRestrictions: data.dietaryRestrictions || [],
    onboardingComplete: data.onboardingComplete !== undefined ? data.onboardingComplete : true,
    createdAt: new Date().toISOString()
  };

  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, defaultProfile);
  return defaultProfile;
}

/**
 * Updates an existing user profile in Firestore.
 * @param {string} uid The user's Firebase Auth UID.
 * @param {Object} data The profile fields to update.
 * @returns {Promise<void>}
 */
export async function updateUserProfile(uid, data) {
  if (!uid) throw new Error("A UID is required to update a user profile.");
  if (!data) return;

  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, data);
}
