/**
 * Briefing Generator — Data gathering and briefing assembly
 *
 * Gathers task summaries, agent activity, and GitHub notifications,
 * then delegates summary text generation to briefing-summary.ts.
 */

import type { AgentActivitySummary, BriefingConfig, DailyBriefing, TaskSummary } from '@shared/types';

import { createBriefingSummarizer } from './briefing-summary';

import type { SuggestionEngine } from './suggestion-engine';
import type { AgentOrchestrator } from '../agent-orchestrator/types';
import type { ClaudeClient } from '../claude/claude-client';
import type { NotificationManager } from '../notifications';
import type { ProjectService } from '../project/project-service';
import type { TaskService } from '../project/task-service';

/** Dependencies for the briefing generator */
export interface BriefingGeneratorDeps {
  projectService: ProjectService;
  taskService: TaskService;
  claudeClient: ClaudeClient;
  notificationManager?: NotificationManager;
  suggestionEngine: SuggestionEngine;
  agentOrchestrator: AgentOrchestrator;
}

export interface BriefingGenerator {
  /** Generate a new daily briefing object */
  generate: (config: BriefingConfig) => Promise<DailyBriefing>;
}

/**
 * Create a briefing generator that gathers data and produces a DailyBriefing.
 */
export function createBriefingGenerator(deps: BriefingGeneratorDeps): BriefingGenerator {
  const {
    projectService,
    taskService,
    notificationManager,
    suggestionEngine,
    agentOrchestrator,
  } = deps;

  const summarizer = createBriefingSummarizer({
    claudeClient: deps.claudeClient,
    agentOrchestrator,
    getTodayDate,
  });

  // -- Date helpers --

  function getTodayDate(): string {
    return new Date().toISOString().split('T')[0] ?? '';
  }

  function getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0] ?? '';
  }

  // -- Task helpers --

  function isCompletedYesterday(
    task: { status: string; updatedAt: string },
    yesterday: string,
  ): boolean {
    if (task.status !== 'done') return false;
    return task.updatedAt.split('T')[0] === yesterday;
  }

  function isDueToday(task: { status: string; createdAt: string }, today: string): boolean {
    if (task.status !== 'queued' && task.status !== 'backlog') return false;
    return task.createdAt.split('T')[0] === today || task.status === 'queued';
  }

  function isOverdue(task: { status: string; updatedAt: string }): boolean {
    if (task.status !== 'error' && task.status !== 'review') return false;
    const hoursSinceUpdate = (Date.now() - new Date(task.updatedAt).getTime()) / (60 * 60 * 1000);
    return hoursSinceUpdate > 24;
  }

  // -- Data gathering --

  function getTaskSummary(): TaskSummary {
    const projects = projectService.listProjectsSync();
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    let dueToday = 0;
    let completedYesterday = 0;
    let overdue = 0;
    let inProgress = 0;

    for (const project of projects) {
      const tasks = taskService.listTasks(project.id);
      for (const task of tasks) {
        if (task.status === 'running') inProgress++;
        if (isCompletedYesterday(task, yesterday)) completedYesterday++;
        if (isDueToday(task, today)) dueToday++;
        if (isOverdue(task)) overdue++;
      }
    }

    return { dueToday, completedYesterday, overdue, inProgress };
  }

  function getAgentActivitySummary(): AgentActivitySummary {
    const today = getTodayDate();
    let runningCount = 0;
    let completedToday = 0;
    let errorCount = 0;

    for (const session of agentOrchestrator.listActiveSessions()) {
      if (session.status === 'active' || session.status === 'spawning') runningCount++;
      if (session.status === 'completed' && session.spawnedAt.startsWith(today)) completedToday++;
      if (session.status === 'error') errorCount++;
    }

    return { runningCount, completedToday, errorCount };
  }

  function getGitHubNotificationCount(): number {
    if (notificationManager === undefined) return 0;
    try {
      return notificationManager.listNotifications({ sources: ['github'], unreadOnly: true }).length;
    } catch {
      return 0;
    }
  }

  function generateId(): string {
    return `briefing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  return {
    async generate(config) {
      const taskSummary = getTaskSummary();
      const agentActivity = config.includeAgentActivity
        ? getAgentActivitySummary()
        : { runningCount: 0, completedToday: 0, errorCount: 0 };
      const suggestions = suggestionEngine.getSuggestions();
      const githubNotifications = config.includeGitHub ? getGitHubNotificationCount() : 0;

      const summary = await summarizer.generateSummary(
        taskSummary,
        agentActivity,
        suggestions,
        githubNotifications,
      );

      return {
        id: generateId(),
        date: getTodayDate(),
        summary,
        taskSummary,
        agentActivity,
        suggestions,
        githubNotifications: config.includeGitHub ? githubNotifications : undefined,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}
