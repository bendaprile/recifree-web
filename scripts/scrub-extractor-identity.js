#!/usr/bin/env node
/**
 * scripts/scrub-extractor-identity.js
 *
 * Removes `_extractionMeta.extractedBy` from the `extraction_cache` collection.
 *
 * The cache is keyed on the URL alone and shared across every account, so a
 * document written by one user is returned to the next user who pastes that
 * URL. `stripExtractorIdentity()` in functions/cache/extractionCache.js scrubs
 * the field on read and write, so nothing is served any more — but documents
 * written before that guard still hold an email at rest. This deletes it.
 *
 * Doubles as an audit: with no --apply it reports what is there and writes
 * nothing. Expect it to find nothing on a healthy database.
 *
 * Usage:
 *   node scripts/scrub-extractor-identity.js            # audit, production
 *   node scripts/scrub-extractor-identity.js --apply    # delete the field
 */

import { createRequire } from 'module';
import { readdirSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

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
console.log(`\nScrubbing extractor identity on ${target}${APPLY ? '' : ' (audit only)'}\n`);

const snapshot = await db.collection('extraction_cache').get();
let found = 0;

for (const doc of snapshot.docs) {
  const meta = doc.data()._extractionMeta;
  if (!meta || !meta.extractedBy) continue;

  found += 1;
  // Never print the value. Reporting the leak must not repeat it.
  console.log(`  ${APPLY ? 'scrubbed' : 'found'}  ${doc.id}`);

  if (APPLY) {
    await doc.ref.update({
      '_extractionMeta.extractedBy': admin.firestore.FieldValue.delete()
    });
  }
}

console.log(`
${snapshot.size} cache documents read
${found} carrying an extractor identity${APPLY ? ' — now removed' : ''}
`);

if (!APPLY && found > 0) {
  console.log('Re-run with --apply to delete the field.\n');
}

process.exit(0);
