#!/usr/bin/env node
/**
 * PreToolUse Hook — Injects codebase context hints before Read/Grep/Glob.
 *
 * Reads the tool input from stdin (JSON), detects domain keywords,
 * and outputs a hint comment with relevant file paths.
 *
 * Exit codes:
 *   0 = allow (with optional stdout hint)
 *   2 = block (not used here)
 */

import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ─── Domain keywords → file paths ─────────────────────────

const DOMAIN_MAP = {
  visualization: {
    service: 'src/main/services/visualization/',
    feature: 'src/renderer/features/visualization/',
    ipc: 'src/shared/ipc/visualization/',
    handler: 'src/main/ipc/handlers/visualization-handlers.ts',
    doc: 'docs/features/visualization/plan.md',
  },
  auth: {
    service: 'src/main/services/auth/',
    feature: 'src/renderer/features/auth/',
    ipc: 'src/shared/ipc/auth/',
    handler: 'src/main/ipc/handlers/auth-handlers.ts',
  },
  tasks: {
    service: 'src/main/services/tasks/',
    feature: 'src/renderer/features/tasks/',
    ipc: 'src/shared/ipc/tasks/',
    handler: 'src/main/ipc/handlers/task-handlers.ts',
  },
  assistant: {
    service: 'src/main/services/assistant/',
    feature: 'src/renderer/features/assistant/',
    ipc: 'src/shared/ipc/assistant/',
    handler: 'src/main/ipc/handlers/assistant-handlers.ts',
  },
  settings: {
    service: 'src/main/services/settings/',
    feature: 'src/renderer/features/settings/',
    ipc: 'src/shared/ipc/settings/',
    handler: 'src/main/ipc/handlers/settings-handlers.ts',
  },
  github: {
    service: 'src/main/services/github/',
    feature: 'src/renderer/features/github/',
    ipc: 'src/shared/ipc/github/',
    handler: 'src/main/ipc/handlers/github-handlers.ts',
  },
};

// ─── Keyword extraction ───────────────────────────────────

function extractDomains(input) {
  const text = JSON.stringify(input).toLowerCase();
  const matches = [];
  for (const domain of Object.keys(DOMAIN_MAP)) {
    if (text.includes(domain)) {
      matches.push(domain);
    }
  }
  return matches;
}

// ─── Main ─────────────────────────────────────────────────

try {
  const stdin = readFileSync(0, 'utf-8').trim();
  if (!stdin) process.exit(0);

  const payload = JSON.parse(stdin);
  const toolName = payload.tool_name ?? '';
  const toolInput = payload.tool_input ?? {};

  // Only hint for search/read tools
  if (!['Read', 'Grep', 'Glob', 'Agent'].includes(toolName)) {
    process.exit(0);
  }

  const domains = extractDomains(toolInput);
  if (domains.length === 0) process.exit(0);

  // Build hint
  const hints = [];
  for (const domain of domains) {
    const paths = DOMAIN_MAP[domain];
    const existing = Object.entries(paths)
      .filter(([, p]) => existsSync(resolve(ROOT, p)))
      .map(([role, p]) => `${role}=${p}`);
    if (existing.length > 0) {
      hints.push(`[${domain}] ${existing.join(' ')}`);
    }
  }

  if (hints.length > 0) {
    process.stdout.write(hints.join('\n') + '\n');
  }
} catch {
  // Silent fail — never block tools
}
process.exit(0);
