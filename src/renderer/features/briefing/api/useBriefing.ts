/**
 * React Query hooks for briefing
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BriefingConfig } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { briefingKeys } from './queryKeys';

/** Fetch current daily briefing */
export function useDailyBriefing() {
  return useQuery({
    queryKey: briefingKeys.daily(),
    queryFn: () => ipc('briefing.getDaily', {}),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Generate a new daily briefing */
export function useGenerateBriefing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ipc('briefing.generate', {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: briefingKeys.daily() });
    },
  });
}

/** Fetch briefing configuration */
export function useBriefingConfig() {
  return useQuery({
    queryKey: briefingKeys.config(),
    queryFn: () => ipc('briefing.getConfig', {}),
  });
}

/** Update briefing configuration */
export function useUpdateBriefingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<BriefingConfig>) =>
      ipc('briefing.updateConfig', updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: briefingKeys.config() });
    },
  });
}

/** Fetch proactive suggestions */
export function useSuggestions() {
  return useQuery({
    queryKey: briefingKeys.suggestions(),
    queryFn: () => ipc('briefing.getSuggestions', {}),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
