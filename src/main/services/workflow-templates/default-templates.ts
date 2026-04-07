/**
 * Default Workflow Templates
 *
 * Built-in templates that ship with the application.
 * These are seeded to .claude/templates/ on first run and
 * cannot be deleted by the user (isBuiltin: true).
 */

import type { WorkflowPhase, WorkflowTemplate } from '@shared/ipc/workflow-templates';

const EPOCH = '2026-01-01T00:00:00.000Z';

const DEFAULT_PHASES: WorkflowPhase[] = [
  { name: 'brainstorming', strategy: 'skip', prompt: '', summarySpec: { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] } },
  { name: 'planning', strategy: 'skip', prompt: '', summarySpec: { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] } },
  { name: 'implementation', strategy: 'skip', prompt: '', summarySpec: { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] } },
];

export const DEFAULT_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'builtin-feature-dev',
    name: 'Feature Dev',
    description:
      'Standard multi-agent feature development with QA review per task and a guardian pass.',
    mode: 'standard',
    branching: {
      featurePrefix: 'feature',
      workPrefix: 'work',
      useWorktrees: false,
    },
    team: {
      maxConcurrentAgents: 3,
      spawnQaPerTask: true,
      enableGuardian: true,
      roles: [
        'schema-designer',
        'service-engineer',
        'component-engineer',
        'hook-engineer',
        'store-engineer',
        'ipc-handler-engineer',
        'qa-reviewer',
      ],
    },
    qa: {
      runLint: true,
      runTypecheck: true,
      runBuild: true,
      runTests: true,
      maxRounds: 3,
    },
    permissions: {
      allowPush: false,
      allowCreatePr: false,
      allowDeleteBranch: false,
      allowShellExec: true,
    },
    guardian: {
      blockingRules: ['file-size', 'no-raw-html-elements', 'no-any'],
      warningRules: ['missing-tests', 'missing-docs'],
      maxFileSizeLines: 300,
    },
    phases: DEFAULT_PHASES,
    isBuiltin: true,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
  {
    id: 'builtin-pr-review',
    name: 'PR Review',
    description:
      'Lightweight review workflow — single QA agent reviews a PR diff for issues and improvements.',
    mode: 'pr-review',
    branching: {
      featurePrefix: 'feature',
      workPrefix: 'work',
      useWorktrees: false,
    },
    team: {
      maxConcurrentAgents: 1,
      spawnQaPerTask: false,
      enableGuardian: false,
      roles: ['qa-reviewer'],
    },
    qa: {
      runLint: true,
      runTypecheck: true,
      runBuild: false,
      runTests: false,
      maxRounds: 1,
    },
    permissions: {
      allowPush: false,
      allowCreatePr: false,
      allowDeleteBranch: false,
      allowShellExec: false,
    },
    guardian: {
      blockingRules: [],
      warningRules: ['missing-tests'],
      maxFileSizeLines: 500,
    },
    phases: DEFAULT_PHASES,
    isBuiltin: true,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
  {
    id: 'builtin-research',
    name: 'Research',
    description:
      'Deep research workflow — agents explore the codebase and produce structured findings.',
    mode: 'research',
    branching: {
      featurePrefix: 'research',
      workPrefix: 'work',
      useWorktrees: false,
    },
    team: {
      maxConcurrentAgents: 2,
      spawnQaPerTask: false,
      enableGuardian: false,
      roles: ['architect', 'api-engineer'],
    },
    qa: {
      runLint: false,
      runTypecheck: false,
      runBuild: false,
      runTests: false,
      maxRounds: 1,
    },
    permissions: {
      allowPush: false,
      allowCreatePr: false,
      allowDeleteBranch: false,
      allowShellExec: true,
    },
    guardian: {
      blockingRules: [],
      warningRules: [],
      maxFileSizeLines: 1000,
    },
    phases: DEFAULT_PHASES,
    isBuiltin: true,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
  {
    id: 'builtin-fast-prototype',
    name: 'Fast Prototype',
    description:
      'Rapid iteration — no QA agents, no guardian, minimal checks. Use for throwaway explorations.',
    mode: 'fast-prototype',
    branching: {
      featurePrefix: 'proto',
      workPrefix: 'work',
      useWorktrees: false,
    },
    team: {
      maxConcurrentAgents: 5,
      spawnQaPerTask: false,
      enableGuardian: false,
      roles: [
        'component-engineer',
        'hook-engineer',
        'store-engineer',
        'styling-engineer',
      ],
    },
    qa: {
      runLint: false,
      runTypecheck: false,
      runBuild: false,
      runTests: false,
      maxRounds: 1,
    },
    permissions: {
      allowPush: false,
      allowCreatePr: false,
      allowDeleteBranch: false,
      allowShellExec: true,
    },
    guardian: {
      blockingRules: [],
      warningRules: [],
      maxFileSizeLines: 1000,
    },
    phases: DEFAULT_PHASES,
    isBuiltin: true,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
];
