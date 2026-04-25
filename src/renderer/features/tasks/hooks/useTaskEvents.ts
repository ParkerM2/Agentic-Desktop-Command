/**
 * Task IPC event listeners → query invalidation
 *
 * Bridges real-time events from the main process to React Query cache.
 * Cross-device task sync (formerly via Hub WebSocket) is now handled by
 * the local op-log replication in @features/peers.
 */

import { useQueryClient } from '@tanstack/react-query';

import { TASKS_EVENTS } from '@shared/ipc/hub-tasks/channels';
import type { Task } from '@shared/types';

import { useIpcEvent } from '@renderer/shared/hooks';

import { taskKeys } from '../api/queryKeys';

import { useAgentEvents } from './useAgentEvents';
import { useQaEvents } from './useQaEvents';

export function useTaskEvents() {
  // Agent orchestrator events (planning, execution, watchdog)
  useAgentEvents();
  // QA session events (started, progress, completed)
  useQaEvents();
  // NOTE: Workflow progress events (event:task.progressUpdated) are already
  // handled below — do NOT call useWorkflowEvents() here to avoid duplicate handlers.
  const queryClient = useQueryClient();

  // ── Local task events ──

  // Task status changed → invalidate list and detail
  useIpcEvent(TASKS_EVENTS.STATUS.CHANGED, ({ taskId, projectId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  });

  // Task progress updated → patch detail cache directly
  useIpcEvent(TASKS_EVENTS.PROGRESS.UPDATED, ({ taskId, progress }) => {
    queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) =>
      old ? { ...old, executionProgress: progress } : old,
    );
    // Also invalidate lists to update progress indicators on cards
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  // Log appended → patch detail cache
  useIpcEvent(TASKS_EVENTS.LOG.APPENDED, ({ taskId, log }) => {
    queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) =>
      old ? { ...old, logs: [...(old.logs ?? []), log] } : old,
    );
  });

  // Plan updated → invalidate detail
  useIpcEvent(TASKS_EVENTS.PLAN.UPDATED, ({ taskId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  });
}
