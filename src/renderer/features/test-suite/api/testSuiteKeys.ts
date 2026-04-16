export const testSuiteKeys = {
  all: ['test-suite'] as const,
  config: (projectId: string) => [...testSuiteKeys.all, 'config', projectId] as const,
  scripts: (projectId: string) => [...testSuiteKeys.all, 'scripts', projectId] as const,
  script:  (id: string) => [...testSuiteKeys.all, 'script', id] as const,
  runs:    (scriptId: string) => [...testSuiteKeys.all, 'runs', scriptId] as const,
  run:     (runId: string) => [...testSuiteKeys.all, 'run', runId] as const,
  screenshots: (runId: string) => [...testSuiteKeys.all, 'screenshots', runId] as const,
  analytics: {
    all: (projectId: string) => ['test-suite', 'analytics', projectId] as const,
    summary: (projectId: string) => ['test-suite', 'analytics', 'summary', projectId] as const,
    trend: (projectId: string) => ['test-suite', 'analytics', 'trend', projectId] as const,
    topFailures: (projectId: string) => ['test-suite', 'analytics', 'top-failures', projectId] as const,
    slowest: (projectId: string) => ['test-suite', 'analytics', 'slowest', projectId] as const,
    errorPatterns: (projectId: string) => ['test-suite', 'analytics', 'error-patterns', projectId] as const,
    flaky: (projectId: string) => ['test-suite', 'analytics', 'flaky', projectId] as const,
    runHistory: (scriptId: string) => ['test-suite', 'analytics', 'run-history', scriptId] as const,
  },
};
