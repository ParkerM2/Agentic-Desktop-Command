#!/usr/bin/env node

/**
 * scaffold-features.mjs — Audit & fix feature slice structure
 *
 * Usage:
 *   node scripts/scaffold-features.mjs          # audit mode (report only)
 *   node scripts/scaffold-features.mjs --fix    # create missing files
 */

import { readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const FEATURES_DIR = join(import.meta.dirname, '..', 'src', 'renderer', 'features');
const FIX_MODE = process.argv.includes('--fix');

// --- Helpers ---

function pascalCase(str) {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function camelCase(str) {
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// --- Templates ---

function barrelTemplate(name) {
  const pascal = pascalCase(name);
  return `// ${pascal} — public API
export * from './api/queryKeys';
export * from './store';
`;
}

function queryKeysTemplate(name) {
  const camel = camelCase(name);
  return `export const ${camel}Keys = {
  all: ['${name}'] as const,
};
`;
}

function useHookTemplate(name) {
  const pascal = pascalCase(name);
  return `// TODO: Add query/mutation hooks for ${pascal}
`;
}

function storeTemplate(name) {
  const pascal = pascalCase(name);
  return `import { create } from 'zustand';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Scaffold placeholder
interface ${pascal}State {}

export const use${pascal}Store = create<${pascal}State>()(() => ({}));
`;
}

// --- Required structure ---

function getRequiredFiles(name) {
  const pascal = pascalCase(name);
  return [
    { rel: 'index.ts', type: 'file', template: () => barrelTemplate(name) },
    { rel: 'api', type: 'dir', template: null },
    { rel: `api/queryKeys.ts`, type: 'file', template: () => queryKeysTemplate(name) },
    { rel: `api/use${pascal}.ts`, type: 'file', template: () => useHookTemplate(name) },
    { rel: 'components', type: 'dir', template: null },
    { rel: 'hooks', type: 'dir', template: null },
    { rel: 'store.ts', type: 'file', template: () => storeTemplate(name) },
  ];
}

// --- Main ---

const features = readdirSync(FEATURES_DIR).filter((f) => {
  const full = join(FEATURES_DIR, f);
  return statSync(full).isDirectory();
});

console.log(`\nScanning ${features.length} features in src/renderer/features/\n`);
console.log(FIX_MODE ? 'MODE: --fix (creating missing files)\n' : 'MODE: audit (report only)\n');

let totalMissing = 0;
let totalCreated = 0;
const report = [];

for (const feature of features.sort()) {
  const featureDir = join(FEATURES_DIR, feature);
  const required = getRequiredFiles(feature);
  const missing = [];

  // Check if api/ already has hook files (use*.ts) — skip generating use{Name}.ts if so
  const apiDir2 = join(featureDir, 'api');
  const hasExistingHooks =
    existsSync(apiDir2) &&
    readdirSync(apiDir2).some((f) => /^use[A-Z].*\.tsx?$/.test(f));

  for (const req of required) {
    const fullPath = join(featureDir, req.rel);
    const exists =
      req.type === 'dir'
        ? existsSync(fullPath) && statSync(fullPath).isDirectory()
        : existsSync(fullPath);

    // Skip use{Name}.ts if feature already has hook files in api/
    if (!exists && req.rel.startsWith('api/use') && hasExistingHooks) {
      continue;
    }

    if (!exists) {
      missing.push(req);

      if (FIX_MODE) {
        if (req.type === 'dir') {
          mkdirSync(fullPath, { recursive: true });
          console.log(`  + mkdir  ${feature}/${req.rel}`);
          totalCreated++;
        } else {
          // Ensure parent dir exists
          const parentDir = join(fullPath, '..');
          if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true });
          }

          // Only create if we have a template and file doesn't exist
          if (req.template) {
            writeFileSync(fullPath, req.template(), 'utf8');
            console.log(`  + create ${feature}/${req.rel}`);
            totalCreated++;
          }
        }
      }
    }
  }

  // Check for api/ files that already exist (to detect alternate hook names)
  const apiDir = join(featureDir, 'api');
  let existingApiFiles = [];
  if (existsSync(apiDir)) {
    existingApiFiles = readdirSync(apiDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  }

  report.push({
    feature,
    missing: missing.map((m) => m.rel),
    existingApi: existingApiFiles,
    compliant: missing.length === 0,
  });

  totalMissing += missing.length;
}

// --- Summary ---

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));

const compliant = report.filter((r) => r.compliant);
const nonCompliant = report.filter((r) => !r.compliant);

console.log(`\nCompliant: ${compliant.length}/${features.length}`);
console.log(`Non-compliant: ${nonCompliant.length}/${features.length}`);
console.log(`Total missing items: ${totalMissing}`);

if (FIX_MODE) {
  console.log(`Total created: ${totalCreated}`);
}

if (nonCompliant.length > 0) {
  console.log('\n--- Non-compliant features ---\n');
  for (const r of nonCompliant) {
    console.log(`  ${r.feature}:`);
    for (const m of r.missing) {
      console.log(`    - missing: ${m}`);
    }
    if (r.existingApi.length > 0) {
      console.log(`    existing api/: ${r.existingApi.join(', ')}`);
    }
  }
}

if (compliant.length > 0 && !FIX_MODE) {
  console.log('\n--- Compliant features ---\n');
  console.log(`  ${compliant.map((r) => r.feature).join(', ')}`);
}

console.log('');
