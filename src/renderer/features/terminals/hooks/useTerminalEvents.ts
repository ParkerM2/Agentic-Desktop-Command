/**
 * Terminal IPC event listeners
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';

import { terminalKeys } from '../api/queryKeys';
import { useTerminalUI } from '../store';

export function useTerminalEvents() {
  const queryClient = useQueryClient();
  const { appendOutput } = useTerminalUI();

  useIpcEvent('event:terminal.output', ({ sessionId, data }) => {
    appendOutput(sessionId, data);
  });

  useIpcEvent('event:terminal.closed', ({ sessionId: _sessionId }) => {
    void queryClient.invalidateQueries({ queryKey: terminalKeys.lists() });
  });

  useIpcEvent('event:terminal.titleChanged', ({ sessionId: _sessionId, title: _title }) => {
    // Could update a cache, or just invalidate
    void queryClient.invalidateQueries({ queryKey: terminalKeys.lists() });
  });
}
