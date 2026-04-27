/**
 * React Query hooks for the assistant feature
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ASSISTANT } from '@shared/ipc/assistant/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useAssistantStore } from '../store';

import { assistantKeys } from './queryKeys';

/** Fetch command history */
export function useHistory(limit?: number) {
  return useQuery({
    queryKey: assistantKeys.history(limit),
    queryFn: () => ipc(ASSISTANT.GET.HISTORY, { limit }),
    staleTime: 30_000,
  });
}

/** Send a command to the assistant */
export function useSendCommand() {
  const queryClient = useQueryClient();
  const { setIsThinking, clearCurrentResponse, addUserEntry } = useAssistantStore();

  return useMutation({
    mutationFn: (data: {
      input: string;
      context?: { activeView?: string; activeProjectId?: string };
    }) => {
      return ipc(ASSISTANT.SEND.COMMAND, {
        input: data.input,
        context: data.context,
      });
    },
    onMutate: (variables) => {
      addUserEntry(variables.input);
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
    mutationFn: () => ipc(ASSISTANT.CLEAR.HISTORY, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
    },
  });
}
