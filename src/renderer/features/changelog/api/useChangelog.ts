/**
 * React Query hooks for changelog
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { changelogKeys } from './queryKeys';

/** Fetch all changelog entries */
export function useChangelog() {
  return useQuery({
    queryKey: changelogKeys.list(),
    queryFn: () => ipc('changelog.list', {}),
  });
}

/** Generate changelog entry from git history */
export function useGenerateChangelog() {
  return useMutation({
    mutationFn: (params: { repoPath: string; version: string; fromTag?: string }) =>
      ipc('changelog.generate', params),
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
    }) =>
      ipc('changelog.addEntry', params as Parameters<typeof ipc<'changelog.addEntry'>>[1]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: changelogKeys.list() });
    },
  });
}
