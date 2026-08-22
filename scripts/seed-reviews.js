#!/usr/bin/env node
/**
 * scripts/seed-reviews.js
 *
 * Fills the local emulator with sample reviews so the rating on the explore
 * cards and in the recipe header has something to show. Development fixture
 * only — the reviews are invented.
 *
 * Refuses to run without FIRESTORE_EMULATOR_HOST. Inventing reviews on the
 * real catalog would be exactly the fake-review problem Recifree exists to
 * avoid, so this cannot be pointed at production even by accident.
 *
 * Usage:
 *   npm run dev          # in one terminal, to bring the emulators up
 *   npm run seed:reviews # in another
 */

import { createRequire } from 'module';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

// A service account would mean production. The emulator needs none, so its
// absence is the guard.
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Refusing to run: FIREBASE_SERVICE_ACCOUNT is set. This script seeds invented reviews and is for the emulator only.');
  process.exit(1);
}

/**
 * The emulator namespaces data by project id, and the two halves of local dev
 * disagree about which one they are: `npm run emulators` runs the suite as
 * demo-recifree-web, while the web app connects with VITE_FIREBASE_PROJECT_ID,
 * which is the real recifree-web-4731f. Seeding under the emulator's own id
 * writes to a namespace the app never reads, and nothing shows up.
 */
const APP_PROJECT_ID = 'recifree-web-4731f';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || APP_PROJECT_ID });
const db = admin.firestore();

// Keyed by the recipe id, which is what the explore grid looks up.
const SAMPLE = {
  'spicy-salmon-bowls-with-rice': [
    { uid: 'seed-ada', authorName: 'Ada Lovelace', rating: 5, text: 'The coconut rice is the whole thing. I doubled the sriracha and it held up.' },
    { uid: 'seed-grace', authorName: 'Grace Hopper', rating: 4, text: 'Good weeknight bowl. Salmon needed two extra minutes in my oven.' },
    { uid: 'seed-alan', authorName: null, rating: 5, text: '' }
  ],
  'cajun-seasoning': [
    { uid: 'seed-ada', authorName: 'Ada Lovelace', rating: 5, text: 'Made a triple batch and it lasted months. Smoked paprika is worth it.' },
    { uid: 'seed-katherine', authorName: 'Katherine Johnson', rating: 4, text: 'Salty for me at 2 tbsp, but easy to dial back.' }
  ],
  'anti-inflammatory-turmeric-chicken-soup': [
    { uid: 'seed-grace', authorName: 'Grace Hopper', rating: 3, text: 'Comforting, though it wanted more lemon than the recipe says.' }
  ]
};

let written = 0;
for (const [slug, reviews] of Object.entries(SAMPLE)) {
  for (const { uid, ...review } of reviews) {
    await db.collection('reviews').doc(slug).collection('entries').doc(uid).set({
      ...review,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    written += 1;
  }
  console.log(`  ${slug} — ${reviews.length} reviews`);
}

console.log(`\n${written} sample reviews written to the emulator at ${process.env.FIRESTORE_EMULATOR_HOST}, project ${admin.app().options.projectId}\n`);
process.exit(0);
