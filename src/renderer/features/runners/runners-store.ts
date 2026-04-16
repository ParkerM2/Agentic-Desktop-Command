import { create } from 'zustand';

import type {
  RunnerHealthEvent,
  RunnerOutputEvent,
  RunnerStatusEvent,
} from '@shared/ipc/runners/schemas';

const MAX_LINES = 2000;

interface RunnerUiState {
  outputs: Record<string, string[]>;
  lastHealth: Record<string, RunnerHealthEvent>;
  appendOutput: (evt: RunnerOutputEvent) => void;
  setHealth: (evt: RunnerHealthEvent) => void;
  clearInstance: (instanceId: string) => void;
  applyStatus: (evt: RunnerStatusEvent) => void;
}

export const useRunnersStore = create<RunnerUiState>((set) => ({
  outputs: {},
  lastHealth: {},
  appendOutput: (evt) =>
    set((s) => {
      const prev = s.outputs[evt.instanceId] ?? [];
      const nextLines = evt.chunk.split(/\r?\n/).filter(Boolean);
      const merged = [...prev, ...nextLines].slice(-MAX_LINES);
      return { outputs: { ...s.outputs, [evt.instanceId]: merged } };
    }),
  setHealth: (evt) => set((s) => ({ lastHealth: { ...s.lastHealth, [evt.instanceId]: evt } })),
  applyStatus: () => {
    // no-op: status events are handled via query invalidation in useRunnerEvents
  },
  clearInstance: (instanceId) =>
    set((s) => {
      const { [instanceId]: _o, ...outputs } = s.outputs;
      const { [instanceId]: _h, ...lastHealth } = s.lastHealth;
      return { outputs, lastHealth };
    }),
}));
