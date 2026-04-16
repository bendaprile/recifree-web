// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDVs0zywPcHBOUOO29sN1NlHzyykj6XWgg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "recifree-web-4731f.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "recifree-web-4731f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "recifree-web-4731f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "568309379296",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:568309379296:web:342fcef7986fd4077ee085"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 1. Connect to emulators FIRST (before persistence or any other DB access)
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

// 2. Enable offline persistence AFTER emulator connection
if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Persistence failed: Browser not supported');
    }
  });
}
