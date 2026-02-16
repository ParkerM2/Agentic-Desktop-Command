/**
 * Agent orchestrator IPC event listeners → query invalidation
 *
 * Bridges real-time agent events from the main process to React Query cache.
 * Progress and heartbeat use optimistic cache updates (no refetch).
 * Status transitions (planReady, stopped, error) trigger full invalidation.
 */

import { useQueryClient } from '@tanstack/react-query';

import type { Task } from '@shared/types';

import { useIpcEvent } from '@renderer/shared/hooks';

import { taskKeys } from '../api/queryKeys';

export function useAgentEvents() {
  const queryClient = useQueryClient();

  // Agent progress → optimistic update on task detail cache
  useIpcEvent('event:agent.orchestrator.progress', (data) => {
    queryClient.setQueryData<Task>(taskKeys.detail(data.taskId), (old) =>
      old
        ? {
            ...old,
            metadata: {
              ...old.metadata,
              agentProgress: { type: data.type, data: data.data, timestamp: data.timestamp },
            },
          }
        : old,
    );
  });

  // Agent heartbeat → update last activity timestamp in cache
  useIpcEvent('event:agent.orchestrator.heartbeat', (data) => {
    queryClient.setQueryData<Task>(taskKeys.detail(data.taskId), (old) =>
      old
        ? {
            ...old,
            metadata: { ...old.metadata, lastAgentActivity: data.timestamp },
          }
        : old,
    );
  });

  // Plan ready → full invalidation to get new status from server
  useIpcEvent('event:agent.orchestrator.planReady', (data) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.taskId) });
  });

  // Agent stopped → full invalidation
  useIpcEvent('event:agent.orchestrator.stopped', (_data) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  // Agent error → full invalidation
  useIpcEvent('event:agent.orchestrator.error', (_data) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  // Watchdog alert → invalidate to show alert state on task row
  useIpcEvent('event:agent.orchestrator.watchdogAlert', (data) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.taskId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });
}
