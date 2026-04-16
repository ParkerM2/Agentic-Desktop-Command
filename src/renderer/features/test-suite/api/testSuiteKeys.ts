export const testSuiteKeys = {
  all: ['test-suite'] as const,
  config: (projectId: string) => [...testSuiteKeys.all, 'config', projectId] as const,
  scripts: (projectId: string) => [...testSuiteKeys.all, 'scripts', projectId] as const,
  script:  (id: string) => [...testSuiteKeys.all, 'script', id] as const,
  runs:    (scriptId: string) => [...testSuiteKeys.all, 'runs', scriptId] as const,
  run:     (runId: string) => [...testSuiteKeys.all, 'run', runId] as const,
  screenshots: (runId: string) => [...testSuiteKeys.all, 'screenshots', runId] as const,
};
