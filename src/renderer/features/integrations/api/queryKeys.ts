/**
 * Integrations query key factory
 * Combines keys from communications (MCP) and GitHub.
 */

export const integrationsKeys = {
  all: ['integrations'] as const,

  // MCP / communications keys
  slackChannels: () => [...integrationsKeys.all, 'slack-channels'] as const,
  discordServers: () => [...integrationsKeys.all, 'discord-servers'] as const,
  mcpConnected: () => [...integrationsKeys.all, 'mcp-connected'] as const,
  mcpConnection: (server: string) =>
    [...integrationsKeys.all, 'mcp-connection', server] as const,

  // GitHub keys
  github: () => [...integrationsKeys.all, 'github'] as const,
  githubAuthStatus: () => [...integrationsKeys.github(), 'authStatus'] as const,
  githubRepos: () => [...integrationsKeys.github(), 'repos'] as const,
  githubPrs: () => [...integrationsKeys.github(), 'prs'] as const,
  githubPrList: (owner: string, repo: string) =>
    [...integrationsKeys.githubPrs(), owner, repo] as const,
  githubPrDetail: (owner: string, repo: string, number: number) =>
    [...integrationsKeys.githubPrs(), owner, repo, number] as const,
  githubIssues: () => [...integrationsKeys.github(), 'issues'] as const,
  githubIssueList: (owner: string, repo: string) =>
    [...integrationsKeys.githubIssues(), owner, repo] as const,
  githubNotifications: () => [...integrationsKeys.github(), 'notifications'] as const,
};
