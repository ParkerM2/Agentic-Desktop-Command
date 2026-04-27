#!/usr/bin/env node
/**
 * SessionStart Hook — Project context loader
 *
 * Fires at the start of every Claude session. Outputs:
 * 1. Pending doc updates (from PENDING_DOC_UPDATE.json) so Claude knows
 *    what changed and what needs to be documented without a full audit.
 * 2. Active automate.json rules summary so Claude knows what runs on edits.
 *
 * Keep output concise — it's injected into every session's context.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function loadJSON(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

try {
  const config = loadJSON(resolve(ROOT, '.claude/automate.json'));
  const pending = loadJSON(
    resolve(ROOT, config?.docSync?.pendingFile ?? '.claude/progress/PENDING_DOC_UPDATE.json')
  );

  const lines = [];

  // ── Pending doc updates ────────────────────────────────────────────────────
  if (pending?.pendingDomains?.length) {
    const domains = pending.pendingDomains.slice(0, 10);
    const extra = pending.pendingDomains.length > 10 ? ` +${pending.pendingDomains.length - 10} more` : '';
    const age = pending.lastSession
      ? `last session ${new Date(pending.lastSession).toLocaleDateString()}`
      : 'previous session';

    lines.push(
      `[doc-sync] PENDING: ${pending.pendingDomains.length} domain(s) changed since last doc sync (${age}).`,
      `  Domains: ${domains.join(', ')}${extra}`,
      `  Files changed: ${pending.fileChangeSummary?.totalFiles ?? '?'} ` +
        `(ipc:${pending.fileChangeSummary?.ipcFiles ?? 0} ` +
        `main:${pending.fileChangeSummary?.mainFiles ?? 0} ` +
        `renderer:${pending.fileChangeSummary?.rendererFiles ?? 0})`,
      `  Action: run /doc-sync or ask Claude to update .claude/progress/adc-codebase-state-2026-04-13.html for affected domains.`
    );
  }

  // ── Active onEdit rules summary ────────────────────────────────────────────
  if (config?.onEdit?.length) {
    const activeRules = config.onEdit
      .filter((r) => r.scripts?.length > 0)
      .map((r) => `${r.glob} → ${r.scripts.join(', ')}`);

    if (activeRules.length) {
      lines.push(`[automate] Active onEdit rules: ${activeRules.join(' | ')}`);
    }
  }

  if (lines.length) {
    process.stdout.write(lines.join('\n') + '\n');
  }
} catch {
  // Silent fail — never disrupt session start
}

process.exit(0);
