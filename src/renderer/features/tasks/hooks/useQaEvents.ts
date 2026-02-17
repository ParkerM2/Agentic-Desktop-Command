/**
 * QA IPC event listeners → query invalidation
 *
 * Bridges real-time QA events from the main process to React Query cache.
 * Provides instant feedback when QA sessions start, progress, or complete.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';
import { useToastStore } from '@renderer/shared/stores';

import { taskKeys } from '../api/queryKeys';

const qaKeys = {
  all: ['qa'] as const,
  report: (taskId: string) => [...qaKeys.all, 'report', taskId] as const,
  session: (taskId: string) => [...qaKeys.all, 'session', taskId] as const,
};

export function useQaEvents() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  // QA session started → invalidate session cache for live status
  useIpcEvent('event:qa.started', (data) => {
    void queryClient.invalidateQueries({ queryKey: qaKeys.session(data.taskId) });
  });

  // QA progress → invalidate session cache for live step tracking
  useIpcEvent('event:qa.progress', (data) => {
    void queryClient.invalidateQueries({ queryKey: qaKeys.session(data.taskId) });
  });

  // QA completed → invalidate report + session + task caches, show toast
  useIpcEvent('event:qa.completed', (data) => {
    void queryClient.invalidateQueries({ queryKey: qaKeys.report(data.taskId) });
    void queryClient.invalidateQueries({ queryKey: qaKeys.session(data.taskId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.taskId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

    const isPassing = data.result === 'pass';
    addToast(
      `QA ${isPassing ? 'passed' : 'failed'} for task (${String(data.issueCount)} issues)`,
      isPassing ? 'success' : 'error',
    );
  });
}
