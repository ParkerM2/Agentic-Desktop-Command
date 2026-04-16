export const testSuiteKeys = {
  all: ['test-suite'] as const,
  configs: () => [...testSuiteKeys.all, 'config'] as const,
  config: (projectId: string) => [...testSuiteKeys.configs(), projectId] as const,
  scripts: () => [...testSuiteKeys.all, 'scripts'] as const,
  scriptsByProject: (projectId: string) => [...testSuiteKeys.scripts(), projectId] as const,
  script: (id: string) => [...testSuiteKeys.scripts(), id] as const,
  runs: () => [...testSuiteKeys.all, 'runs'] as const,
  runsByScript: (scriptId: string) => [...testSuiteKeys.runs(), scriptId] as const,
  run: (runId: string) => [...testSuiteKeys.runs(), runId] as const,
  screenshots: () => [...testSuiteKeys.all, 'screenshots'] as const,
  screenshotsByRun: (runId: string) => [...testSuiteKeys.screenshots(), runId] as const,
};
