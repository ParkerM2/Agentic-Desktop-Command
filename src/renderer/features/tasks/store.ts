/**
 * Task UI Store — Client-side state only
 *
 * Selections, filters, kanban ordering.
 * No data from main process lives here.
 */

import { create } from 'zustand';

import type { TaskStatus } from '@shared/types';

interface TaskUIState {
  selectedTaskId: string | null;
  filterStatus: TaskStatus | null;
  searchQuery: string;
  kanbanColumnOrder: Record<string, string[]>;

  selectTask: (id: string | null) => void;
  setFilterStatus: (status: TaskStatus | null) => void;
  setSearchQuery: (query: string) => void;
  setColumnOrder: (status: string, taskIds: string[]) => void;
}

export const useTaskUI = create<TaskUIState>((set) => ({
  selectedTaskId: null,
  filterStatus: null,
  searchQuery: '',
  kanbanColumnOrder: {},

  selectTask: (id) => set({ selectedTaskId: id }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setColumnOrder: (status, taskIds) =>
    set((s) => ({
      kanbanColumnOrder: { ...s.kanbanColumnOrder, [status]: taskIds },
    })),
}));
