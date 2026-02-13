/**
 * Communications query keys factory
 */
export const communicationsKeys = {
  all: ['communications'] as const,
  slackChannels: () => [...communicationsKeys.all, 'slack-channels'] as const,
  discordServers: () => [...communicationsKeys.all, 'discord-servers'] as const,
  mcpConnected: () => [...communicationsKeys.all, 'mcp-connected'] as const,
  mcpConnection: (server: string) => [...communicationsKeys.all, 'mcp-connection', server] as const,
};
