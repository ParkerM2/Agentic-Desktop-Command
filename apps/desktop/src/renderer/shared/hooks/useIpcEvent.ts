/**
 * useIpcEvent — Subscribe to typed IPC events from main process
 *
 * Replaces the 415-line useIpc.ts hook from Auto Claude.
 * Each feature registers its own event listeners using this hook.
 *
 * Usage:
 *   useIpcEvent('tasks.onStatusChanged', ({ taskId, status }) => {
 *     queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
 *   });
 */
import { useEffect, useRef } from 'react';
import type { EventChannel, EventData } from '@shared/ipc-contract';

export function useIpcEvent<T extends EventChannel>(
  channel: T,
  handler: (data: EventData<T>) => void,
) {
  // Use ref so the effect doesn't re-run when handler changes
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = window.api.on(channel, (data) => {
      handlerRef.current(data);
    });
    return unsubscribe;
  }, [channel]);
}
