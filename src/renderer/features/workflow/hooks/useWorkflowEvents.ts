/**
 * Workflow IPC event listeners → store updates
 *
 * Bridges real-time task progress events from the main process
 * to the workflow UI store.
 */

import { useQueryClient } from '@tanstack/react-query';

import { TASKS_EVENTS } from '@shared/ipc/tasks/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { taskKeys } from '@features/tasks/api/queryKeys';

/** Subscribe to workflow-related IPC events and update caches */
export function useWorkflowEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(TASKS_EVENTS.PROGRESS.UPDATED, ({ taskId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });
}
