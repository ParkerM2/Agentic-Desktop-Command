/**
 * React Query hooks for the assistant feature
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { setLastCommand } from '../hooks/useAssistantEvents';
import { useAssistantStore } from '../store';

import { assistantKeys } from './queryKeys';

/** Fetch command history */
export function useHistory(limit?: number) {
  return useQuery({
    queryKey: assistantKeys.history(limit),
    queryFn: () => ipc('assistant.getHistory', { limit }),
    staleTime: 30_000,
  });
}

/** Send a command to the assistant */
export function useSendCommand() {
  const queryClient = useQueryClient();
  const { setIsThinking, clearCurrentResponse } = useAssistantStore();

  return useMutation({
    mutationFn: (data: {
      input: string;
      context?: { activeView?: string; activeProjectId?: string };
    }) => {
      return ipc('assistant.sendCommand', {
        input: data.input,
        context: data.context,
      });
    },
    onMutate: (variables) => {
      setLastCommand(variables.input);
      setIsThinking(true);
      clearCurrentResponse();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
    },
    onSettled: () => {
      setIsThinking(false);
    },
  });
}

/** Clear assistant command history */
export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ipc('assistant.clearHistory', {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
    },
  });
}
