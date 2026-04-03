/**
 * Assistant-related types
 */

export interface AssistantContext {
  projectPath: string;
}

export interface AssistantCommand {
  input: string;
  projectPath: string;
}

export interface AssistantResponse {
  type: 'text' | 'error';
  content: string;
}

export interface CommandHistoryEntry {
  id: string;
  input: string;
  responseSummary: string;
  timestamp: string;
}

export interface WebhookCommand {
  source: 'slack' | 'github';
  commandText: string;
  sourceContext: {
    userId?: string;
    userName?: string;
    channelId?: string;
    channelName?: string;
    threadTs?: string;
    permalink?: string;
    repo?: string;
    prNumber?: number;
    prTitle?: string;
    prUrl?: string;
    commentAuthor?: string;
  };
}

export interface WebhookConfig {
  slack: {
    botToken: string;
    signingSecret: string;
    configured: boolean;
  };
  github: {
    webhookSecret: string;
    configured: boolean;
  };
}
