import { create } from 'zustand';

/** Minimal placeholder store for future Tools config state. */
interface ToolsState {
  /** Reserved for future use */
  _placeholder: boolean;
}

export const useToolsStore = create<ToolsState>()(() => ({
  _placeholder: false,
}));
