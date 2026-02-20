import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * validate-tracker — Validates docs/tracker.json v2 schema integrity.
 *
 * 5 checks:
 *   1. Schema validation (required fields, valid status enum)
 *   2. File existence (planFile paths exist on disk)
 *   3. Orphan detection (every .md in docs/plans/ is tracked)
 *   4. Staleness warning (APPROVED entries older than 7 days)
 *   5. Archive candidates (IMPLEMENTED entries older than 14 days)
 *
 * Exit 0 = pass, Exit 1 = hard errors. Warnings don't affect exit code.
 */

const VALID_STATUSES = [
  'DRAFT',
  'APPROVED',
  'IN_PROGRESS',
  'IMPLEMENTED',
  'ARCHIVED',
  'TRACKING',
];

const REQUIRED_FIELDS = ['title', 'status', 'created', 'statusChangedAt'];

const ROOT = resolve(import.meta.dirname, '..');
const TRACKER_PATH = join(ROOT, 'docs', 'tracker.json');

let errors = 0;
let warnings = 0;

console.log('validate:tracker — Running 5 checks...');
console.log('');

// Load tracker
let tracker;
try {
  const raw = readFileSync(TRACKER_PATH, 'utf-8');
  tracker = JSON.parse(raw);
} catch (error) {
  console.error(`FAIL: Could not read or parse docs/tracker.json: ${error.message}`);
  process.exit(1);
}

const plans = tracker.plans;
const entries = Object.entries(plans);

// ── Check 1: Schema validation ──────────────────────────────────────────────

{
  let schemaErrors = 0;

  for (const [key, entry] of entries) {
    for (const field of REQUIRED_FIELDS) {
      if (!(field in entry)) {
        console.error(`  ERROR: "${key}" missing required field "${field}"`);
        schemaErrors++;
      }
    }

    // planFile must be present as a key (value can be null)
    if (!('planFile' in entry)) {
      console.error(`  ERROR: "${key}" missing field "planFile" (use null if no plan file)`);
      schemaErrors++;
    }

    if (entry.status && !VALID_STATUSES.includes(entry.status)) {
      console.error(`  ERROR: "${key}" has invalid status "${entry.status}"`);
      schemaErrors++;
    }
  }

  errors += schemaErrors;
  const result = schemaErrors > 0 ? `FAIL (${schemaErrors} errors)` : `PASS (${entries.length} entries)`;
  console.log(`[1/5] Schema validation... ${result}`);
}

// ── Check 2: File existence ─────────────────────────────────────────────────

{
  let fileErrors = 0;
  let filesChecked = 0;

  for (const [key, entry] of entries) {
    // Skip ARCHIVED entries — files may have moved to doc-history/
    if (entry.status === 'ARCHIVED') {
      continue;
    }

    if (entry.planFile) {
      const fullPath = join(ROOT, entry.planFile);
      filesChecked++;
      if (!existsSync(fullPath)) {
        console.error(`  ERROR: "${key}" planFile not found: ${entry.planFile}`);
        fileErrors++;
      }
    }
  }

  errors += fileErrors;
  const result = fileErrors > 0 ? `FAIL (${fileErrors} missing)` : `PASS (${filesChecked} files verified)`;
  console.log(`[2/5] File existence... ${result}`);
}

// ── Check 3: Orphan detection ───────────────────────────────────────────────

{
  let orphanCount = 0;

  // Collect all tracked plan file paths
  const trackedFiles = new Set();
  for (const entry of Object.values(plans)) {
    if (entry.planFile) {
      trackedFiles.add(entry.planFile);
    }
  }

  // Check docs/plans/
  const plansDir = join(ROOT, 'docs', 'plans');
  if (existsSync(plansDir)) {
    const planFiles = readdirSync(plansDir).filter((f) => f.endsWith('.md'));
    for (const file of planFiles) {
      const relativePath = `docs/plans/${file}`;
      if (!trackedFiles.has(relativePath)) {
        console.warn(`  WARN: Orphan plan file not tracked: ${relativePath}`);
        orphanCount++;
      }
    }
  }

  if (orphanCount > 0) {
    errors += orphanCount;
  }
  const result = orphanCount > 0 ? `FAIL (${orphanCount} orphans)` : 'PASS (0 orphans)';
  console.log(`[3/5] Orphan detection... ${result}`);
}

// ── Check 4: Staleness check ────────────────────────────────────────────────

{
  let staleCount = 0;
  const now = new Date();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  for (const [key, entry] of entries) {
    if (entry.status !== 'APPROVED') {
      continue;
    }
    const changedAt = new Date(entry.statusChangedAt);
    if (now - changedAt > sevenDays) {
      console.warn(`  WARN: "${key}" has been APPROVED since ${entry.statusChangedAt}`);
      staleCount++;
      warnings++;
    }
  }

  const result = staleCount > 0 ? `WARN: ${staleCount} APPROVED entries older than 7 days` : 'PASS';
  console.log(`[4/5] Staleness check... ${result}`);
}

// ── Check 5: Archive candidates ─────────────────────────────────────────────

{
  let archiveCount = 0;
  const now = new Date();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  for (const [key, entry] of entries) {
    if (entry.status !== 'IMPLEMENTED') {
      continue;
    }
    const changedAt = new Date(entry.statusChangedAt);
    if (now - changedAt > fourteenDays) {
      console.warn(`  WARN: "${key}" IMPLEMENTED since ${entry.statusChangedAt} — archive candidate`);
      archiveCount++;
      warnings++;
    }
  }

  const result =
    archiveCount > 0 ? `WARN: ${archiveCount} IMPLEMENTED entries older than 14 days` : 'PASS';
  console.log(`[5/5] Archive candidates... ${result}`);
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log('');
const status = errors > 0 ? 'FAIL' : 'PASS';
console.log(`validate:tracker — ${status} (${errors} errors, ${warnings} warnings)`);

process.exit(errors > 0 ? 1 : 0);
