/**
 * useIpcEvent — Subscribe to typed IPC events from the main process.
 *
 * Replaces the 415-line useIpc.ts from the old codebase.
 * Each feature registers its own listeners using this hook.
 *
 * @example
 * useIpcEvent('event:task.statusChanged', ({ taskId, status }) => {
 *   queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
 * });
 */

import { useEffect, useRef } from 'react';

import type { EventChannel, EventPayload } from '@shared/ipc-contract';

export function useIpcEvent<T extends EventChannel>(
  channel: T,
  handler: (payload: EventPayload<T>) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = window.api.on(channel, (payload) => {
      handlerRef.current(payload);
    });
    return unsubscribe;
  }, [channel]);
}
