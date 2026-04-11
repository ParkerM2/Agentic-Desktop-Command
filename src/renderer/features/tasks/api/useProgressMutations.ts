/**
 * Progress mutation hooks — local progress pipeline
 *
 * Replaces the IPC action methods from progress-context-store.ts
 * with React Query mutations. Each mutation invalidates the
 * appropriate query keys on settlement.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PROGRESS } from '@shared/ipc/progress/channels';
import type { ProgressPriority, ProgressStatus } from '@shared/types/progress';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { progressKeys } from './progressKeys';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^a-z0-9-]/g, '')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

interface CreateProgressTaskInput {
  title: string;
  description: string;
  priority?: ProgressPriority;
  slug?: string;
  id?: string;
}

/** Create a new progress task */
export function useCreateProgressTask() {
  const queryClient = useQueryClient();
  const { onError: toastOnError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (data: CreateProgressTaskInput) => {
      const id = data.id ?? crypto.randomUUID();
      const slug = data.slug ?? slugify(data.title);
      return ipc(PROGRESS.CREATE.TASK, { ...data, id, slug });
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
    },
    onError(err) {
      toastOnError('create progress task')(err);
    },
  });
}

/** Update a progress task's frontmatter fields */
export function useUpdateProgressTask() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: {
      slug: string;
      updates: {
        title?: string;
        description?: string;
        status?: ProgressStatus;
        priority?: ProgressPriority;
        jiraTicket?: string;
        jiraUrl?: string;
        prNumber?: number;
        prUrl?: string;
        prStatus?: string;
        workflow?: string;
        workflowPhase?: string;
        lastSessionId?: string;
        lastAgentName?: string;
        completedAt?: string;
        archivedAt?: string;
        teamName?: string;
      };
    }) => ipc(PROGRESS.UPDATE.TASK, data),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: progressKeys.detail(variables.slug),
      });
    },
    onError: onError('update progress task'),
  });
}

/** Archive a progress task (move to progress/archived/) */
export function useArchiveProgressTask() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: { slug: string }) => ipc(PROGRESS.ARCHIVE.TASK, data),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
      void queryClient.invalidateQueries({ queryKey: progressKeys.archived() });
    },
    onError: onError('archive progress task'),
  });
}

/** Delete a progress task entirely */
export function useDeleteProgressTask() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: { slug: string }) => ipc(PROGRESS.DELETE.TASK, data),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
    },
    onError: onError('delete progress task'),
  });
}

/** Start a research agent session for a task */
export function useStartResearch() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: { slug: string; prompt?: string }) =>
      ipc(PROGRESS.START.RESEARCH, data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
    },
    onError: onError('start research'),
  });
}

/** Spawn a planning agent session for a task */
export function useCreatePlan() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: { slug: string; prompt?: string }) =>
      ipc(PROGRESS.CREATE.PLAN, data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
    },
    onError: onError('create plan'),
  });
}

/** Spin up a team-lead to decompose a plan into subtasks */
export function useSpinUpTeam() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: { slug: string; prompt?: string }) =>
      ipc(PROGRESS.START.TEAM, data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
    },
    onError: onError('spin up team'),
  });
}

/** Run the full Research -> Plan -> Team pipeline */
export function useRunWorkflow() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: { slug: string; templateId?: string }) =>
      ipc(PROGRESS.START.WORKFLOW, data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
    },
    onError: onError('run workflow'),
  });
}

/** Cancel an active agent session for a task */
export function useCancelAction() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: { slug: string }) => ipc(PROGRESS.CANCEL.ACTION, data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
      void queryClient.invalidateQueries({ queryKey: progressKeys.sessions() });
    },
    onError: onError('cancel action'),
  });
}
