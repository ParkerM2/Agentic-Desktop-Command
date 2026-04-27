import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useSchedules(projectId: string | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.schedules(projectId ?? ''),
    queryFn: () => ipc(TEST_SUITE.SCHEDULE.LIST, { projectId: projectId ?? '' }),
    enabled: !!projectId,
    staleTime: 10_000,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { scriptId: string; projectId: string; intervalMs: number }) =>
      ipc(TEST_SUITE.SCHEDULE.CREATE, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: testSuiteKeys.schedules(variables.projectId) });
    },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; intervalMs?: number; enabled?: boolean }) =>
      ipc(TEST_SUITE.SCHEDULE.UPDATE, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...testSuiteKeys.all, 'schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(TEST_SUITE.SCHEDULE.DELETE, { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...testSuiteKeys.all, 'schedules'] });
    },
  });
}

export function useTriggerScheduleNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(TEST_SUITE.SCHEDULE['TRIGGER-NOW'], { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...testSuiteKeys.all, 'schedules'] });
    },
  });
}
