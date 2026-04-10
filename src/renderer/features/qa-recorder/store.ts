/**
 * QA Recorder UI Store — Client-side state only
 *
 * Recording state, recorded steps, run output lines, active script/run selection.
 * No data from main process lives here — use React Query hooks for that.
 */

import { create } from 'zustand';

import type { QaRecorderStep } from './api/useScriptMutations';

export interface OutputLine {
  id: number;
  text: string;
}

interface QaRecorderState {
  // Recording
  isRecording: boolean;
  recordedSteps: QaRecorderStep[];

  // Run output
  isRunning: boolean;
  activeRunId: string | null;
  outputLines: OutputLine[];
  _lineCounter: number;

  // Script selection
  selectedScriptId: string | null;

  // Actions
  startRecording: () => void;
  stopRecording: () => void;
  clearRecordedSteps: () => void;
  appendStep: (step: QaRecorderStep) => void;

  setRunning: (running: boolean) => void;
  setActiveRunId: (runId: string | null) => void;
  appendOutputLine: (line: string) => void;
  clearOutputLines: () => void;

  selectScript: (id: string | null) => void;
}

export const useQaRecorderStore = create<QaRecorderState>((set) => ({
  isRecording: false,
  recordedSteps: [],
  isRunning: false,
  activeRunId: null,
  outputLines: [],
  _lineCounter: 0,
  selectedScriptId: null,

  startRecording: () => set({ isRecording: true, recordedSteps: [], outputLines: [], _lineCounter: 0 }),
  stopRecording: () => set({ isRecording: false }),
  clearRecordedSteps: () => set({ recordedSteps: [] }),
  appendStep: (step) =>
    set((s) => ({ recordedSteps: [...s.recordedSteps, step] })),

  setRunning: (running) => set({ isRunning: running }),
  setActiveRunId: (runId) => set({ activeRunId: runId }),
  appendOutputLine: (line) =>
    set((s) => ({
      outputLines: [...s.outputLines, { id: s._lineCounter, text: line }],
      _lineCounter: s._lineCounter + 1,
    })),
  clearOutputLines: () => set({ outputLines: [], _lineCounter: 0 }),

  selectScript: (id) => set({ selectedScriptId: id }),
}));
