/**
 * Progress Task Types
 *
 * Shared types for the progress-driven task pipeline. Tasks are stored as
 * directories under `progress/` in the project root and flow through a
 * Research → Plan → Team execution pipeline.
 */

export type ProgressStatus =
  | 'backlog'
  | 'researching'
  | 'research_done'
  | 'planning'
  | 'plan_ready'
  | 'executing'
  | 'review'
  | 'done'
  | 'archived'
  | 'error';

export type ProgressPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ProgressTask {
  slug: string;
  rootFile: string;
  title: string;
  description: string;
  status: ProgressStatus;
  priority: ProgressPriority;
  jiraTicket?: string;
  jiraUrl?: string;
  prNumber?: number;
  prUrl?: string;
  prStatus?: string;
  createdAt: string;
  updatedAt: string;

  /** Derived from directory contents */
  hasResearch: boolean;
  hasPlan: boolean;
  hasTeamTasks: boolean;
  teamTaskCount: number;

  /** Content — populated on getTask, not listTasks */
  researchContent?: string;
  planContent?: string;
}
