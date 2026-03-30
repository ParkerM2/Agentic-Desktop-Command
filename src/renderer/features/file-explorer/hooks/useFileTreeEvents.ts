/**
 * File tree IPC event listeners -> query invalidation
 *
 * Bridges real-time file-watcher events from the main process
 * to React Query cache, keeping the tree view up-to-date.
 *
 * Currently listens to project update events as a proxy for
 * file changes. Will be extended when a dedicated file-watcher
 * IPC event channel is implemented.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';

import { fileExplorerKeys } from '../api/queryKeys';

export function useFileTreeEvents() {
  const queryClient = useQueryClient();

  // When a project is updated, invalidate the tree cache
  // so it refetches from the file system
  useIpcEvent('event:project.updated', () => {
    void queryClient.invalidateQueries({ queryKey: fileExplorerKeys.all });
  });

  // When git worktree changes, file structure may have changed
  useIpcEvent('event:git.worktreeChanged', () => {
    void queryClient.invalidateQueries({ queryKey: fileExplorerKeys.all });
  });
}
