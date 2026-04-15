#!/usr/bin/env node
/**
 * check-barrel-exports — validates Feature Slice Design index.ts barrel exports
 *
 * Called by on-edit-dispatch.mjs when src/renderer/features/*/index.ts is edited.
 * Receives: FILE_PATH (env) — the index.ts that was just edited.
 *
 * Checks:
 * 1. All component .tsx files in the feature have a corresponding export
 * 2. All api/use*.ts hooks have a corresponding export
 * 3. No export points to a non-existent file
 *
 * Outputs warnings to stdout (injected into Claude context).
 * Always exits 0 — warnings only, never blocks.
 *
 * To add this to more file patterns, update .claude/automate.json onEdit rules.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const filePath = process.env.FILE_PATH ?? process.argv[2] ?? '';
if (!filePath) process.exit(0);

const absPath = existsSync(filePath) ? filePath : resolve(ROOT, filePath);
if (!existsSync(absPath)) process.exit(0);

const featureDir = dirname(absPath);
const indexContent = readFileSync(absPath, 'utf-8');

const warnings = [];

// ─── Check: exports for component files ───────────────────────────────────────
const componentsDir = resolve(featureDir, 'components');
if (existsSync(componentsDir)) {
  const componentFiles = readdirSync(componentsDir, { withFileTypes: true })
    .filter((f) => f.isFile() && ['.tsx', '.ts'].includes(extname(f.name)) && !f.name.startsWith('.'))
    .map((f) => f.name.replace(/\.(tsx|ts)$/, ''));

  for (const name of componentFiles) {
    if (name === 'index') continue;
    // Check if it's re-exported from the barrel
    const isExported =
      indexContent.includes(`'./components/${name}'`) ||
      indexContent.includes(`"./components/${name}"`) ||
      indexContent.includes(`'./components'`) ||
      indexContent.includes(`"./components"`);

    if (!isExported) {
      warnings.push(`MISSING EXPORT: ${name} (components/${name}.tsx) not found in barrel`);
    }
  }
}

// ─── Check: exports for api/use*.ts hooks ─────────────────────────────────────
const apiDir = resolve(featureDir, 'api');
if (existsSync(apiDir)) {
  const hookFiles = readdirSync(apiDir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.startsWith('use') && f.name.endsWith('.ts'))
    .map((f) => f.name.replace(/\.ts$/, ''));

  for (const name of hookFiles) {
    const isExported =
      indexContent.includes(`'./api/${name}'`) ||
      indexContent.includes(`"./api/${name}"`) ||
      indexContent.includes(`'./api'`) ||
      indexContent.includes(`"./api"`);

    if (!isExported) {
      warnings.push(`MISSING EXPORT: ${name} (api/${name}.ts) not found in barrel`);
    }
  }
}

// ─── Check: no broken export paths ────────────────────────────────────────────
const exportMatches = indexContent.matchAll(/from ['"](\.[^'"]+)['"]/g);
for (const match of exportMatches) {
  const importPath = match[1];
  const candidates = [
    resolve(featureDir, importPath),
    resolve(featureDir, importPath + '.ts'),
    resolve(featureDir, importPath + '.tsx'),
    resolve(featureDir, importPath, 'index.ts'),
    resolve(featureDir, importPath, 'index.tsx'),
  ];
  if (!candidates.some(existsSync)) {
    warnings.push(`BROKEN EXPORT: '${importPath}' does not resolve to an existing file`);
  }
}

// ─── Output ───────────────────────────────────────────────────────────────────
if (warnings.length) {
  const featureName = basename(featureDir);
  process.stdout.write(`[check-barrel-exports] ${featureName}/index.ts has ${warnings.length} issue(s):\n`);
  warnings.forEach((w) => process.stdout.write(`  • ${w}\n`));
} else {
  // Silent on clean — no noise in Claude context
}

process.exit(0);
