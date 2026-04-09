/**
 * React Query hooks for changelog
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CHANGELOG } from '@shared/ipc/misc/changelog.channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { changelogKeys } from './queryKeys';

/** Fetch all changelog entries */
export function useChangelog() {
  return useQuery({
    queryKey: changelogKeys.list(),
    queryFn: () => ipc(CHANGELOG.LIST.ENTRIES, {}),
  });
}

/** Generate changelog entry from git history */
export function useGenerateChangelog() {
  return useMutation({
    mutationFn: (params: { repoPath: string; version: string; fromTag?: string }) =>
      ipc(CHANGELOG.GENERATE.ENTRY, params),
  });
}

/** Add a changelog entry */
export function useAddChangelogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      version: string;
      date: string;
      categories: Array<{ type: string; items: string[] }>;
    }) => ipc(CHANGELOG.ADD.ENTRY, params as Parameters<typeof ipc<typeof CHANGELOG.ADD.ENTRY>>[1]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: changelogKeys.list() });
    },
  });
}
