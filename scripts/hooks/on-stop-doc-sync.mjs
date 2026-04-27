#!/usr/bin/env node
/**
 * Stop Hook — Domain change tracker
 *
 * Fires when Claude ends a session. Reads git status to detect modified files,
 * extracts domain names from paths using automate.json patterns, and writes
 * .claude/progress/PENDING_DOC_UPDATE.json.
 *
 * The next SessionStart hook reads this file and surfaces pending doc updates
 * as context so Claude knows what changed without a full audit.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function loadConfig() {
  const f = resolve(ROOT, '.claude/automate.json');
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, 'utf-8')); } catch { return null; }
}

function getChangedFiles() {
  // Use git status --short to get all modified/untracked files in working tree
  const result = spawnSync('git', ['-C', ROOT, 'status', '--short', '--porcelain'], {
    encoding: 'utf-8',
    timeout: 5_000,
  });
  if (result.status !== 0 || !result.stdout) return [];

  return result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      // Format: "XY filename" or "XY old -> new"
      const parts = line.trim().split(/\s+/);
      return parts[parts.length - 1].replace(/\\/g, '/');
    })
    .filter(Boolean);
}

function extractDomains(files, patterns) {
  const domains = new Set();
  for (const file of files) {
    for (const pattern of patterns) {
      try {
        const m = file.match(new RegExp(pattern));
        if (m?.[1]) domains.add(m[1]);
      } catch { /* ignore bad patterns */ }
    }
  }
  return [...domains].sort();
}

function categorizeFiles(files) {
  const categories = {
    ipc: files.filter((f) => f.includes('src/shared/ipc/')),
    main: files.filter((f) => f.includes('src/main/features/')),
    renderer: files.filter((f) => f.includes('src/renderer/features/')),
    schema: files.filter((f) => f.includes('schema.ts')),
    migration: files.filter((f) => f.includes('drizzle/')),
    other: files.filter(
      (f) =>
        !f.includes('src/shared/ipc/') &&
        !f.includes('src/main/features/') &&
        !f.includes('src/renderer/features/')
    ),
  };
  return categories;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

try {
  const config = loadConfig();
  const domainPatterns = config?.docSync?.domainPatterns ?? [
    'src/renderer/features/([^/]+)/',
    'src/main/features/([^/]+)/',
    'src/shared/ipc/([^/]+)/',
  ];

  const changedFiles = getChangedFiles();
  if (!changedFiles.length) process.exit(0);

  const domains = extractDomains(changedFiles, domainPatterns);
  const categories = categorizeFiles(changedFiles);
  const pendingFile = resolve(ROOT, config?.docSync?.pendingFile ?? '.claude/progress/PENDING_DOC_UPDATE.json');

  // Load existing pending updates (accumulate across sessions)
  let existing = {};
  if (existsSync(pendingFile)) {
    try { existing = JSON.parse(readFileSync(pendingFile, 'utf-8')); } catch { existing = {}; }
  }

  // Merge new changes
  const update = {
    lastSession: new Date().toISOString(),
    sessions: (existing.sessions ?? 0) + 1,
    pendingDomains: [...new Set([...(existing.pendingDomains ?? []), ...domains])].sort(),
    fileChangeSummary: {
      ipcFiles: categories.ipc.length,
      mainFiles: categories.main.length,
      rendererFiles: categories.renderer.length,
      schemaChanges: categories.schema.length,
      migrationChanges: categories.migration.length,
      totalFiles: changedFiles.length,
    },
    recentFiles: changedFiles.slice(0, 20), // cap at 20 for file size
  };

  writeFileSync(pendingFile, JSON.stringify(update, null, 2));

  // Output summary to Claude context (capped at ~400 chars)
  if (domains.length > 0) {
    const domainList = domains.slice(0, 8).join(', ') + (domains.length > 8 ? ` +${domains.length - 8} more` : '');
    process.stdout.write(
      `[doc-sync] ${changedFiles.length} files changed across domains: ${domainList}. ` +
      `PENDING_DOC_UPDATE.json updated. Run doc sync to patch codebase-state.html.\n`
    );
  }
} catch {
  // Silent fail
}

process.exit(0);
