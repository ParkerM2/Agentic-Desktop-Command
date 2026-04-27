export const testSuiteKeys = {
  all: ['test-suite'] as const,
  config: (projectId: string) => [...testSuiteKeys.all, 'config', projectId] as const,
  configs: (projectId: string) => [...testSuiteKeys.all, 'configs', projectId] as const,
  scripts: (projectId: string) => [...testSuiteKeys.all, 'scripts', projectId] as const,
  script: (id: string) => [...testSuiteKeys.all, 'script', id] as const,
  runs: (scriptId: string) => [...testSuiteKeys.all, 'runs', scriptId] as const,
  allRuns: (projectId: string) => [...testSuiteKeys.all, 'runs', 'all', projectId] as const,
  run: (runId: string) => [...testSuiteKeys.all, 'run', runId] as const,
  screenshots: (runId: string) => [...testSuiteKeys.all, 'screenshots', runId] as const,

  // Baselines & diffs
  baselines: (scriptId: string) => [...testSuiteKeys.all, 'baselines', scriptId] as const,
  diffs: (runId: string) => [...testSuiteKeys.all, 'diffs', runId] as const,

  // Schedules
  schedules: (projectId: string) => [...testSuiteKeys.all, 'schedules', projectId] as const,

  // Shared steps
  sharedSteps: (projectId: string) => [...testSuiteKeys.all, 'shared-steps', projectId] as const,
  sharedStepDomains: (projectId: string) => [...testSuiteKeys.all, 'shared-steps', 'domains', projectId] as const,

  // Watch mode
  watchList: ['test-suite', 'watch', 'list'] as const,

  analytics: {
    all: (projectId: string) => [...testSuiteKeys.all, 'analytics', projectId] as const,
    summary: (projectId: string) => [...testSuiteKeys.all, 'analytics', 'summary', projectId] as const,
    trend: (projectId: string) => [...testSuiteKeys.all, 'analytics', 'trend', projectId] as const,
    topFailures: (projectId: string) => [...testSuiteKeys.all, 'analytics', 'top-failures', projectId] as const,
    slowest: (projectId: string) => [...testSuiteKeys.all, 'analytics', 'slowest', projectId] as const,
    errorPatterns: (projectId: string) => [...testSuiteKeys.all, 'analytics', 'error-patterns', projectId] as const,
    flaky: (projectId: string) => [...testSuiteKeys.all, 'analytics', 'flaky', projectId] as const,
    runHistory: (scriptId: string) => [...testSuiteKeys.all, 'analytics', 'run-history', scriptId] as const,
  },
};
