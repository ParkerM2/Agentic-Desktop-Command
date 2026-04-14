/**
 * Email React Query hooks
 *
 * Queries and mutations for SMTP config, queue management, and email sending.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { EMAIL } from '@shared/ipc/email/channels';
import type { EmailSchema, SmtpConfigSchema } from '@shared/ipc/email/schemas';

import { ipc } from '@renderer/shared/lib/ipc';

import { integrationsKeys } from './queryKeys';

import type { z } from 'zod';

// ── Queries ───────────────────────────────────────────────────

/** Fetch current SMTP configuration */
export function useEmailConfig() {
  return useQuery({
    queryKey: integrationsKeys.emailConfig(),
    queryFn: () => ipc(EMAIL.GET.CONFIG, {}),
    staleTime: 60_000,
  });
}

/** Fetch the email send queue */
export function useEmailQueue() {
  return useQuery({
    queryKey: integrationsKeys.emailQueue(),
    queryFn: () => ipc(EMAIL.GET.QUEUE, {}),
    staleTime: 15_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────

/** Update SMTP configuration */
export function useUpdateEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: z.infer<typeof SmtpConfigSchema>) =>
      ipc(EMAIL.UPDATE.CONFIG, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.emailConfig(),
      });
    },
  });
}

/** Test the current SMTP connection — returns result, no invalidation */
export function useTestEmailConnection() {
  return useMutation({
    mutationFn: () => ipc(EMAIL.TEST.CONNECTION, {}),
  });
}

/** Send a test email message */
export function useSendTestEmail() {
  return useMutation({
    mutationFn: (input: z.infer<typeof EmailSchema>) =>
      ipc(EMAIL.SEND.MESSAGE, input),
  });
}

/** Retry a queued email by ID */
export function useRetryEmailQueued() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { emailId: string }) =>
      ipc(EMAIL.RETRY.QUEUED, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.emailQueue(),
      });
    },
  });
}

/** Remove a queued email by ID */
export function useRemoveEmailQueued() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { emailId: string }) =>
      ipc(EMAIL.REMOVE.QUEUED, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.emailQueue(),
      });
    },
  });
}
