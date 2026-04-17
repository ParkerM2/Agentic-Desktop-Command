const ANALYTICS = 'analytics';

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
  analytics: {
    all: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, projectId] as const,
    summary: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'summary', projectId] as const,
    trend: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'trend', projectId] as const,
    topFailures: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'top-failures', projectId] as const,
    slowest: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'slowest', projectId] as const,
    errorPatterns: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'error-patterns', projectId] as const,
    flaky: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'flaky', projectId] as const,
    runHistory: (scriptId: string) => [...testSuiteKeys.all, ANALYTICS, 'run-history', scriptId] as const,
  },
};
