import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';
import type { TestSuiteStep } from '@shared/types/test-suite';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useSharedSteps(projectId: string | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.sharedSteps(projectId ?? ''),
    queryFn: () => ipc(TEST_SUITE['SHARED-STEPS'].LIST, { projectId: projectId ?? '' }),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useSharedStepDomains(projectId: string | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.sharedStepDomains(projectId ?? ''),
    queryFn: () => ipc(TEST_SUITE['SHARED-STEPS'].DOMAINS, { projectId: projectId ?? '' }),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateSharedSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      projectId: string;
      name: string;
      domain: string;
      description?: string;
      steps: TestSuiteStep[];
    }) => ipc(TEST_SUITE['SHARED-STEPS'].CREATE, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: testSuiteKeys.sharedSteps(variables.projectId) });
      void qc.invalidateQueries({ queryKey: testSuiteKeys.sharedStepDomains(variables.projectId) });
    },
  });
}

export function useUpdateSharedSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      domain?: string;
      description?: string;
      steps?: TestSuiteStep[];
    }) => ipc(TEST_SUITE['SHARED-STEPS'].UPDATE, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...testSuiteKeys.all, 'shared-steps'] });
    },
  });
}

export function useDeleteSharedSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(TEST_SUITE['SHARED-STEPS'].DELETE, { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...testSuiteKeys.all, 'shared-steps'] });
    },
  });
}
