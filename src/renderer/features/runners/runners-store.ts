import { create } from 'zustand';

import type {
  RunnerHealthEvent,
  RunnerOutputEvent,
} from '@shared/ipc/runners/schemas';

const MAX_LINES = 2000;

interface RunnerUiState {
  outputs: Record<string, string[]>;
  lastHealth: Record<string, RunnerHealthEvent>;
  appendOutput: (evt: RunnerOutputEvent) => void;
  setHealth: (evt: RunnerHealthEvent) => void;
  clearInstance: (instanceId: string) => void;
  pruneExcept: (keepIds: string[]) => void;
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
  clearInstance: (instanceId) =>
    set((s) => {
      const { [instanceId]: _o, ...outputs } = s.outputs;
      const { [instanceId]: _h, ...lastHealth } = s.lastHealth;
      return { outputs, lastHealth };
    }),
  pruneExcept: (keepIds) =>
    set((s) => {
      const keep = new Set(keepIds);
      const outputs: Record<string, string[]> = {};
      for (const [id, lines] of Object.entries(s.outputs)) {
        if (keep.has(id)) outputs[id] = lines;
      }
      const lastHealth: Record<string, RunnerHealthEvent> = {};
      for (const [id, evt] of Object.entries(s.lastHealth)) {
        if (keep.has(id)) lastHealth[id] = evt;
      }
      return { outputs, lastHealth };
    }),
}));
