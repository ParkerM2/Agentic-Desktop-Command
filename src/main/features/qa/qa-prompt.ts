/**
 * QA Prompt Builder
 *
 * Constructs the prompt sent to the Claude QA agent for both quiet and full modes.
 */

import type { QaContext, QaMode } from './qa-types';

const QUIET_DIRECTIVE =
  'Run quiet QA for this task. Check console errors, take screenshots of affected pages, run the verification suite, and report findings.';

const FULL_DIRECTIVE =
  'Run full QA for this task. Walk through every page, test interactions, check accessibility, monitor DevTools console, take annotated screenshots, and report findings.';

const REPORT_FORMAT = [
  '',
  'Run the verification suite: npm run lint && npm run typecheck && npm run test && npm run build && npm run check:docs',
  '',
  'Output your report as a JSON block with this structure:',
  '```json',
  '{',
  '  "result": "pass" | "fail" | "warnings",',
  '  "checksRun": <number>,',
  '  "checksPassed": <number>,',
  '  "issues": [{ "severity": "critical"|"major"|"minor"|"cosmetic", "category": "<string>", "description": "<string>", "location": "<string>" }],',
  '  "verificationSuite": { "lint": "pass"|"fail", "typecheck": "pass"|"fail", "test": "pass"|"fail", "build": "pass"|"fail", "docs": "pass"|"fail" },',
  '  "screenshots": [{ "label": "<string>", "path": "<string>", "timestamp": "<iso>", "annotated": <boolean> }]',
  '}',
  '```',
].join('\n');

export function buildQaPrompt(mode: QaMode, context: QaContext): string {
  const directive = mode === 'quiet' ? QUIET_DIRECTIVE : FULL_DIRECTIVE;

  const changedFilesList =
    context.changedFiles.length > 0
      ? `\n\nChanged files:\n${context.changedFiles.map((f) => `  - ${f}`).join('\n')}`
      : '';

  const planSection = context.planContent
    ? `\n\nImplementation plan:\n${context.planContent}`
    : '';

  return `${directive}\n\nTask description: ${context.taskDescription}${changedFilesList}${planSection}${REPORT_FORMAT}`;
}
