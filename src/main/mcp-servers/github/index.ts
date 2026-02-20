/**
 * GitHub MCP Server — Configuration and entry point
 *
 * Defines the server config for GitHub integration.
 * The server requires OAuth authentication via the GitHub provider.
 */

import type { McpServerConfig } from '../../mcp/types';

export const GITHUB_SERVER_CONFIG: McpServerConfig = {
  name: 'github',
  displayName: 'GitHub',
  transport: 'stdio',
  requiresAuth: true,
  authProvider: 'github',
};

export { createGitHubCliClient } from './github-client';
export { executeGitHubTool, GITHUB_TOOLS } from './tools';
export type { GitHubAuthStatus, GitHubClient, GitHubRepo } from './github-client';
export type { Issue, Notification, PullRequest, PullRequestReview } from './types';
