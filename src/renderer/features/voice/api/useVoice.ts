/**
 * React Query hooks for voice configuration
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { VOICE } from '@shared/ipc/misc/voice.channels';
import type { VoiceConfig, VoiceInputMode } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { voiceKeys } from './queryKeys';

/** Fetch voice configuration */
export function useVoiceConfig() {
  return useQuery({
    queryKey: voiceKeys.config(),
    queryFn: () => ipc(VOICE.GET.CONFIG, {}),
    staleTime: 60_000,
  });
}

/** Update voice configuration */
export function useUpdateVoiceConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { enabled?: boolean; language?: string; inputMode?: VoiceInputMode }) =>
      ipc(VOICE.UPDATE.CONFIG, updates),
    onSuccess: (data) => {
      queryClient.setQueryData<VoiceConfig>(voiceKeys.config(), data);
    },
  });
}

/** Check microphone permission status */
export function useVoicePermission() {
  return useQuery({
    queryKey: voiceKeys.permission(),
    queryFn: () => ipc(VOICE.CHECK.PERMISSION, {}),
    staleTime: 30_000,
  });
}
