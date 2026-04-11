/**
 * Progress mutation hooks — local progress pipeline
 *
 * Replaces the IPC action methods from progress-context-store.ts
 * with React Query mutations. Each mutation invalidates the
 * appropriate query keys on settlement.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PROGRESS } from '@shared/ipc/progress/channels';
import type { ProgressPriority, ProgressStatus, ProgressTask } from '@shared/types/progress';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';
import { optimisticCreate } from '@renderer/shared/lib/optimistic';

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

  const optimistic = optimisticCreate<CreateProgressTaskInput, ProgressTask>(
    queryClient,
    progressKeys.list(),
    (input) => {
      const now = new Date().toISOString();
      const id = input.id ?? crypto.randomUUID();
      const slug = input.slug ?? slugify(input.title);
      return {
        id,
        slug,
        rootFile: '',
        title: input.title,
        description: input.description,
        status: 'backlog',
        priority: input.priority ?? 'normal',
        createdAt: now,
        updatedAt: now,
        hasResearch: false,
        hasPlan: false,
        hasTeamTasks: false,
        teamTaskCount: 0,
      };
    },
  );

  return useMutation({
    mutationFn: (data: CreateProgressTaskInput) => {
      const id = data.id ?? crypto.randomUUID();
      const slug = data.slug ?? slugify(data.title);
      return ipc(PROGRESS.CREATE.TASK, { ...data, id, slug });
    },
    ...optimistic,
    onError: (...args: Parameters<NonNullable<typeof optimistic.onError>>) => {
      optimistic.onError(...args);
      toastOnError('create progress task')(args[0]);
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
    async onMutate(input: { slug: string }) {
      await queryClient.cancelQueries({ queryKey: progressKeys.list() });
      const previous = queryClient.getQueryData<ProgressTask[]>(progressKeys.list());
      queryClient.setQueryData<ProgressTask[]>(progressKeys.list(), (old = []) =>
        old.filter((task) => task.slug !== input.slug),
      );
      return { previous };
    },
    onError: (err: unknown, _input: { slug: string }, context: { previous?: ProgressTask[] } | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData<ProgressTask[]>(progressKeys.list(), context.previous);
      }
      onError('archive progress task')(err);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
      void queryClient.invalidateQueries({ queryKey: progressKeys.archived() });
    },
  });
}

/** Delete a progress task entirely */
export function useDeleteProgressTask() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: { slug: string }) => ipc(PROGRESS.DELETE.TASK, data),
    async onMutate(input: { slug: string }) {
      await queryClient.cancelQueries({ queryKey: progressKeys.list() });
      const previous = queryClient.getQueryData<ProgressTask[]>(progressKeys.list());
      queryClient.setQueryData<ProgressTask[]>(progressKeys.list(), (old = []) =>
        old.filter((task) => task.slug !== input.slug),
      );
      return { previous };
    },
    onError: (err: unknown, _input: { slug: string }, context: { previous?: ProgressTask[] } | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData<ProgressTask[]>(progressKeys.list(), context.previous);
      }
      onError('delete progress task')(err);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
    },
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
