/**
 * Test Suite query keys factory
 */
export const testSuiteKeys = {
  all: ['test-suite'] as const,
  scripts: () => [...testSuiteKeys.all, 'scripts'] as const,
  script: (id: string) => [...testSuiteKeys.scripts(), id] as const,
  runs: () => [...testSuiteKeys.all, 'runs'] as const,
  runsByScript: (scriptId: string) => [...testSuiteKeys.runs(), scriptId] as const,
  run: (runId: string) => [...testSuiteKeys.runs(), runId] as const,
};
