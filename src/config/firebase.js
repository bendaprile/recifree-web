// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Only connect to emulators if:
// 1. We are NOT in production (safety guard)
// 2. The explicit emulator flag is set
if (!import.meta.env.PROD) {
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    console.info('[Firebase] Connecting to Auth Emulator');
  }

  if (import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.info('[Firebase] Connecting to Firestore Emulator');
  }
}
