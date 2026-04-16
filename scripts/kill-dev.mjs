#!/usr/bin/env node
/**
 * Kills every ADC dev process and its children — electron-vite wrappers,
 * the Electron main + utility + renderer processes, and any spawned PTY
 * shells rooted at them.
 *
 * Use when:
 *   - `Ctrl+C` on `npm run dev` left orphans (common on Windows).
 *   - The single-instance lock blocked a new dev from starting because
 *     a crashed prior instance never released the lock.
 *   - An agent spawned dev in a way you can't reach from your terminal.
 *
 * Safe: only kills processes whose command line references this repo path
 * or electron-vite. Does not touch unrelated Electron/node processes.
 *
 * Run:
 *   node scripts/kill-dev.mjs
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function findAdcRoots() {
  const csv = run(`wmic process where "name='node.exe'" get ProcessId,CommandLine /format:csv`);
  const pids = new Set();
  for (const line of csv.split(/\r?\n/)) {
    if (!line.includes('electron-vite')) continue;
    if (!line.toLowerCase().includes(repoRoot.toLowerCase().replace(/\\/g, '\\'))) continue;
    const match = line.match(/,(\d+),\d+\s*$/);
    if (match) pids.add(match[1]);
  }
  return [...pids];
}

function killTree(pid) {
  run(`taskkill /F /T /PID ${pid}`);
}

function killAllElectron() {
  run(`taskkill /F /IM electron.exe /T`);
}

const roots = findAdcRoots();
if (roots.length === 0) {
  console.log('No ADC electron-vite processes found.');
} else {
  console.log(`Killing ${roots.length} electron-vite root(s): ${roots.join(', ')}`);
  for (const pid of roots) killTree(pid);
}

console.log('Sweeping any remaining electron.exe processes...');
killAllElectron();

console.log('Done.');
