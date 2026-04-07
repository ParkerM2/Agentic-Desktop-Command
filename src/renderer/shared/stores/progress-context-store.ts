/**
 * Progress Context Store — Global Zustand store for progress-driven task pipeline.
 *
 * STUB — will be replaced by Task 4.
 *
 * This file provides the interface contract so Task 5 (ProgressTaskGrid) can
 * compile while Task 4 (full implementation) runs in parallel. Once Task 4
 * merges, this stub is replaced by the real implementation.
 */

import { create } from 'zustand';

import type { ProgressPriority, ProgressTask } from '@shared/types/progress';

// ── Store shape ────────────────────────────────────────────

export interface ProgressContextState {
  tasks: ProgressTask[];
  archivedCount: number;
  activeSessions: Map<string, { sessionId: string; action: string }>;
  isLoading: boolean;

  // Actions (call IPC) — property signature style required by lint
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

// ── STUB implementation ────────────────────────────────────
// Returns empty state and no-op actions. Task 4 replaces this.

const stubError = (): Promise<never> =>
  Promise.reject(new Error('STUB: progress-context-store not yet implemented by Task 4'));

const stubVoid = (): Promise<void> => Promise.resolve();

export const useProgressContext = create<ProgressContextState>()(() => ({
  tasks: [],
  archivedCount: 0,
  activeSessions: new Map(),
  isLoading: false,

  createTask: stubError,
  updateTask: stubVoid,
  archiveTask: stubVoid,
  startResearch: stubVoid,
  createPlan: stubVoid,
  spinUpTeam: stubVoid,
  runWorkflow: stubVoid,
  cancelAction: stubVoid,
}));
