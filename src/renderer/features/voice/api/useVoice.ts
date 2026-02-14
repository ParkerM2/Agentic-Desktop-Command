/**
 * React Query hooks for voice configuration
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { VoiceConfig, VoiceInputMode } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { voiceKeys } from './queryKeys';

/** Fetch voice configuration */
export function useVoiceConfig() {
  return useQuery({
    queryKey: voiceKeys.config(),
    queryFn: () => ipc('voice.getConfig', {}),
    staleTime: 60_000,
  });
}

/** Update voice configuration */
export function useUpdateVoiceConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { enabled?: boolean; language?: string; inputMode?: VoiceInputMode }) =>
      ipc('voice.updateConfig', updates),
    onSuccess: (data) => {
      queryClient.setQueryData<VoiceConfig>(voiceKeys.config(), data);
    },
  });
}

/** Check microphone permission status */
export function useVoicePermission() {
  return useQuery({
    queryKey: voiceKeys.permission(),
    queryFn: () => ipc('voice.checkPermission', {}),
    staleTime: 30_000,
  });
}
