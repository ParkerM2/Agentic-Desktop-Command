/**
 * Rebuild better-sqlite3 against the current Node ABI (for Vitest unit tests).
 */
import { execSync } from 'node:child_process';

console.log('Rebuilding better-sqlite3 for Node ABI...');
execSync('npm rebuild better-sqlite3 --build-from-source', {
  stdio: 'inherit',
});
console.log('Done — better-sqlite3 now targets Node.');
