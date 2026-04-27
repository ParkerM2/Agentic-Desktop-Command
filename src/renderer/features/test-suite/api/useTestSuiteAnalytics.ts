import { useQuery } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useAnalyticsSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.analytics.summary(projectId ?? ''),
    queryFn: () => ipc(TEST_SUITE.ANALYTICS.SUMMARY, { projectId: projectId ?? '' }),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useAnalyticsTrend(projectId: string | undefined, days = 30) {
  return useQuery({
    queryKey: testSuiteKeys.analytics.trend(projectId ?? ''),
    queryFn: () => ipc(TEST_SUITE.ANALYTICS.TREND, { projectId: projectId ?? '', days }),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useTopFailures(projectId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: testSuiteKeys.analytics.topFailures(projectId ?? ''),
    queryFn: () => ipc(TEST_SUITE.ANALYTICS['TOP-FAILURES'], { projectId: projectId ?? '', limit }),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useSlowestTests(projectId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: testSuiteKeys.analytics.slowest(projectId ?? ''),
    queryFn: () => ipc(TEST_SUITE.ANALYTICS.SLOWEST, { projectId: projectId ?? '', limit }),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useErrorPatterns(projectId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: testSuiteKeys.analytics.errorPatterns(projectId ?? ''),
    queryFn: () => ipc(TEST_SUITE.ANALYTICS['ERROR-PATTERNS'], { projectId: projectId ?? '', limit }),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useFlakyTests(projectId: string | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.analytics.flaky(projectId ?? ''),
    queryFn: () => ipc(TEST_SUITE.ANALYTICS.FLAKY, { projectId: projectId ?? '' }),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useRunHistory(scriptId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: testSuiteKeys.analytics.runHistory(scriptId ?? ''),
    queryFn: () => ipc(TEST_SUITE.ANALYTICS['RUN-HISTORY'], { scriptId: scriptId ?? '', limit }),
    enabled: !!scriptId,
    staleTime: 10_000,
  });
}
