/**
 * README Writer — generates a README.md inside the test-suite scripts dir
 *
 * Lists all .spec.ts files found in the scripts directory.
 * Overwrites on every call so the README stays current.
 *
 * Also writes a .gitignore for test output directories (screenshots, reports).
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function writeTestSuiteReadme(params: {
  projectRoot: string;
  testDir: string;
}): string {
  const scriptsDir = path.join(params.projectRoot, params.testDir, 'scripts');
  const readmePath = path.join(scriptsDir, 'README.md');

  const specs = existsSync(scriptsDir)
    ? readdirSync(scriptsDir).filter((f) => f.endsWith('.spec.ts')).sort()
    : [];

  const lines: string[] = [
    '# Test Suite Scripts',
    '',
    'Auto-generated Playwright test scripts recorded via ADC.',
    '',
    `| # | Script |`,
    `|---|--------|`,
  ];

  for (const [i, spec] of specs.entries()) {
    lines.push(`| ${i + 1} | [${spec}](./${spec}) |`);
  }

  lines.push('');

  writeFileSync(readmePath, lines.join('\n'), 'utf8');
  return readmePath;
}

/**
 * Writes a .gitignore inside the test directory so generated output
 * (screenshots, Playwright reports, test-results) is not committed.
 * Idempotent — overwrites on every call.
 */
export function writeTestSuiteGitignore(params: {
  projectRoot: string;
  testDir: string;
}): string {
  const testDirPath = path.join(params.projectRoot, params.testDir);
  if (!existsSync(testDirPath)) {
    mkdirSync(testDirPath, { recursive: true });
  }

  const gitignorePath = path.join(testDirPath, '.gitignore');
  const content = [
    '# Test Suite output (gitignored)',
    'screenshots/',
    'playwright-report/',
    'test-results/',
    '',
  ].join('\n');

  writeFileSync(gitignorePath, content, 'utf8');
  return gitignorePath;
}
