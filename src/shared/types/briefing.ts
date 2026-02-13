/**
 * Daily Briefing types
 */

/** Type of proactive suggestion */
export type SuggestionType = 'stale_project' | 'parallel_tasks' | 'blocked_task';

/** A proactive suggestion based on heuristics */
export interface Suggestion {
  type: SuggestionType;
  title: string;
  description: string;
  action?: {
    label: string;
    targetId?: string;
    targetType?: 'project' | 'task';
  };
}

/** Summary of tasks for a time period */
export interface TaskSummary {
  dueToday: number;
  completedYesterday: number;
  overdue: number;
  inProgress: number;
}

/** Summary of agent activity */
export interface AgentActivitySummary {
  runningCount: number;
  completedToday: number;
  errorCount: number;
}

/** The daily briefing content */
export interface DailyBriefing {
  id: string;
  date: string;
  summary: string;
  taskSummary: TaskSummary;
  agentActivity: AgentActivitySummary;
  suggestions: Suggestion[];
  githubNotifications?: number;
  generatedAt: string;
}

/** Configuration for the daily briefing feature */
export interface BriefingConfig {
  enabled: boolean;
  scheduledTime: string; // HH:MM format (24h)
  includeGitHub: boolean;
  includeAgentActivity: boolean;
}
