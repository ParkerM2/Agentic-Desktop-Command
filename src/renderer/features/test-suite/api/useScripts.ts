/**
 * React Query hooks for QA script queries
 */

import { useQuery } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';
import type { QaScriptSchema } from '@shared/ipc/test-suite/schemas';


import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './queryKeys';

import type { z } from 'zod';

export type QaScript = z.infer<typeof QaScriptSchema>;

/** Fetch all saved QA scripts */
export function useScripts() {
  return useQuery({
    queryKey: testSuiteKeys.scripts(),
    queryFn: () => ipc(TEST_SUITE.LIST.SCRIPTS, {}),
    staleTime: 30_000,
  });
}

/** Fetch a single QA script by id */
export function useScript(id: string | null) {
  return useQuery({
    queryKey: testSuiteKeys.script(id ?? ''),
    queryFn: () => ipc(TEST_SUITE.GET.SCRIPT, { id: id ?? '' }),
    enabled: id !== null && id.length > 0,
    staleTime: 30_000,
  });
}
