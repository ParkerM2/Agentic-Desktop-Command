/**
 * Integrations feature — public API
 */

// Components
export { IntegrationsPage } from './components/IntegrationsPage';
export { EmailPanel } from './components/EmailPanel';
export { GitHubConnectionStatus } from './components/GitHubConnectionStatus';
export { GitHubPanel } from './components/GitHubPanel';
export { IssueCreateForm } from './components/IssueCreateForm';
export { IssueList } from './components/IssueList';
export { NotificationList } from './components/NotificationList';
export { NotificationsPanel } from './components/NotificationsPanel';
export { PrDetailModal } from './components/PrDetailModal';
export { PrDiffView } from './components/PrDiffView';
export { PrList } from './components/PrList';

// Store
export { useIntegrationsStore } from './store';
export type { IntegrationsTab } from './store';

// API
export { integrationsKeys } from './api/queryKeys';
export type { McpToolCallParams, McpToolResult } from './api/useMcpTool';
export { useMcpConnectedServers, useMcpConnectionState, useMcpToolCall } from './api/useMcpTool';
export type { GitHubIssue, GitHubNotification, GitHubPr, GitHubPullRequest } from './api/useGitHub';
export {
  useCreateIssue,
  useGitHubAuthStatus,
  useGitHubIssues,
  useGitHubNotifications,
  useGitHubPrDetail,
  useGitHubPrs,
  useGitHubRepos,
  usePrDiff,
} from './api/useGitHub';
export {
  useEmailConfig,
  useEmailQueue,
  useRemoveEmailQueued,
  useRetryEmailQueued,
  useSendTestEmail,
  useTestEmailConnection,
  useUpdateEmailConfig,
} from './api/useEmail';
export {
  useAllNotifications,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotificationsConfig,
  useStartWatching,
  useStopWatching,
  useUpdateNotificationsConfig,
  useWatcherStatus,
} from './api/useNotifications';

// Events / Hooks
export { useIntegrationsEvents } from './hooks/useIntegrationsEvents';
export { useGitHubEvents } from './hooks/useGitHubEvents';
export { useGitHubProjectSync } from './hooks/useGitHubProjectSync';
