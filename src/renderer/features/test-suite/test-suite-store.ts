import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TestSuiteStep } from '@shared/types/test-suite';

export type TestSuiteTab = 'recording' | 'library' | 'results' | 'screenshots' | 'export' | 'analytics';

export type StatusFilter = 'all' | 'passed' | 'failed' | 'flaky' | 'no-runs';

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
  setActiveTab: (tab: TestSuiteTab) => void;
  setSelectedScriptId: (id: string | null) => void;
  setSelectedRunId: (id: string | null) => void;
  setRecordingActive: (active: boolean) => void;
  addStep: (step: RecordedStep) => void;
  clearSteps: () => void;
  setShortcutHelpOpen: (open: boolean) => void;
  setLibraryStatusFilter: (filter: StatusFilter) => void;
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
      clearSteps: () => {
        set({ recordedSteps: [] });
      },
      setShortcutHelpOpen: (shortcutHelpOpen) => {
        set({ shortcutHelpOpen });
      },
      setLibraryStatusFilter: (libraryStatusFilter) => {
        set({ libraryStatusFilter });
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
