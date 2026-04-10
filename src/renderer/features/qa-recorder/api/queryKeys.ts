/**
 * QA Recorder query keys factory
 */
export const qaRecorderKeys = {
  all: ['qa-recorder'] as const,
  scripts: () => [...qaRecorderKeys.all, 'scripts'] as const,
  script: (id: string) => [...qaRecorderKeys.scripts(), id] as const,
  runs: () => [...qaRecorderKeys.all, 'runs'] as const,
  runsByScript: (scriptId: string) => [...qaRecorderKeys.runs(), scriptId] as const,
  run: (runId: string) => [...qaRecorderKeys.runs(), runId] as const,
};
