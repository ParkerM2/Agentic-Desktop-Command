/**
 * Progress Context Store — Global Zustand Store
 *
 * Single source of truth for progress tasks and active pipeline sessions.
 * Hydrated by ProgressContextHydrator (Task 5) mounted in RootLayout.
 *
 * NOTE: This is a minimal stub created for Task 6 (ProgressTaskDetailRow).
 * Full implementation is in Task 4. QA will verify after Task 4 merges.
 */

import { create } from 'zustand';

import type { ProgressPriority, ProgressTask } from '@shared/types/progress';

// ─── Store Shape ─────────────────────────────────────────

interface ProgressContextState {
  tasks: ProgressTask[];
  archivedCount: number;
  /** slug → active action session */
  activeSessions: Partial<Record<string, { sessionId: string; action: string }>>;
  isLoading: boolean;

  // ── Actions (call IPC) ──────────────────────────────────
  createTask: (
    slug: string,
    title: string,
    description: string,
    priority?: ProgressPriority,
  ) => Promise<ProgressTask>;
  updateTask: (slug: string, updates: Partial<ProgressTask>) => Promise<void>;
  archiveTask: (slug: string) => Promise<void>;
  startResearch: (slug: string) => Promise<void>;
  createPlan: (slug: string) => Promise<void>;
  spinUpTeam: (slug: string) => Promise<void>;
  runWorkflow: (slug: string) => Promise<void>;
  cancelAction: (slug: string) => Promise<void>;
}

// ─── Stub Implementations ────────────────────────────────

const noop = async (): Promise<void> => {
  // Stub — real implementation wired by Task 4
};

// ─── Store ───────────────────────────────────────────────

export const useProgressContext = create<ProgressContextState>()(() => ({
  tasks: [],
  archivedCount: 0,
  activeSessions: {},
  isLoading: false,

  createTask: (_slug, _title, _description, _priority) => {
    // Stub — real implementation wired by Task 4
    return Promise.reject(new Error('ProgressContextStore not hydrated'));
  },
  updateTask: noop,
  archiveTask: noop,
  startResearch: noop,
  createPlan: noop,
  spinUpTeam: noop,
  runWorkflow: noop,
  cancelAction: noop,
}));
