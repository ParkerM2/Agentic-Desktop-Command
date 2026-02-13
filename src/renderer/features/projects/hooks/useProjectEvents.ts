/**
 * Project IPC event listeners → query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';

import { projectKeys } from '../api/queryKeys';
import { gitKeys } from '../api/useGit';

export function useProjectEvents() {
  const queryClient = useQueryClient();

  useIpcEvent('event:project.updated', ({ projectId }) => {
    void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
  });

  useIpcEvent('event:git.worktreeChanged', ({ projectId }) => {
    void queryClient.invalidateQueries({ queryKey: gitKeys.worktrees(projectId) });
    void queryClient.invalidateQueries({ queryKey: gitKeys.all });
  });
}
