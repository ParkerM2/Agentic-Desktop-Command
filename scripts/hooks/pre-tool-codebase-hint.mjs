#!/usr/bin/env node
/**
 * PreToolUse Hook — injects codebase path hints before Read/Grep/Glob.
 *
 * Auto-discovers all domains from src/shared/ipc/ directories.
 * Detects domain keywords in tool input and outputs matching file paths.
 *
 * Zero tokens in system prompt. Silent exit 0. Never blocks.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ─── Auto-discover all IPC domains ────────────────────────

function discoverDomains() {
  const ipcDir = resolve(ROOT, 'src/shared/ipc');
  if (!existsSync(ipcDir)) return [];
  return readdirSync(ipcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function domainPaths(domain) {
  const paths = {};
  const candidates = {
    contract: `src/shared/ipc/${domain}/contract.ts`,
    service: `src/main/services/${domain}/`,
    handler: `src/main/ipc/handlers/${domain}-handlers.ts`,
    feature: `src/renderer/features/${domain}/`,
    types: `src/shared/types/${domain}.ts`,
    doc: `docs/features/${domain}/plan.md`,
  };
  for (const [role, p] of Object.entries(candidates)) {
    if (existsSync(resolve(ROOT, p))) paths[role] = p;
  }
  return paths;
}

// ─── Main ─────────────────────────────────────────────────

try {
  const stdin = readFileSync(0, 'utf-8').trim();
  if (!stdin) process.exit(0);

  const payload = JSON.parse(stdin);
  const toolName = payload.tool_name ?? '';
  const toolInput = payload.tool_input ?? {};

  if (!['Read', 'Grep', 'Glob', 'Agent'].includes(toolName)) {
    process.exit(0);
  }

  const text = JSON.stringify(toolInput).toLowerCase();
  const domains = discoverDomains();
  const hints = [];

  for (const domain of domains) {
    if (text.includes(domain)) {
      const paths = domainPaths(domain);
      if (Object.keys(paths).length > 0) {
        const parts = Object.entries(paths).map(([r, p]) => `${r}=${p}`);
        hints.push(`[${domain}] ${parts.join(' ')}`);
      }
    }
  }

  if (hints.length > 0) {
    process.stdout.write(hints.join('\n') + '\n');
  }
} catch {
  // Silent fail
}
process.exit(0);
