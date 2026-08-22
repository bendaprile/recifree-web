#!/usr/bin/env node
/**
 * scripts/extraction-stats.js
 *
 * Read-only report on the `extraction_cache` collection. Answers two questions
 * the roadmap depends on:
 *   1. How often does extraction fall through to the paid Gemini layer?
 *   2. How often does a cached recipe end up with no image?
 *
 * Writes nothing. Safe to run against production.
 *
 * Usage:
 *   node scripts/extraction-stats.js                                    # production
 *   FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" node scripts/extraction-stats.js   # local emulator
 */

import { createRequire } from 'module';
import { readdirSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Layers in pipeline order. 'llm' is the only one that costs money per call.
const METHODS = ['ld+json', 'microdata', 'heuristic', 'llm'];
const PAID_METHOD = 'llm';

function initFirestore() {
  // The emulator needs no credentials, only a project id.
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

function pct(part, total) {
  return total === 0 ? '0.0%' : `${((part / total) * 100).toFixed(1)}%`;
}

function bar(part, total, width = 28) {
  const filled = total === 0 ? 0 : Math.round((part / total) * width);
  return '█'.repeat(filled) + '·'.repeat(width - filled);
}

async function main() {
  const db = initFirestore();
  const target = process.env.FIRESTORE_EMULATOR_HOST || 'production';
  console.log(`\nReading extraction_cache (${target})...\n`);

  const snapshot = await db.collection('extraction_cache').get();
  const total = snapshot.size;

  if (total === 0) {
    console.log('extraction_cache is empty. Nothing to report.\n');
    return;
  }

  const byMethod = {};
  let missingImage = 0;
  let missingMethod = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const method = data._extractionMeta?.method;
    if (method) {
      byMethod[method] = (byMethod[method] || 0) + 1;
    } else {
      missingMethod += 1;
    }
    if (!data.image) missingImage += 1;
  });

  console.log(`Cached extractions: ${total}\n`);
  console.log('Parse layer that succeeded');
  console.log('─'.repeat(58));

  const seen = new Set();
  for (const method of METHODS) {
    const count = byMethod[method] || 0;
    seen.add(method);
    const label = method === PAID_METHOD ? `${method} (paid)` : method;
    console.log(`  ${label.padEnd(16)} ${bar(count, total)} ${String(count).padStart(4)}  ${pct(count, total)}`);
  }
  // Surface any method value the pipeline started writing that this script predates.
  for (const [method, count] of Object.entries(byMethod)) {
    if (!seen.has(method)) {
      console.log(`  ${(method + ' (?)').padEnd(16)} ${bar(count, total)} ${String(count).padStart(4)}  ${pct(count, total)}`);
    }
  }
  if (missingMethod) {
    console.log(`  ${'(unstamped)'.padEnd(16)} ${bar(missingMethod, total)} ${String(missingMethod).padStart(4)}  ${pct(missingMethod, total)}`);
  }

  const paid = byMethod[PAID_METHOD] || 0;
  console.log(`\nGemini fallback fired on ${paid} of ${total} extractions (${pct(paid, total)}).`);
  console.log(`Recipes with no image: ${missingImage} of ${total} (${pct(missingImage, total)}).\n`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to read extraction_cache:', err.message);
    process.exit(1);
  });
