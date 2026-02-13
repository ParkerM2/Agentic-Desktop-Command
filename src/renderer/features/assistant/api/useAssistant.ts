/**
 * React Query hooks for the assistant feature
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';

import { ipc } from '@renderer/shared/lib/ipc';
import { useLayoutStore } from '@renderer/shared/stores';

import { useProjects } from '@features/projects';

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

/** Send a command to the assistant with full context */
export function useSendCommand() {
  const queryClient = useQueryClient();
  const { setIsThinking, setCurrentResponse, clearCurrentResponse, addResponseEntry } =
    useAssistantStore();
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return useMutation({
    mutationFn: (data: { input: string }) => {
      const activeProject = projects?.find((p) => p.id === activeProjectId);

      return ipc('assistant.sendCommand', {
        input: data.input,
        context: {
          activeProjectId: activeProjectId ?? null,
          activeProjectName: activeProject?.name ?? null,
          currentPage: pathname,
          todayDate: new Date().toISOString().slice(0, 10),
        },
      });
    },
    onMutate: () => {
      setIsThinking(true);
      clearCurrentResponse();
    },
    onSuccess: (data, variables) => {
      setCurrentResponse(data.content);
      addResponseEntry({
        input: variables.input,
        response: data.content,
        type: data.type,
        intent: data.intent,
      });
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
