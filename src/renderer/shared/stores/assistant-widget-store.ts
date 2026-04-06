/**
 * Assistant Widget Store — UI state for the assistant widget
 *
 * Three modes:
 * - closed: not visible
 * - inline: embedded in the sidebar footer (expanded sidebar only)
 * - popup: floating panel overlay (original behavior)
 */

import { create } from 'zustand';

export type AssistantMode = 'closed' | 'inline' | 'popup';

interface AssistantWidgetState {
  mode: AssistantMode;
  /** Compat: true when mode !== 'closed' */
  isOpen: boolean;
  voiceOutputEnabled: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setMode: (mode: AssistantMode) => void;
  toggleVoiceOutput: () => void;
}

export const useAssistantWidgetStore = create<AssistantWidgetState>((set) => ({
  mode: 'closed',
  isOpen: false,
  voiceOutputEnabled: false,

  toggle: () =>
    set((state) => {
      const nextMode = state.mode === 'closed' ? 'inline' : 'closed';
      return { mode: nextMode, isOpen: nextMode !== 'closed' };
    }),

  open: () => set({ mode: 'inline', isOpen: true }),

  close: () => set({ mode: 'closed', isOpen: false }),

  setMode: (mode) => set({ mode, isOpen: mode !== 'closed' }),

  toggleVoiceOutput: () => set((state) => ({ voiceOutputEnabled: !state.voiceOutputEnabled })),
}));
