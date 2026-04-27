/**
 * Rebuild better-sqlite3 against the current Electron ABI (for running the app).
 *
 * Matches the repo's existing postinstall convention which invokes the
 * `electron-rebuild` binary shipped by `@electron/rebuild`.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electronVersion = require('electron/package.json').version;

console.log(`Rebuilding better-sqlite3 for Electron ${electronVersion}...`);
execSync(
  `npx electron-rebuild -f -w better-sqlite3 -v ${electronVersion}`,
  { stdio: 'inherit' },
);
console.log('Done — better-sqlite3 now targets Electron.');
