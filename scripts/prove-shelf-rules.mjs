// Proves firestore.rules keeps one user's shelf out of another user's hands.
// Runs against the local emulator only.
//
// Usage:
//   npm run dev          # in one terminal, to bring the emulators up
//   npm run prove:rules  # in another
//
// Exits non-zero if any check fails, so it is safe to wire into CI once the
// emulator runs there. Creates throwaway users in the auth emulator; it never
// touches production.
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } from 'firebase/firestore';

const app = initializeApp({ projectId: 'demo-recifree-web', apiKey: 'fake-api-key' });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const stamp = Date.now();
const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function makeUser(tag) {
  const cred = await createUserWithEmailAndPassword(auth, `${tag}-${stamp}@example.com`, 'password123');
  return cred.user.uid;
}

const aliceUid = await makeUser('alice');
const alicePath = `users/${aliceUid}/shelf`;

// 1. Owner writes to their own shelf.
try {
  await setDoc(doc(db, alicePath, 'secret-cookies'), { title: 'Alice private recipe' });
  record('owner can write their own shelf', true);
} catch (e) {
  record('owner can write their own shelf', false, e.code || e.message);
}

// 2. Owner reads it back.
try {
  const snap = await getDoc(doc(db, alicePath, 'secret-cookies'));
  record('owner can read their own shelf', snap.exists() && snap.data().title === 'Alice private recipe');
} catch (e) {
  record('owner can read their own shelf', false, e.code || e.message);
}

// 3. A different signed-in user must NOT read Alice's shelf.
await signOut(auth);
await makeUser('mallory');
try {
  await getDoc(doc(db, alicePath, 'secret-cookies'));
  record('other user is denied read of a stranger shelf', false, 'read SUCCEEDED — rules are open');
} catch (e) {
  record('other user is denied read of a stranger shelf', e.code === 'permission-denied', e.code);
}

// 4. A different signed-in user must NOT write into Alice's shelf.
try {
  await setDoc(doc(db, alicePath, 'injected'), { title: 'mallory was here' });
  record('other user is denied write to a stranger shelf', false, 'write SUCCEEDED — rules are open');
} catch (e) {
  record('other user is denied write to a stranger shelf', e.code === 'permission-denied', e.code);
}

// 5. Signed out must NOT read.
await signOut(auth);
try {
  await getDoc(doc(db, alicePath, 'secret-cookies'));
  record('signed-out read is denied', false, 'read SUCCEEDED — rules are open');
} catch (e) {
  record('signed-out read is denied', e.code === 'permission-denied', e.code);
}

const failed = results.filter(r => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
