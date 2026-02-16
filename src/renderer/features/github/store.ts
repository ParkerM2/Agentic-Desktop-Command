/**
 * GitHub UI state store
 */

import { create } from 'zustand';

type GitHubTab = 'prs' | 'issues' | 'notifications';

interface GitHubUIState {
  /** Active tab in the GitHub page */
  activeTab: GitHubTab;
  /** Selected PR number for the detail modal */
  selectedPrNumber: number | null;
  /** Current repo owner */
  owner: string;
  /** Current repo name */
  repo: string;
  setActiveTab: (tab: GitHubTab) => void;
  selectPr: (prNumber: number | null) => void;
  setRepo: (owner: string, repo: string) => void;
}

export const useGitHubStore = create<GitHubUIState>()((set) => ({
  activeTab: 'prs',
  selectedPrNumber: null,
  owner: 'ParkerM2',
  repo: 'Agentic-Desktop-Command',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectPr: (prNumber) => set({ selectedPrNumber: prNumber }),
  setRepo: (owner, repo) => set({ owner, repo }),
}));
