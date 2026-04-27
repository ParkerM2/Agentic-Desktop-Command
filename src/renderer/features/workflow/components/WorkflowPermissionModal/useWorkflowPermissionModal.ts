import { useCallback, useState } from 'react';

import { WORKFLOW_EVENTS } from '@shared/ipc/workflow/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

export interface PermissionRequest {
  id: string;
  ticket: string;
  agent: string;
  message: string;
}

export function useWorkflowPermissionModal() {
  const [queue, setQueue] = useState<PermissionRequest[]>([]);

  useIpcEvent(WORKFLOW_EVENTS.WORKFLOW.PERMISSION, (payload) => {
    const request: PermissionRequest = {
      id: `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ticket: payload.ticket,
      agent: payload.agent,
      message: payload.message,
    };
    setQueue((prev) => [...prev, request]);
  });

  const handleDismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const handlePointerDownOutside = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  const handleEscapeKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
  }, []);

  return {
    queue,
    handleDismiss,
    handlePointerDownOutside,
    handleEscapeKeyDown,
  };
}
