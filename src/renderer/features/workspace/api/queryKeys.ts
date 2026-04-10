export const workspaceKeys = {
  all: ['workspace'] as const,
  sessions: (projectId: string) => ['workspace', 'sessions', projectId] as const,
  relaySessions: (projectId: string) => ['workspace', 'relay-sessions', projectId] as const,
  relayBuffer: (sessionId: string) => ['workspace', 'relay-buffer', sessionId] as const,
};
