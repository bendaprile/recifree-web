#!/usr/bin/env node
/**
 * scripts/backfill-source-hash.js
 *
 * Adds `sourceUrlHash` to catalog recipes that predate paste deduplication.
 *
 * Recipes published through `functions/publishRecipe.js` carry the hash of
 * their normalized source URL, which is how a later paste of that URL finds
 * them. The recipes migrated from `src/data/recipes/*.json` have a source URL
 * but no hash, so without this they would each be extracted a second time.
 *
 * Reports and writes nothing unless --apply is passed.
 *
 * --rehash recomputes hashes that already exist. Needed whenever normalizeUrl
 * changes: the function starts producing new-style keys while the catalog
 * still holds old-style ones, and every paste silently stops matching until
 * this has run.
 *
 * Usage:
 *   node scripts/backfill-source-hash.js                        # dry run, production
 *   node scripts/backfill-source-hash.js --apply                # fill in what is missing
 *   node scripts/backfill-source-hash.js --rehash --apply       # recompute everything
 *   FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" node scripts/backfill-source-hash.js --apply   # local emulator
 */

import { createRequire } from 'module';
import { readdirSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// The same normalization the extraction path uses. Importing it rather than
// reimplementing it is the point: a second copy that drifts would hash the same
// URL differently and silently stop matching.
const { normalizeUrl, hashUrl } = require('../functions/cache/extractionCache');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');
const REHASH = process.argv.includes('--rehash');

function initFirestore() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-recifree-web' });
    return admin.firestore();
  }

  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    const secretDir = join(ROOT, '.secret');
    const files = readdirSync(secretDir).filter(f => f.endsWith('.json'));
    if (!files.length) {
      console.error('No service account JSON found in .secret/');
      process.exit(1);
    }
    serviceAccount = JSON.parse(readFileSync(join(secretDir, files[0]), 'utf8'));
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

const db = initFirestore();
const target = process.env.FIRESTORE_EMULATOR_HOST || 'production';
console.log(`\n${REHASH ? 'Recomputing' : 'Backfilling'} sourceUrlHash on ${target}${APPLY ? '' : ' (dry run)'}\n`);

const snapshot = await db.collection('recipes').get();

let written = 0;
let alreadyCorrect = 0;
let noSource = 0;
let unhashable = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  const slug = data.slug || doc.id;

  if (data.sourceUrlHash && !REHASH) {
    alreadyCorrect += 1;
    continue;
  }

  const url = data.source && data.source.url;
  if (!url) {
    noSource += 1;
    console.log(`  skip  ${slug} — no source URL`);
    continue;
  }

  let hash;
  try {
    hash = hashUrl(normalizeUrl(url));
  } catch (error) {
    unhashable += 1;
    console.log(`  skip  ${slug} — ${error.message}: ${url}`);
    continue;
  }

  // A rehash that lands on the same value is not a change worth reporting.
  if (data.sourceUrlHash === hash) {
    alreadyCorrect += 1;
    continue;
  }

  if (APPLY) {
    await doc.ref.set({ sourceUrlHash: hash }, { merge: true });
  }
  written += 1;
  console.log(`  ${APPLY ? 'wrote' : 'would'} ${slug} — ${hash.slice(0, 12)}…`);
}

console.log(`
${snapshot.size} recipes read
${written} ${APPLY ? 'updated' : 'to update'}
${alreadyCorrect} already correct
${noSource} without a source URL
${unhashable} with an unusable source URL
`);

if (!APPLY && written > 0) {
  console.log(`Re-run with ${REHASH ? '--rehash ' : ''}--apply to write.\n`);
}

process.exit(0);
