/**
 * Workflow Exporter
 *
 * Generates a GitHub Actions workflow YAML for the test suite.
 * Supports preview (dry-run) and commit (write to disk) modes.
 */

import fs from 'node:fs';
import path from 'node:path';

const WORKFLOW_PATH = '.github/workflows/test-suite.yml';

export function previewWorkflow(
  projectRoot: string,
  testDir: string,
  specNames: string[],
): { yaml: string; filePath: string; exists: boolean } {
  const yaml = renderYaml(testDir);
  const exists = fs.existsSync(path.join(projectRoot, WORKFLOW_PATH));
  return { yaml, filePath: WORKFLOW_PATH, exists };
}

export function commitWorkflow(
  projectRoot: string,
  testDir: string,
  specNames: string[],
): { filePath: string; committed: boolean } {
  const fullPath = path.join(projectRoot, WORKFLOW_PATH);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, renderYaml(testDir), 'utf8');
  return { filePath: fullPath, committed: true };
}

function renderYaml(testDir: string): string {
  return `name: Test Suite
on:
  pull_request:
    paths:
      - '${testDir}/**'
      - 'src/**'

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test ${testDir}/scripts/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            ${testDir}/screenshots/
            playwright-report/
`;
}
