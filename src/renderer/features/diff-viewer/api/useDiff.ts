/**
 * React Query hooks for diff viewer operations
 *
 * Uses the existing merge IPC channels to fetch diff data between branches.
 * Returns parsed diff data compatible with @git-diff-view/react.
 */

import { useQuery } from '@tanstack/react-query';

import { MERGE } from '@shared/ipc/misc/merge.channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { diffKeys } from './queryKeys';

/** File change status derived from diff stats */
type FileChangeStatus = 'added' | 'modified' | 'deleted';

/** A single file entry in the diff summary */
interface DiffFileEntry {
  filePath: string;
  status: FileChangeStatus;
  insertions: number;
  deletions: number;
  binary: boolean;
}

/** Summary of all file changes between branches */
interface DiffSummary {
  files: DiffFileEntry[];
  totalInsertions: number;
  totalDeletions: number;
  changedFileCount: number;
}

/**
 * Infer file change status from insertions/deletions counts.
 * A file with only insertions and no deletions is likely newly added;
 * a file with only deletions and no insertions is likely deleted.
 */
function inferStatus(insertions: number, deletions: number): FileChangeStatus {
  if (insertions > 0 && deletions === 0) return 'added';
  if (insertions === 0 && deletions > 0) return 'deleted';
  return 'modified';
}

/**
 * Fetch the diff summary (file list with stats) between two branches.
 *
 * @param repoPath - Path to the git repository
 * @param sourceBranch - The branch with changes (head)
 * @param targetBranch - The base branch to compare against
 */
export function useDiffSummary(
  repoPath: string | null,
  sourceBranch: string | null,
  targetBranch: string | null,
) {
  const enabled = repoPath !== null && sourceBranch !== null && targetBranch !== null;

  return useQuery({
    queryKey: diffKeys.summary(repoPath ?? '', `${sourceBranch ?? ''}...${targetBranch ?? ''}`),
    queryFn: async (): Promise<DiffSummary> => {
      const result = await ipc(MERGE.PREVIEW.DIFF, {
        repoPath: repoPath ?? '',
        sourceBranch: sourceBranch ?? '',
        targetBranch: targetBranch ?? '',
      });

      const files: DiffFileEntry[] = result.files.map((f) => ({
        filePath: f.file,
        status: inferStatus(f.insertions, f.deletions),
        insertions: f.insertions,
        deletions: f.deletions,
        binary: f.binary,
      }));

      return {
        files,
        totalInsertions: result.insertions,
        totalDeletions: result.deletions,
        changedFileCount: result.changedFiles,
      };
    },
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Fetch the raw diff text for a single file between two branches.
 *
 * @param repoPath - Path to the git repository
 * @param sourceBranch - The branch with changes
 * @param targetBranch - The base branch to compare against
 * @param filePath - The file to get the diff for
 */
export function useFileDiffContent(
  repoPath: string | null,
  sourceBranch: string | null,
  targetBranch: string | null,
  filePath: string | null,
) {
  const enabled =
    repoPath !== null &&
    sourceBranch !== null &&
    targetBranch !== null &&
    filePath !== null &&
    filePath.length > 0;

  return useQuery({
    queryKey: diffKeys.file(
      repoPath ?? '',
      `${sourceBranch ?? ''}...${targetBranch ?? ''}`,
      filePath ?? '',
    ),
    queryFn: () =>
      ipc(MERGE.GET['FILE-DIFF'], {
        repoPath: repoPath ?? '',
        sourceBranch: sourceBranch ?? '',
        targetBranch: targetBranch ?? '',
        filePath: filePath ?? '',
      }),
    enabled,
    staleTime: 30_000,
  });
}

export type { DiffFileEntry, DiffSummary, FileChangeStatus };
