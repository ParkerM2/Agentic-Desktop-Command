/**
 * useSessionThinking — Track whether a specific agent session is "thinking"
 *
 * Listens to agent-dashboard statusChanged events and returns true when
 * the session status is 'running' (Claude is processing).
 */

import { useCallback, useState } from 'react';

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

export function useSessionThinking(sessionId: string | null): boolean {
  const [isThinking, setIsThinking] = useState(false);

  useIpcEvent(
    AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED'],
    useCallback(
      (payload: { sessionId: string; newStatus: string }) => {
        if (payload.sessionId !== sessionId) return;
        setIsThinking(payload.newStatus === 'running');
      },
      [sessionId],
    ),
  );

  return isThinking;
}
