// Proves firestore.rules lets a verified user leave exactly one review of their
// own, and stops everything else. Runs against the local emulator only.
//
// Usage:
//   npm run dev            # in one terminal, to bring the emulators up
//   npm run prove:reviews  # in another
//
// Exits non-zero if any check fails. Creates throwaway users in the auth
// emulator; it never touches production.
import { createRequire } from 'module';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'demo-recifree-web' });

const app = initializeApp({ projectId: 'demo-recifree-web', apiKey: 'fake-api-key' });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const stamp = Date.now();
const slug = `review-proof-${stamp}`;
const results = [];

function record(name, passed, detail) {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

/** Signs in a fresh user and returns { uid, name }. Verified unless told otherwise. */
async function makeUser(tag, { verified = true, displayName = null } = {}) {
  const cred = await createUserWithEmailAndPassword(auth, `${tag}-${stamp}@example.com`, 'password123');
  const uid = cred.user.uid;

  if (verified || displayName) {
    await admin.auth().updateUser(uid, {
      ...(verified ? { emailVerified: true } : {}),
      ...(displayName ? { displayName } : {})
    });
    // Rules read the token, not the account, so it has to be reissued.
    await cred.user.getIdToken(true);
  }

  return { uid, name: displayName };
}

const entry = (uid) => doc(db, `reviews/${slug}/entries`, uid);
const review = (over = {}) => ({ rating: 5, text: 'Made it twice.', authorName: null, createdAt: new Date().toISOString(), ...over });

async function denied(name, fn) {
  try {
    await fn();
    record(name, false, 'the write SUCCEEDED — rules are open');
  } catch (e) {
    record(name, e.code === 'permission-denied', e.code);
  }
}

// 1. A verified user reviews a recipe.
const alice = await makeUser('alice', { displayName: 'Alice Cook' });
try {
  await setDoc(entry(alice.uid), review({ authorName: 'Alice Cook' }));
  record('verified user can review a recipe', true);
} catch (e) {
  record('verified user can review a recipe', false, e.code || e.message);
}

// 2. Their own bad data is still refused.
await denied('a rating above 5 is refused', () => setDoc(entry(alice.uid), review({ rating: 6, authorName: 'Alice Cook' })));
await denied('a rating below 1 is refused', () => setDoc(entry(alice.uid), review({ rating: 0, authorName: 'Alice Cook' })));
await denied('a non-integer rating is refused', () => setDoc(entry(alice.uid), review({ rating: 4.5, authorName: 'Alice Cook' })));
await denied('review text over 1000 characters is refused', () => setDoc(entry(alice.uid), review({ text: 'x'.repeat(1001), authorName: 'Alice Cook' })));
await denied('an unexpected field is refused', () => setDoc(entry(alice.uid), review({ authorName: 'Alice Cook', helpfulVotes: 99 })));
await denied('signing a review with another name is refused', () => setDoc(entry(alice.uid), review({ authorName: 'Gordon Ramsay' })));

// 3. Everyone can read reviews, including signed-out readers.
await signOut(auth);
try {
  const snap = await getDoc(entry(alice.uid));
  record('a signed-out reader can read reviews', snap.exists() && snap.data().rating === 5);
} catch (e) {
  record('a signed-out reader can read reviews', false, e.code);
}
await denied('a signed-out visitor cannot review', () => setDoc(entry('anyone'), review()));

// 4. An unverified account cannot review.
const chris = await makeUser('chris', { verified: false });
await denied('an unverified account cannot review', () => setDoc(entry(chris.uid), review()));

// 5. One account cannot write or delete another account's review.
await signOut(auth);
const mallory = await makeUser('mallory', { displayName: 'Mallory' });
await denied('one account cannot write a review as another', () => setDoc(entry(alice.uid), review({ authorName: 'Mallory' })));
await denied('one account cannot delete another account review', () => deleteDoc(entry(alice.uid)));

// 6. A user can delete their own.
await signOut(auth);
const dana = await makeUser('dana');
await setDoc(entry(dana.uid), review());
try {
  await deleteDoc(entry(dana.uid));
  record('a user can delete their own review', true);
} catch (e) {
  record('a user can delete their own review', false, e.code);
}

const failed = results.filter(r => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
