/**
 * GitHub Store — UI state for the GitHub panel:
 * active sub-tab, selected PR, repo context, and issue create dialog.
 */

import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────────

export type GitHubTab = 'prs' | 'issues' | 'notifications';

interface GitHubState {
  githubActiveTab: GitHubTab;
  githubSelectedPrNumber: number | null;
  githubOwner: string;
  githubRepo: string;
  githubIssueCreateDialogOpen: boolean;
  setGitHubActiveTab: (tab: GitHubTab) => void;
  selectPr: (prNumber: number | null) => void;
  setGitHubRepo: (owner: string, repo: string) => void;
  setIssueCreateDialogOpen: (open: boolean) => void;
}

// ── Store ────────────────────────────────────────────────────

export const useGitHubStore = create<GitHubState>((set) => ({
  githubActiveTab: 'prs',
  githubSelectedPrNumber: null,
  githubOwner: '',
  githubRepo: '',
  githubIssueCreateDialogOpen: false,

  setGitHubActiveTab: (tab) => set({ githubActiveTab: tab }),
  selectPr: (prNumber) => set({ githubSelectedPrNumber: prNumber }),
  setGitHubRepo: (owner, repo) => set({ githubOwner: owner, githubRepo: repo }),
  setIssueCreateDialogOpen: (open) => set({ githubIssueCreateDialogOpen: open }),
}));
