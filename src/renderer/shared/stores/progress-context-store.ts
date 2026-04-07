/**
 * Progress Context Store — Global progress task state
 *
 * Single source of truth for all progress task data in the renderer.
 * Hydrated by ProgressContextHydrator on app startup and kept in sync
 * with main-process events via the hydrator's event subscriptions.
 *
 * Uses Record (not Map) for activeSessions so Zustand state is serializable.
 */

import { create } from 'zustand';

import type { ProgressPriority, ProgressTask } from '@shared/types/progress';

import { ipc } from '@renderer/shared/lib/ipc';

interface ActiveSession {
  sessionId: string;
  action: string;
}

interface ProgressContextState {
  tasks: ProgressTask[];
  archivedCount: number;
  activeSessions: Record<string, ActiveSession>; // slug → active action
  isLoading: boolean;

  // ── Internal setters (used by hydrator) ─────────────────────
  setTasks: (tasks: ProgressTask[]) => void;
  setArchivedCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  upsertTask: (task: ProgressTask) => void;
  removeTask: (slug: string) => void;
  setActiveSession: (slug: string, sessionId: string, action: string) => void;
  clearActiveSession: (slug: string) => void;

  // ── Public IPC actions ───────────────────────────────────────
  createTask: (
    slug: string,
    title: string,
    description: string,
    priority?: ProgressPriority,
  ) => Promise<ProgressTask>;
  updateTask: (slug: string, updates: Partial<ProgressTask>) => Promise<void>;
  archiveTask: (slug: string) => Promise<void>;
  startResearch: (slug: string, prompt?: string) => Promise<void>;
  createPlan: (slug: string, prompt?: string) => Promise<void>;
  spinUpTeam: (slug: string, prompt?: string) => Promise<void>;
  runWorkflow: (slug: string) => Promise<void>;
  cancelAction: (slug: string) => Promise<void>;
}

export const useProgressContext = create<ProgressContextState>((set, get) => ({
  tasks: [],
  archivedCount: 0,
  activeSessions: {},
  isLoading: true,

  // ── Internal setters ─────────────────────────────────────────

  setTasks: (tasks) => {
    set({ tasks });
  },

  setArchivedCount: (archivedCount) => {
    set({ archivedCount });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  upsertTask: (task) => {
    set((state) => {
      const index = state.tasks.findIndex((t) => t.slug === task.slug);
      if (index === -1) {
        return { tasks: [...state.tasks, task] };
      }
      const next = [...state.tasks];
      next[index] = task;
      return { tasks: next };
    });
  },

  removeTask: (slug) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.slug !== slug),
    }));
  },

  setActiveSession: (slug, sessionId, action) => {
    set((state) => ({
      activeSessions: {
        ...state.activeSessions,
        [slug]: { sessionId, action },
      },
    }));
  },

  clearActiveSession: (slug) => {
    set((state) => {
      const { [slug]: _removed, ...rest } = state.activeSessions;
      return { activeSessions: rest };
    });
  },

  // ── Public IPC actions ────────────────────────────────────────

  createTask: async (slug, title, description, priority?: ProgressPriority) => {
    const task = await ipc('progress.createTask', { slug, title, description, priority });
    get().upsertTask(task);
    return task;
  },

  updateTask: async (slug, updates) => {
    const task = await ipc('progress.updateTask', { slug, updates });
    get().upsertTask(task);
  },

  archiveTask: async (slug) => {
    await ipc('progress.archiveTask', { slug });
    get().removeTask(slug);
  },

  startResearch: async (slug, prompt?) => {
    await ipc('progress.startResearch', { slug, prompt });
  },

  createPlan: async (slug, prompt?) => {
    await ipc('progress.createPlan', { slug, prompt });
  },

  spinUpTeam: async (slug, prompt?) => {
    await ipc('progress.spinUpTeam', { slug, prompt });
  },

  runWorkflow: async (slug) => {
    await ipc('progress.runWorkflow', { slug });
  },

  cancelAction: async (slug) => {
    await ipc('progress.cancelAction', { slug });
  },
}));
