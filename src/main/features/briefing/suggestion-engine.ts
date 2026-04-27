/**
 * Suggestion Engine — Proactive suggestions based on heuristics
 *
 * Generates suggestions without using LLM, based on:
 * - Stale projects (no commits in 7+ days)
 * - Tasks that could be parallelized
 * - Blocked tasks that need attention
 */

import type { Suggestion, SuggestionType } from '@shared/types';

import type { BusSessionManager } from '../../bus/session-manager';
import type { ProgressService } from '../progress/progress-service';
import type { ProjectService } from '../projects/project-service';

const STALE_PROJECT_DAYS = 7;

/** Suggestion engine interface */
export interface SuggestionEngine {
  /** Generate all suggestions */
  getSuggestions: () => Promise<Suggestion[]>;
  /** Check for stale projects */
  getStaleProjectSuggestions: () => Suggestion[];
  /** Check for parallel task opportunities */
  getParallelTaskSuggestions: () => Promise<Suggestion[]>;
  /** Check for blocked tasks */
  getBlockedTaskSuggestions: () => Promise<Suggestion[]>;
}

/** Dependencies for the suggestion engine */
export interface SuggestionEngineDeps {
  projectService: ProjectService;
  progressService: ProgressService;
  busSessionManager: BusSessionManager;
}

/**
 * Create a suggestion engine instance.
 */
export function createSuggestionEngine(deps: SuggestionEngineDeps): SuggestionEngine {
  const { projectService, progressService, busSessionManager } = deps;

  function getStaleProjectSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const projects = projectService.listProjectsSync();
    const now = Date.now();
    const staleThreshold = STALE_PROJECT_DAYS * 24 * 60 * 60 * 1000;

    for (const project of projects) {
      const lastUpdated = new Date(project.updatedAt).getTime();
      const daysSinceUpdate = Math.floor((now - lastUpdated) / (24 * 60 * 60 * 1000));

      // If project hasn't been updated in a while
      if (now - lastUpdated > staleThreshold) {
        suggestions.push(
          createSuggestion('stale_project', {
            title: `${project.name} hasn't been updated`,
            description: `This project has been inactive for ${String(daysSinceUpdate)} days. Consider reviewing or archiving it.`,
            action: {
              label: 'View Project',
              targetId: project.id,
              targetType: 'project',
            },
          }),
        );
      }
    }

    return suggestions;
  }

  async function getParallelTaskSuggestions(): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const tasks = await progressService.listTasks();
    const activeSessions = busSessionManager.list({ status: 'active' });
    const maxConcurrent = 3; // Could be fetched from settings

    const backlogTasks = tasks.filter((t) => t.status === 'backlog' || t.status === 'plan_ready');
    const executingTasks = tasks.filter((t) => t.status === 'executing');

    // If there are backlog tasks but room for more agents
    if (backlogTasks.length > 1 && activeSessions.length < maxConcurrent) {
      const availableSlots = maxConcurrent - activeSessions.length;
      const parallelizableCount = Math.min(backlogTasks.length, availableSlots);

      if (parallelizableCount > 0) {
        suggestions.push(
          createSuggestion('parallel_tasks', {
            title: `${String(parallelizableCount)} tasks can run in parallel`,
            description: `There are ${String(backlogTasks.length)} queued tasks and ${String(availableSlots)} available agent slots. Consider starting more tasks in parallel.`,
            action: {
              label: 'View Tasks',
              targetId: 'progress',
              targetType: 'project',
            },
          }),
        );
      }
    }

    // Also suggest if there are many backlog tasks
    if (backlogTasks.length > 3 && executingTasks.length === 0) {
      suggestions.push(
        createSuggestion('parallel_tasks', {
          title: 'Multiple tasks waiting',
          description: `There are ${String(backlogTasks.length)} tasks in queue but none running. Consider starting some tasks.`,
          action: {
            label: 'View Queue',
            targetId: 'progress',
            targetType: 'project',
          },
        }),
      );
    }

    return suggestions;
  }

  async function getBlockedTaskSuggestions(): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const tasks = await progressService.listTasks();

    // Find tasks in error state
    const errorTasks = tasks.filter((t) => t.status === 'error');
    for (const task of errorTasks) {
      suggestions.push(
        createSuggestion('blocked_task', {
          title: `Task "${task.title}" failed`,
          description:
            'This task encountered an error and needs attention. Check the logs for details.',
          action: {
            label: 'View Task',
            targetId: task.slug,
            targetType: 'task',
          },
        }),
      );
    }

    // Find tasks stuck in review for too long (>24h)
    const now = Date.now();
    const reviewTasks = tasks.filter((t) => t.status === 'review');
    for (const task of reviewTasks) {
      const updatedAt = new Date(task.updatedAt).getTime();
      const hoursSinceUpdate = (now - updatedAt) / (60 * 60 * 1000);

      if (hoursSinceUpdate > 24) {
        suggestions.push(
          createSuggestion('blocked_task', {
            title: `"${task.title}" awaiting review`,
            description: `This task has been waiting for human review for ${String(Math.floor(hoursSinceUpdate))} hours.`,
            action: {
              label: 'Review Task',
              targetId: task.slug,
              targetType: 'task',
            },
          }),
        );
      }
    }

    return suggestions;
  }

  async function getSuggestions(): Promise<Suggestion[]> {
    // Collect all suggestions
    const [parallelSuggestions, blockedSuggestions] = await Promise.all([
      getParallelTaskSuggestions(),
      getBlockedTaskSuggestions(),
    ]);

    const suggestions: Suggestion[] = [
      ...getStaleProjectSuggestions(),
      ...parallelSuggestions,
      ...blockedSuggestions,
    ];

    // Limit to top 5 most actionable suggestions
    return suggestions.slice(0, 5);
  }

  return {
    getSuggestions,
    getStaleProjectSuggestions,
    getParallelTaskSuggestions,
    getBlockedTaskSuggestions,
  };
}

/** Helper to create a suggestion with proper typing */
function createSuggestion(type: SuggestionType, data: Omit<Suggestion, 'type'>): Suggestion {
  return { type, ...data };
}
