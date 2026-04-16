#!/usr/bin/env node
/**
 * PostToolUse Hook — Custom script dispatcher
 *
 * Fires after Edit or Write. Reads .claude/automate.json, matches the edited
 * file path against onEdit[].glob patterns, and runs matching scripts from
 * .claude/scripts/. Never blocks (always exits 0).
 *
 * Scripts receive: FILE_PATH (env), PROJECT_DIR (env)
 * Scripts must exit 0; their stdout is forwarded to Claude context.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ─── Glob matcher ──────────────────────────────────────────────────────────────
// Handles: * (non-slash), ** (any), ?, {a,b} (alternation)

function matchesGlob(filePath, pattern) {
  const fp = filePath.replace(/\\/g, '/');
  const pat = pattern.replace(/\\/g, '/');

  // Expand {a,b} alternations recursively
  const braceMatch = pat.match(/\{([^}]+)\}/);
  if (braceMatch) {
    return braceMatch[1].split(',').some((alt) =>
      matchesGlob(fp, pat.replace(braceMatch[0], alt.trim()))
    );
  }

  const regexStr = pat
    .replace(/[.+^$|()[\]\\]/g, '\\$&') // escape regex specials (not * ? {})
    .replace(/\*\*\//g, '(?:[^/]+/)*')   // **/ → zero or more path segments
    .replace(/\*\*/g, '.*')              // ** → anything
    .replace(/\*/g, '[^/]+')             // * → one segment (no slashes)
    .replace(/\?/g, '[^/]');             // ? → single non-slash char

  try {
    return new RegExp('^' + regexStr + '$').test(fp);
  } catch {
    return false;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

try {
  const raw = readFileSync(0, 'utf-8').trim();
  if (!raw) process.exit(0);

  const payload = JSON.parse(raw);
  const toolName = payload.tool_name ?? '';
  if (!['Edit', 'Write'].includes(toolName)) process.exit(0);

  // file_path comes from tool_input (stdin JSON) or TOOL_ARG_FILE_PATH env var
  const filePath =
    payload.tool_input?.file_path ??
    process.env.TOOL_ARG_FILE_PATH ??
    '';

  if (!filePath) process.exit(0);

  // Normalize to project-relative path
  const relPath = filePath.replace(/\\/g, '/').replace(ROOT.replace(/\\/g, '/') + '/', '');

  // Load automate.json
  const automateFile = resolve(ROOT, '.claude/automate.json');
  if (!existsSync(automateFile)) process.exit(0);

  const config = JSON.parse(readFileSync(automateFile, 'utf-8'));
  const rules = config.onEdit ?? [];
  const scriptsDir = resolve(ROOT, config.scriptsDir ?? '.claude/scripts');

  const output = [];

  for (const rule of rules) {
    if (!matchesGlob(relPath, rule.glob)) continue;
    if (!rule.scripts?.length) continue;

    for (const scriptName of rule.scripts) {
      const scriptPath = resolve(scriptsDir, `${scriptName}.mjs`);
      if (!existsSync(scriptPath)) {
        output.push(`[automate] WARN: script not found: ${scriptName}.mjs`);
        continue;
      }

      const result = spawnSync(process.execPath, [scriptPath], {
        env: {
          ...process.env,
          FILE_PATH: filePath,
          REL_PATH: relPath,
          PROJECT_DIR: ROOT,
        },
        encoding: 'utf-8',
        timeout: 15_000,
      });

      const out = (result.stdout ?? '').trim();
      const err = (result.stderr ?? '').trim();

      if (out) output.push(`[${scriptName}] ${out}`);
      if (err) output.push(`[${scriptName}] ERR: ${err}`);
      if (result.status !== 0 && result.status !== null) {
        output.push(`[${scriptName}] exited ${result.status}`);
      }
    }
  }

  if (output.length) process.stdout.write(output.join('\n') + '\n');
} catch {
  // Silent fail — never block an edit
}

process.exit(0);
