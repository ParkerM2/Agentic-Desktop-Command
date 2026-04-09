#!/usr/bin/env node
/**
 * FSD Migration Script
 *
 * Moves service + handler files into co-located feature directories.
 * Creates barrel files for each feature.
 *
 * Usage: node scripts/fsd-migrate.mjs [--dry-run]
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes('--dry-run');
const FEATURES_DIR = join(ROOT, 'src/main/features');

// Map: service dir name → handler file name(s)
const SERVICE_TO_HANDLER = {
  'alerts': ['alert-handlers.ts'],
  'app': ['app-handlers.ts', 'app-update-handlers.ts'],
  'assistant': ['assistant-handlers.ts'],
  'briefing': ['briefing-handlers.ts'],
  'calendar': ['calendar-handlers.ts'],
  'changelog': ['changelog-handlers.ts'],
  'claude': ['claude-handlers.ts'],
  'dashboard': ['dashboard-handlers.ts'],
  'data-management': ['data-management-handlers.ts'],
  'device': ['device-handlers.ts'],
  'docker': ['docker-handlers.ts'],
  'email': ['email-handlers.ts'],
  'file-tree': ['files-handlers.ts'],
  'fitness': ['fitness-handlers.ts'],
  'git': ['git-handlers.ts'],
  'github': ['github-handlers.ts'],
  'health': ['error-handlers.ts'],
  'hub': ['hub-handlers.ts'],
  'ideas': ['ideas-handlers.ts'],
  'insights': ['insights-handlers.ts'],
  'milestones': ['milestones-handlers.ts'],
  'notes': ['notes-handlers.ts'],
  'notifications': ['notification-handlers.ts'],
  'planner': ['planner-handlers.ts'],
  'progress': ['progress-handlers.ts'],
  'project': ['project-handlers.ts'],
  'qa': ['qa-handlers.ts'],
  'screen': ['screen-handlers.ts'],
  'settings': ['settings-handlers.ts'],
  'spotify': ['spotify-handlers.ts'],
  'tasks': ['task-handlers.ts'],
  'terminal': ['terminal-handlers.ts'],
  'time-parser': ['time-handlers.ts'],
  'tracker': ['tracker-handlers.ts'],
  'visualization': ['visualization-handlers.ts'],
  'voice': ['voice-handlers.ts'],
  'workflow': ['workflow-handlers.ts'],
  'workflow-engine': ['workflow-engine-handlers.ts'],
  'workflow-templates': ['workflow-template-handlers.ts'],
  'workspace': ['workspace-handlers.ts'],
};

// Services that DON'T get handlers (infrastructure, not features)
const INFRA_SERVICES = new Set([
  'agent-manager',
  'agent-orchestrator',
  'progress-watcher-v2',
  'session-jsonl',
  'team-watcher',
  'worktree-provisioner',
]);

// Also move these standalone handler files
const STANDALONE_HANDLERS = {
  'bus': 'bus-handlers.ts',
  'agent-dashboard': 'agent-dashboard-handlers.ts',
  'hotkeys': 'hotkey-handlers.ts',
  'merge': 'merge-handlers.ts',
  'mcp': 'mcp-handlers.ts',
  'oauth': 'oauth-handlers.ts',
  'security': 'security-handlers.ts',
  'webhook-settings': 'webhook-settings-handlers.ts',
  'window': 'window-handlers.ts',
};

function log(msg) {
  console.log(DRY_RUN ? `[DRY] ${msg}` : msg);
}

function moveDir(src, dest) {
  if (!existsSync(src)) return;
  log(`  MOVE ${src} → ${dest}`);
  if (!DRY_RUN) {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
    rmSync(src, { recursive: true, force: true });
  }
}

function moveFile(src, dest) {
  if (!existsSync(src)) return;
  log(`  MOVE ${src} → ${dest}`);
  if (!DRY_RUN) {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
    rmSync(src);
  }
}

// Phase 1: Move service directories
console.log('\n=== Phase 1: Move services to features/ ===\n');

const servicesDir = join(ROOT, 'src/main/services');
for (const name of readdirSync(servicesDir)) {
  if (INFRA_SERVICES.has(name)) {
    log(`  SKIP ${name} (infrastructure)`);
    continue;
  }
  const src = join(servicesDir, name);
  const dest = join(FEATURES_DIR, name);
  moveDir(src, dest);
}

// Phase 2: Move handler files into their feature dirs
console.log('\n=== Phase 2: Move handlers into features/ ===\n');

const handlersDir = join(ROOT, 'src/main/ipc/handlers');
for (const [service, handlers] of Object.entries(SERVICE_TO_HANDLER)) {
  for (const handler of handlers) {
    const src = join(handlersDir, handler);
    const dest = join(FEATURES_DIR, service, handler);
    moveFile(src, dest);
  }
}

// Phase 3: Move standalone handlers
console.log('\n=== Phase 3: Move standalone handlers ===\n');

for (const [feature, handler] of Object.entries(STANDALONE_HANDLERS)) {
  const src = join(handlersDir, handler);
  const featureDir = join(FEATURES_DIR, feature);
  if (!existsSync(featureDir) && !DRY_RUN) {
    mkdirSync(featureDir, { recursive: true });
  }
  moveFile(src, join(featureDir, handler));
}

console.log('\n=== Done ===');
console.log(`Features dir: ${FEATURES_DIR}`);
if (DRY_RUN) console.log('(dry run — no files moved)');
