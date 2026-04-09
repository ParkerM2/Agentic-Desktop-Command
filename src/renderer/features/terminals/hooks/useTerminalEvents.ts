/**
 * Terminal IPC event listeners
 */

import { useQueryClient } from '@tanstack/react-query';

import { TERMINALS_EVENTS } from '@shared/ipc/terminals/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { terminalKeys } from '../api/queryKeys';
import { useTerminalUI } from '../store';

export function useTerminalEvents() {
  const queryClient = useQueryClient();
  const { appendOutput } = useTerminalUI();

  useIpcEvent(TERMINALS_EVENTS.TERMINAL.OUTPUT, ({ sessionId, data }) => {
    appendOutput(sessionId, data);
  });

  useIpcEvent(TERMINALS_EVENTS.TERMINAL.CLOSED, ({ sessionId: _sessionId }) => {
    void queryClient.invalidateQueries({ queryKey: terminalKeys.lists() });
  });

  useIpcEvent(TERMINALS_EVENTS.TERMINAL['TITLE-CHANGED'], ({ sessionId: _sessionId, title: _title }) => {
    // Could update a cache, or just invalidate
    void queryClient.invalidateQueries({ queryKey: terminalKeys.lists() });
  });
}
