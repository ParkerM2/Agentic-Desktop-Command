/**
 * useSessionThinking — Track whether a specific agent session is "thinking"
 *
 * Listens to agent-dashboard statusChanged events and returns true when
 * the session status is 'running' (Claude is processing).
 */

import { useCallback, useState } from 'react';

import { useIpcEvent } from '@renderer/shared/hooks';

export function useSessionThinking(sessionId: string | null): boolean {
  const [isThinking, setIsThinking] = useState(false);

  useIpcEvent(
    'event:agent-dashboard.statusChanged',
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
