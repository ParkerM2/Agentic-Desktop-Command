/**
 * React Query hooks for briefing
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BRIEFING } from '@shared/ipc/briefing/channels';
import type { BriefingConfig } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { briefingKeys } from './queryKeys';

/** Fetch current daily briefing */
export function useDailyBriefing() {
  return useQuery({
    queryKey: briefingKeys.daily(),
    queryFn: () => ipc(BRIEFING.GET.DAILY, {}),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Generate a new daily briefing */
export function useGenerateBriefing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ipc(BRIEFING.GENERATE.DAILY, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: briefingKeys.daily() });
    },
  });
}

/** Fetch briefing configuration */
export function useBriefingConfig() {
  return useQuery({
    queryKey: briefingKeys.config(),
    queryFn: () => ipc(BRIEFING.GET.CONFIG, {}),
  });
}

/** Update briefing configuration */
export function useUpdateBriefingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<BriefingConfig>) => ipc(BRIEFING.UPDATE.CONFIG, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: briefingKeys.config() });
    },
  });
}

/** Fetch proactive suggestions */
export function useSuggestions() {
  return useQuery({
    queryKey: briefingKeys.suggestions(),
    queryFn: () => ipc(BRIEFING.GET.SUGGESTIONS, {}),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
