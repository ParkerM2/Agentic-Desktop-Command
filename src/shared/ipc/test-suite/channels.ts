import { domain, events } from '../channel-builder';

export const TEST_SUITE = domain('test-suite', {
  LIST: ['scripts', 'runs'],
  GET: ['script', 'run'],
  SAVE: ['script'],
  DELETE: ['script'],
  RUN: ['script'],
  TASK: ['attach-run'],
  EXPORT: ['file', 'github', 'ci-preview', 'ci-commit'],
  'BROWSER-VIEW': ['create', 'navigate', 'back', 'forward', 'reload', 'set-bounds', 'destroy'],
  CONFIG: ['get', 'save', 'list', 'delete', 'set-active'],
  SCREENSHOT: ['list', 'export-zip', 'copy'],
  ANALYTICS: ['summary', 'trend', 'top-failures', 'slowest', 'error-patterns', 'flaky', 'run-history'],
  WATCH: ['start', 'stop', 'list'],
  BASELINE: ['list', 'set', 'delete'],
  DIFF: ['compare', 'list'],
  'SHARED-STEPS': ['list', 'get', 'create', 'update', 'delete', 'domains'],
  SCHEDULE: ['list', 'get', 'create', 'update', 'delete', 'trigger-now'],
  'DATA-RUN': ['parse', 'execute'],
  OPEN: ['report'],
  AUTH: ['save', 'clear'],
  BATCH: ['run'],
});

export const TEST_SUITE_EVENTS = events('test-suite', {
  OUTPUT: ['line'],
  RUN: ['screenshot', 'started', 'step', 'completed'],
  RECORDER: ['step', 'stopped'],
  CONFIG: ['changed'],
  WATCH: ['triggered'],
});
