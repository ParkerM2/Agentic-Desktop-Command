/**
 * GitHub event handlers
 *
 * Invalidates GitHub queries when the main process emits update events.
 */

import { useQueryClient } from '@tanstack/react-query';

import { GITHUB_EVENTS } from '@shared/ipc/github/channels';

import { useIpcEvent } from '@renderer/shared/hooks/useIpcEvent';

import { integrationsKeys } from '../api/queryKeys';

/**
 * Subscribe to GitHub IPC events and invalidate relevant queries.
 */
export function useGitHubEvents(): void {
  const queryClient = useQueryClient();

  useIpcEvent(GITHUB_EVENTS.DATA.UPDATED, ({ type, owner, repo }) => {
    if (type === 'pr') {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.githubPrList(owner, repo),
      });
    } else if (type === 'issue') {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.githubIssueList(owner, repo),
      });
    } else {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.githubNotifications(),
      });
    }
  });
}
