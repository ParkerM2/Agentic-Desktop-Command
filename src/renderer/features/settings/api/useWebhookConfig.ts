/**
 * React Query hooks for webhook configuration
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { settingsKeys } from './useSettings';

/** Fetch webhook configuration */
export function useWebhookConfig() {
  return useQuery({
    queryKey: settingsKeys.webhookConfig(),
    queryFn: () => ipc('settings.getWebhookConfig', {}),
    staleTime: 60_000,
  });
}

/** Update webhook configuration */
export function useUpdateWebhookConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      slack?: { botToken?: string; signingSecret?: string };
      github?: { webhookSecret?: string };
    }) => ipc('settings.updateWebhookConfig', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: settingsKeys.webhookConfig(),
      });
    },
  });
}
