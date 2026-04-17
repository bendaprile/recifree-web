/**
 * scripts/cleanup-ports.js
 * 
 * Automatically identifies and kills processes occupying project ports.
 * This prevents "port taken" errors when starting the Firebase emulators
 * or Vite dev server after an unclean shutdown.
 */

import { execSync } from 'child_process';

const PORTS = [
  8080, // Firestore
  9099, // Auth
  5001, // Functions / Extensions
  5005, // Hosting (Customized)
  5173, // Vite
  4000, // Emulator UI
  4400, // Emulator Hub
  4500  // Logging Emulator
];

console.log('\n🧹 Sweeping lingering processes...');

let killedCount = 0;

for (const port of PORTS) {
  try {
    // Find PIDs for the port
    const stdout = execSync(`lsof -ti :${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const pids = stdout.split('\n').filter(pid => pid.trim() !== '');

    if (pids.length > 0) {
      console.log(`  ! Found process(es) on port ${port}: ${pids.join(', ')}`);
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`);
          killedCount++;
        } catch (err) {
          // Process might have already died
        }
      }
    }
  } catch (err) {
    // lsof returns exit code 1 if no process is found, which is fine
  }
}

if (killedCount > 0) {
  console.log(`✅ Cleared ${killedCount} lingering process(es).\n`);
} else {
  console.log('✨ All ports are clear.\n');
}
