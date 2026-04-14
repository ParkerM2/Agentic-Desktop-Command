/**
 * Agent mutation hooks — wired to command bus IPC
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BUS } from '@shared/ipc/bus/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { busKeys } from '../../bus/api/queryKeys';

/** Start planning for a task */
export function useStartPlanning() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: {
      taskId: string;
      projectId?: string;
      projectPath: string;
      taskDescription: string;
      subProjectPath?: string;
    }) =>
      ipc(BUS.SPAWN.SESSION, {
        name: `planning-${input.taskId}`,
        type: 'team-lead',
        phase: 'planning',
        taskSlug: input.taskId,
        projectId: input.projectId,
        projectPath: input.projectPath,
        prompt: input.taskDescription,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('start planning'),
  });
}

/** Start execution for a task */
export function useStartExecution() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: {
      taskId: string;
      projectId?: string;
      projectPath: string;
      taskDescription: string;
      planRef?: string;
      subProjectPath?: string;
    }) =>
      ipc(BUS.SPAWN.SESSION, {
        name: `execution-${input.taskId}`,
        type: 'team-lead',
        phase: 'executing',
        taskSlug: input.taskId,
        projectId: input.projectId,
        projectPath: input.projectPath,
        prompt: input.planRef
          ? `${input.taskDescription}\n\nPlan: ${input.planRef}`
          : input.taskDescription,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('start execution'),
  });
}

/** Re-plan a task with user feedback */
export function useReplanWithFeedback() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: {
      taskId: string;
      projectId?: string;
      projectPath: string;
      taskDescription: string;
      feedback: string;
      previousPlanPath?: string;
      subProjectPath?: string;
    }) =>
      ipc(BUS.SPAWN.SESSION, {
        name: `replan-${input.taskId}`,
        type: 'team-lead',
        phase: 'planning',
        taskSlug: input.taskId,
        projectId: input.projectId,
        projectPath: input.projectPath,
        prompt: [
          input.taskDescription,
          input.previousPlanPath ? `Previous plan: ${input.previousPlanPath}` : null,
          `Feedback: ${input.feedback}`,
        ].filter(Boolean).join('\n\n'),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('re-plan with feedback'),
  });
}

/** Kill an active agent session */
export function useKillAgent() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: { sessionId: string }) =>
      ipc(BUS.KILL.SESSION, { sessionId: input.sessionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('kill agent'),
  });
}

/** Restart an agent from its last checkpoint */
export function useRestartFromCheckpoint() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: async (input: { taskId: string; projectPath: string }) => {
      // Find any active session for this task
      const sessions = await ipc(BUS.LIST.SESSIONS, { taskSlug: input.taskId });
      const active = sessions.find((s) => s.status === 'active');
      if (active) {
        await ipc(BUS.KILL.SESSION, { sessionId: active.id });
      }
      // Spawn a fresh session
      return await ipc(BUS.SPAWN.SESSION, {
        name: `restart-${input.taskId}`,
        type: 'team-lead',
        phase: 'executing',
        taskSlug: input.taskId,
        projectPath: input.projectPath,
        prompt: 'Resume from last checkpoint.',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('restart from checkpoint'),
  });
}
