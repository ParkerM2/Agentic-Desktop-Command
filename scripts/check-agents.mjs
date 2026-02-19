import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Agent definition staleness checker.
 *
 * Scans all .claude/agents/*.md files for backtick-quoted file path references
 * (src/ and tests/) and checks if those files exist on disk.
 *
 * Exits 0 if no stale references found.
 * Exits 1 if any stale references found.
 */

const ROOT = resolve(import.meta.dirname, '..');
const AGENTS_DIR = join(ROOT, '.claude', 'agents');

// Match backtick-quoted paths starting with src/ or tests/
const PATH_REGEX = /`((?:src|tests)\/[^`\s]+)`/g;

// Skip paths containing template placeholders like <name>, <domain>, <feature>
const PLACEHOLDER_REGEX = /<[^>]+>/;

function scanAgentFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const staleRefs = [];

  for (const line of lines) {
    // Skip lines that start with WRONG comments (intentional bad examples)
    const trimmed = line.trimStart();
    if (trimmed.startsWith('// WRONG') || trimmed.startsWith('/* WRONG')) {
      continue;
    }

    let match;
    PATH_REGEX.lastIndex = 0;
    while ((match = PATH_REGEX.exec(line)) !== null) {
      const refPath = match[1];

      // Skip template placeholders
      if (PLACEHOLDER_REGEX.test(refPath)) {
        continue;
      }

      // Skip glob-like patterns (contain *)
      if (refPath.includes('*')) {
        continue;
      }

      const absolutePath = join(ROOT, refPath);
      if (!existsSync(absolutePath)) {
        staleRefs.push(refPath);
      }
    }
  }

  // Deduplicate
  return [...new Set(staleRefs)];
}

// --- Main ---

if (!existsSync(AGENTS_DIR)) {
  console.log('check:agents — No .claude/agents/ directory found. PASS');
  process.exit(0);
}

const agentFiles = readdirSync(AGENTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort();

if (agentFiles.length === 0) {
  console.log('check:agents — No agent definitions found. PASS');
  process.exit(0);
}

console.log(`check:agents — Scanning ${agentFiles.length} agent definitions...`);

let totalStale = 0;
let staleFileCount = 0;
const results = [];

for (const file of agentFiles) {
  const filePath = join(AGENTS_DIR, file);
  const staleRefs = scanAgentFile(filePath);

  if (staleRefs.length > 0) {
    totalStale += staleRefs.length;
    staleFileCount += 1;
    results.push({ file: `.claude/agents/${file}`, refs: staleRefs });
  }
}

if (totalStale === 0) {
  console.log(
    `check:agents — Scanning ${agentFiles.length} agent definitions... 0 stale references. PASS`,
  );
  process.exit(0);
}

// Report stale references
console.log('');
for (const { file, refs } of results) {
  console.error(`STALE: ${file}`);
  for (const ref of refs) {
    console.error(`  - ${ref} (file not found)`);
  }
  console.error('');
}

console.error(
  `check:agents — ${totalStale} stale references found in ${staleFileCount} agent files. FAIL`,
);
process.exit(1);
