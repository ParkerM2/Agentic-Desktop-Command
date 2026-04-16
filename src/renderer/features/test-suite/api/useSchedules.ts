import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

const TEST_SUITE_KEY = 'test-suite';
const SCHEDULES_KEY = 'schedules';

const scheduleKeys = {
  all: (projectId: string) => [TEST_SUITE_KEY, SCHEDULES_KEY, projectId] as const,
};

export function useSchedules(projectId: string | undefined) {
  return useQuery({
    queryKey: scheduleKeys.all(projectId ?? ''),
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
      void qc.invalidateQueries({ queryKey: scheduleKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; intervalMs?: number; enabled?: boolean }) =>
      ipc(TEST_SUITE.SCHEDULE.UPDATE, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TEST_SUITE_KEY, SCHEDULES_KEY] });
    },
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(TEST_SUITE.SCHEDULE.DELETE, { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TEST_SUITE_KEY, SCHEDULES_KEY] });
    },
  });
}

export function useTriggerScheduleNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(TEST_SUITE.SCHEDULE['TRIGGER-NOW'], { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TEST_SUITE_KEY, SCHEDULES_KEY] });
    },
  });
}
