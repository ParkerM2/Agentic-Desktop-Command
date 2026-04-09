/**
 * Project IPC event listeners → query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { GIT_EVENTS } from '@shared/ipc/git/channels';
import { HUB_EVENTS } from '@shared/ipc/hub/channels';
import { PROJECTS_EVENTS } from '@shared/ipc/projects/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { projectKeys } from '../api/queryKeys';
import { gitKeys } from '../api/useGit';

export function useProjectEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(PROJECTS_EVENTS.PROJECT.UPDATED, ({ projectId }) => {
    void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
  });

  useIpcEvent(GIT_EVENTS.WORKTREE.CHANGED, ({ projectId }) => {
    void queryClient.invalidateQueries({ queryKey: gitKeys.worktrees(projectId) });
    void queryClient.invalidateQueries({ queryKey: gitKeys.all });
  });

  useIpcEvent(HUB_EVENTS.PROJECT.UPDATED, ({ projectId }) => {
    void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: projectKeys.subProjects(projectId) });
  });
}
