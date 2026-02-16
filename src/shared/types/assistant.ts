/**
 * Assistant-related types
 */

export type IntentType =
  | 'quick_command'
  | 'task_creation'
  | 'conversation'
  | 'watch'
  | 'device_query'
  | 'fitness'
  | 'calendar'
  | 'briefing'
  | 'insights'
  | 'ideation'
  | 'milestones'
  | 'email'
  | 'github'
  | 'planner'
  | 'notes'
  | 'changelog';

/** Expanded action types for Claude API classification */
export type AssistantAction =
  | 'create_task'
  | 'create_time_block'
  | 'create_note'
  | 'create_reminder'
  | 'search'
  | 'spotify_control'
  | 'open_url'
  | 'conversation'
  | 'watch_create'
  | 'watch_remove'
  | 'watch_list'
  | 'device_query'
  | 'fitness_log'
  | 'fitness_query'
  | 'fitness_measurements'
  | 'calendar_query'
  | 'calendar_create'
  | 'briefing_get'
  | 'insights_query'
  | 'ideation_create'
  | 'ideation_query'
  | 'milestones_query'
  | 'email_send'
  | 'email_queue'
  | 'github_prs'
  | 'github_issues'
  | 'github_notifications'
  | 'planner_today'
  | 'planner_weekly'
  | 'notes_search'
  | 'notes_list'
  | 'changelog_generate';

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
