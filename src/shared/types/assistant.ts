/**
 * Assistant-related types
 */

export type IntentType = 'quick_command' | 'task_creation' | 'conversation';

/** Expanded action types for Claude API classification */
export type AssistantAction =
  | 'create_task'
  | 'create_time_block'
  | 'create_note'
  | 'create_reminder'
  | 'search'
  | 'spotify_control'
  | 'open_url'
  | 'conversation';

export interface AssistantContext {
  activeProjectId: string | null;
  activeProjectName: string | null;
  currentPage: string;
  todayDate: string;
}

export interface AssistantCommand {
  input: string;
  context?: AssistantContext;
}

export interface AssistantResponse {
  type: 'text' | 'action' | 'error';
  content: string;
  intent?: IntentType;
  action?: AssistantAction;
  metadata?: Record<string, unknown>;
}

export interface CommandHistoryEntry {
  id: string;
  input: string;
  source: 'commandbar' | 'slack' | 'github';
  intent: IntentType;
  action?: AssistantAction;
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
