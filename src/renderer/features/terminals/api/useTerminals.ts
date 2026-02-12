/**
 * React Query hooks for terminal operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { terminalKeys } from './queryKeys';

/** Fetch terminal sessions */
export function useTerminals(projectPath?: string) {
  return useQuery({
    queryKey: terminalKeys.list(projectPath),
    queryFn: () => ipc('terminals.list', { projectPath }),
    staleTime: 10_000,
  });
}

/** Create a new terminal session */
export function useCreateTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cwd, projectPath }: { cwd: string; projectPath?: string }) =>
      ipc('terminals.create', { cwd, projectPath }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: terminalKeys.lists() });
    },
  });
}

/** Close a terminal session */
export function useCloseTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => ipc('terminals.close', { sessionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: terminalKeys.lists() });
    },
  });
}

/** Send input to a terminal */
export function useSendTerminalInput() {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: string }) =>
      ipc('terminals.sendInput', { sessionId, data }),
  });
}

/** Resize a terminal */
export function useResizeTerminal() {
  return useMutation({
    mutationFn: ({ sessionId, cols, rows }: { sessionId: string; cols: number; rows: number }) =>
      ipc('terminals.resize', { sessionId, cols, rows }),
  });
}
