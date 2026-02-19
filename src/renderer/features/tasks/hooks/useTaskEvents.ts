/**
 * Task IPC event listeners → query invalidation
 *
 * Bridges real-time events from the main process to React Query cache.
 * Handles both local task events and Hub entity task events (synced from other devices).
 */

import { useQueryClient } from '@tanstack/react-query';

import type { Task } from '@shared/types';

import { useHubEvent, useIpcEvent } from '@renderer/shared/hooks';
import { useToastStore } from '@renderer/shared/stores';

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
  useIpcEvent('event:task.statusChanged', ({ taskId, projectId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  });

  // Task progress updated → patch detail cache directly
  useIpcEvent('event:task.progressUpdated', ({ taskId, progress }) => {
    queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) =>
      old ? { ...old, executionProgress: progress } : old,
    );
    // Also invalidate lists to update progress indicators on cards
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  // Log appended → patch detail cache
  useIpcEvent('event:task.logAppended', ({ taskId, log }) => {
    queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) =>
      old ? { ...old, logs: [...(old.logs ?? []), log] } : old,
    );
  });

  // Plan updated → invalidate detail
  useIpcEvent('event:task.planUpdated', ({ taskId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  });

  // ── Hub entity task events (synced from other devices) ──

  // Task created on another device → invalidate list
  useHubEvent('event:hub.tasks.created', ({ projectId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
  });

  // Task updated on another device → invalidate list and detail
  useHubEvent('event:hub.tasks.updated', ({ taskId, projectId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  });

  // Task deleted on another device → invalidate list
  useHubEvent('event:hub.tasks.deleted', ({ projectId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
  });

  // Task progress from another device → patch detail cache directly
  useHubEvent('event:hub.tasks.progress', ({ taskId, progress, phase }) => {
    queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) => {
      if (!old) return old;
      const existing = old.executionProgress ?? {
        phase: 'idle' as const,
        phaseProgress: 0,
        overallProgress: 0,
      };
      return {
        ...old,
        executionProgress: { ...existing, overallProgress: progress, message: phase },
      };
    });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  // Task completed on another device → invalidate lists, detail, and show toast
  const addToast = useToastStore((s) => s.addToast);
  useHubEvent('event:hub.tasks.completed', ({ taskId, projectId, result: _result }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    addToast(`Task ${taskId} completed`, 'success');
  });
}
