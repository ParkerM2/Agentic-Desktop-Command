/**
 * Integrations feature — public API
 */

// Components
export { IntegrationsPage } from './components/IntegrationsPage';
export { GitHubConnectionStatus } from './components/GitHubConnectionStatus';
export { GitHubPanel } from './components/GitHubPanel';
export { IssueCreateForm } from './components/IssueCreateForm';
export { IssueList } from './components/IssueList';
export { NotificationList } from './components/NotificationList';
export { PrDetailModal } from './components/PrDetailModal';
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
} from './api/useGitHub';

// Events / Hooks
export { useIntegrationsEvents } from './hooks/useIntegrationsEvents';
export { useGitHubEvents } from './hooks/useGitHubEvents';
export { useGitHubProjectSync } from './hooks/useGitHubProjectSync';
