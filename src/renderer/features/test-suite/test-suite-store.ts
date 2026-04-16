import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TestSuiteTab = 'recording' | 'library' | 'results' | 'screenshots' | 'export';

interface TestSuiteUiState {
  activeTab: TestSuiteTab;
  selectedScriptId: string | null;
  selectedRunId: string | null;
  recordingActive: boolean;
  setActiveTab: (tab: TestSuiteTab) => void;
  setSelectedScriptId: (id: string | null) => void;
  setSelectedRunId: (id: string | null) => void;
  setRecordingActive: (active: boolean) => void;
}

export const useTestSuiteStore = create<TestSuiteUiState>()(
  persist(
    (set) => ({
      activeTab: 'recording',
      selectedScriptId: null,
      selectedRunId: null,
      recordingActive: false,
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
    }),
    { name: 'adc-test-suite-ui' },
  ),
);
