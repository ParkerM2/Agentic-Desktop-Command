import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TestSuiteStep } from '@shared/types/test-suite';

import type { StatusFilter } from './lib/constants';
import type { StoreOutputLine } from './lib/types';

export type { StatusFilter } from './lib/constants';

export type TestSuiteTab = 'recording' | 'library' | 'results' | 'screenshots' | 'export' | 'analytics' | 'shared-steps';

export interface RecordedStep {
  stepIndex: number;
  step: TestSuiteStep;
  timestamp: string;
}

interface TestSuiteUiState {
  activeTab: TestSuiteTab;
  selectedScriptId: string | null;
  selectedRunId: string | null;
  recordingActive: boolean;
  recordedSteps: RecordedStep[];
  shortcutHelpOpen: boolean;
  libraryStatusFilter: StatusFilter;

  // Ephemeral run-output state (not persisted)
  isRunning: boolean;
  activeRunId: string | null;
  outputLines: StoreOutputLine[];
  _lineCounter: number;

  setActiveTab: (tab: TestSuiteTab) => void;
  setSelectedScriptId: (id: string | null) => void;
  setSelectedRunId: (id: string | null) => void;
  setRecordingActive: (active: boolean) => void;
  addStep: (step: RecordedStep) => void;
  /** Append a raw TestSuiteStep captured from the webview preload */
  appendRawStep: (step: TestSuiteStep) => void;
  removeStep: (stepIndex: number) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
  updateStep: (stepIndex: number, step: TestSuiteStep) => void;
  clearSteps: () => void;
  setShortcutHelpOpen: (open: boolean) => void;
  setLibraryStatusFilter: (filter: StatusFilter) => void;

  // Run output actions
  setRunning: (running: boolean) => void;
  setActiveRunId: (runId: string | null) => void;
  appendOutputLine: (line: string) => void;
  clearOutputLines: () => void;
}

export const useTestSuiteStore = create<TestSuiteUiState>()(
  persist(
    (set) => ({
      activeTab: 'recording',
      selectedScriptId: null,
      selectedRunId: null,
      recordingActive: false,
      recordedSteps: [],
      shortcutHelpOpen: false,
      libraryStatusFilter: 'all' as StatusFilter,

      // Ephemeral run-output state
      isRunning: false,
      activeRunId: null,
      outputLines: [],
      _lineCounter: 0,

      setActiveTab: (activeTab) => {
        set({ activeTab });
      },
      setSelectedScriptId: (selectedScriptId) => {
        set({ selectedScriptId });
      },
      setSelectedRunId: (selectedRunId) => {
        set({ selectedRunId });
      },
      setRecordingActive: (recordingActive) => {
        set({ recordingActive });
      },
      addStep: (step) => {
        set((s) => ({ recordedSteps: [...s.recordedSteps, step] }));
      },
      appendRawStep: (step) => {
        set((s) => {
          const stepIndex = s.recordedSteps.length;
          const recorded: RecordedStep = { stepIndex, step, timestamp: new Date().toISOString() };
          return { recordedSteps: [...s.recordedSteps, recorded] };
        });
      },
      removeStep: (stepIndex) => {
        set((state) => ({
          recordedSteps: state.recordedSteps
            .filter((s) => s.stepIndex !== stepIndex)
            .map((s, i) => ({ ...s, stepIndex: i })),
        }));
      },
      reorderSteps: (fromIndex, toIndex) => {
        set((state) => {
          const steps = [...state.recordedSteps];
          if (fromIndex < 0 || fromIndex >= steps.length) {
            return { recordedSteps: steps };
          }
          const [moved] = steps.splice(fromIndex, 1) as [RecordedStep];
          steps.splice(toIndex, 0, moved);
          return { recordedSteps: steps.map((s, i) => ({ ...s, stepIndex: i })) };
        });
      },
      updateStep: (stepIndex, step) => {
        set((state) => ({
          recordedSteps: state.recordedSteps.map((s) =>
            s.stepIndex === stepIndex ? { ...s, step } : s,
          ),
        }));
      },
      clearSteps: () => {
        set({ recordedSteps: [] });
      },
      setShortcutHelpOpen: (shortcutHelpOpen) => {
        set({ shortcutHelpOpen });
      },
      setLibraryStatusFilter: (libraryStatusFilter) => {
        set({ libraryStatusFilter });
      },

      // Run output actions
      setRunning: (isRunning) => {
        set({ isRunning });
      },
      setActiveRunId: (activeRunId) => {
        set({ activeRunId });
      },
      appendOutputLine: (line) => {
        set((s) => ({
          outputLines: [...s.outputLines, { id: s._lineCounter, text: line }],
          _lineCounter: s._lineCounter + 1,
        }));
      },
      clearOutputLines: () => {
        set({ outputLines: [], _lineCounter: 0 });
      },
    }),
    {
      name: 'adc-test-suite-ui',
      partialize: (state) => ({
        activeTab: state.activeTab,
        selectedScriptId: state.selectedScriptId,
        selectedRunId: state.selectedRunId,
      }),
    },
  ),
);
