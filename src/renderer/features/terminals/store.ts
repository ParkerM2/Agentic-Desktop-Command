/**
 * Terminal UI Store — Client-side state
 *
 * Active terminal selection, output buffers for xterm rendering.
 */

import { create } from 'zustand';

interface TerminalUIState {
  activeTerminalId: string | null;
  outputBuffers: Record<string, string[]>;

  setActiveTerminal: (id: string | null) => void;
  appendOutput: (sessionId: string, data: string) => void;
  clearOutput: (sessionId: string) => void;
}

export const useTerminalUI = create<TerminalUIState>((set) => ({
  activeTerminalId: null,
  outputBuffers: {},

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  appendOutput: (sessionId, data) =>
    set((s) => ({
      outputBuffers: {
        ...s.outputBuffers,
        [sessionId]: [...(s.outputBuffers[sessionId] ?? []), data],
      },
    })),

  clearOutput: (sessionId) =>
    set((s) => {
      const { [sessionId]: _, ...rest } = s.outputBuffers;
      return { outputBuffers: rest };
    }),
}));
