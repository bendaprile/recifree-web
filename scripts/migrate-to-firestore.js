#!/usr/bin/env node
/**
 * scripts/migrate-to-firestore.js
 *
 * One-time migration script: uploads all local recipe JSON files to Firestore.
 * Uses the Firebase Admin SDK with a service account key for server-side access.
 *
 * Usage:
 *   node scripts/migrate-to-firestore.js              # migrate all recipes
 *   node scripts/migrate-to-firestore.js --id=hot-honey-feta-chicken  # upsert one
 *
 * Prerequisites:
 *   - Firestore enabled in Firebase Console
 *   - Service account key at .secret/<filename>.json
 */

import { createRequire } from 'module';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Load service account ───────────────────────────────────────────────────
const secretDir = join(ROOT, '.secret');
let serviceAccountPath;
try {
  const files = readdirSync(secretDir).filter(f => f.endsWith('.json'));
  if (!files.length) {
    console.error('❌  No service account JSON found in .secret/');
    process.exit(1);
  }
  serviceAccountPath = join(secretDir, files[0]);
} catch {
  console.error('❌  .secret/ directory not found. Did you place your service account key there?');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

// ─── Initialize Admin SDK ───────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ─── Parse --id flag ────────────────────────────────────────────────────────
const idFlag = process.argv.find(a => a.startsWith('--id='));
const targetId = idFlag ? idFlag.split('=')[1] : null;

// ─── Load recipe JSON files ─────────────────────────────────────────────────
const recipesDir = join(ROOT, 'src', 'data', 'recipes');
let recipeFiles = readdirSync(recipesDir).filter(f => f.endsWith('.json'));

if (targetId) {
  recipeFiles = recipeFiles.filter(f => f === `${targetId}.json`);
  if (!recipeFiles.length) {
    console.error(`❌  No recipe file found for id: ${targetId}`);
    process.exit(1);
  }
}

console.log(`\n🔥 Migrating ${recipeFiles.length} recipe(s) to Firestore...\n`);

// ─── Upload each recipe ─────────────────────────────────────────────────────
let success = 0;
let failed = 0;

const now = admin.firestore.FieldValue.serverTimestamp();

for (const file of recipeFiles) {
  const recipe = JSON.parse(readFileSync(join(recipesDir, file), 'utf-8'));
  const slug = recipe.id;

  // Firestore does not support nested arrays (Array of Arrays).
  // stepIngredients is an array of arrays. We stringify it for storage.
  const payload = { ...recipe };
  if (Array.isArray(payload.stepIngredients)) {
    payload.stepIngredients = JSON.stringify(payload.stepIngredients);
  }

  try {
    // Check for existing doc with this slug (upsert semantics)
    const existing = await db.collection('recipes')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Update existing document (preserve auto-generated docId)
      await existing.docs[0].ref.set({
        ...payload,
        slug,
        updatedAt: now,
      }, { merge: true });
      console.log(`  ↺  Updated: ${slug}`);
    } else {
      // New document — let Firestore auto-generate the ID
      await db.collection('recipes').add({
        ...payload,
        slug,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`  ✓  Added:   ${slug}`);
    }
    success++;
  } catch (err) {
    console.error(`  ✗  Failed:  ${slug} — ${err.message}`);
    failed++;
  }
}

console.log(`\n✅  Done. ${success} succeeded, ${failed} failed.\n`);
process.exit(failed > 0 ? 1 : 0);
