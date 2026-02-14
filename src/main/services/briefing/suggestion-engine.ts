/**
 * Suggestion Engine — Proactive suggestions based on heuristics
 *
 * Generates suggestions without using LLM, based on:
 * - Stale projects (no commits in 7+ days)
 * - Tasks that could be parallelized
 * - Blocked tasks that need attention
 */

import type { Suggestion, SuggestionType } from '@shared/types';

import type { AgentService } from '../agent/agent-service';
import type { ProjectService } from '../project/project-service';
import type { TaskService } from '../project/task-service';

const STALE_PROJECT_DAYS = 7;

/** Suggestion engine interface */
export interface SuggestionEngine {
  /** Generate all suggestions */
  getSuggestions: () => Suggestion[];
  /** Check for stale projects */
  getStaleProjectSuggestions: () => Suggestion[];
  /** Check for parallel task opportunities */
  getParallelTaskSuggestions: () => Suggestion[];
  /** Check for blocked tasks */
  getBlockedTaskSuggestions: () => Suggestion[];
}

/** Dependencies for the suggestion engine */
export interface SuggestionEngineDeps {
  projectService: ProjectService;
  taskService: TaskService;
  agentService: AgentService;
}

/**
 * Create a suggestion engine instance.
 */
export function createSuggestionEngine(deps: SuggestionEngineDeps): SuggestionEngine {
  const { projectService, taskService, agentService } = deps;

  function getStaleProjectSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const projects = projectService.listProjects();
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

  function getParallelTaskSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const projects = projectService.listProjects();
    const runningAgents = agentService.listAllAgents();
    const maxConcurrent = 3; // Could be fetched from settings

    for (const project of projects) {
      const tasks = taskService.listTasks(project.id);
      const queuedTasks = tasks.filter((t) => t.status === 'queue');
      const runningTasks = tasks.filter((t) => t.status === 'in_progress');
      const runningAgentsForProject = runningAgents.filter((a) => a.projectId === project.id);

      // If there are queued tasks but room for more agents
      if (queuedTasks.length > 1 && runningAgentsForProject.length < maxConcurrent) {
        const availableSlots = maxConcurrent - runningAgentsForProject.length;
        const parallelizableCount = Math.min(queuedTasks.length, availableSlots);

        if (parallelizableCount > 0) {
          suggestions.push(
            createSuggestion('parallel_tasks', {
              title: `${String(parallelizableCount)} tasks can run in parallel`,
              description: `${project.name} has ${String(queuedTasks.length)} queued tasks and ${String(availableSlots)} available agent slots. Consider starting more tasks in parallel.`,
              action: {
                label: 'View Tasks',
                targetId: project.id,
                targetType: 'project',
              },
            }),
          );
        }
      }

      // Also suggest if there are many queued tasks
      if (queuedTasks.length > 3 && runningTasks.length === 0) {
        suggestions.push(
          createSuggestion('parallel_tasks', {
            title: 'Multiple tasks waiting',
            description: `${project.name} has ${String(queuedTasks.length)} tasks in queue but none running. Consider starting some tasks.`,
            action: {
              label: 'View Queue',
              targetId: project.id,
              targetType: 'project',
            },
          }),
        );
      }
    }

    return suggestions;
  }

  function getBlockedTaskSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const projects = projectService.listProjects();

    for (const project of projects) {
      const tasks = taskService.listTasks(project.id);

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
              targetId: task.id,
              targetType: 'task',
            },
          }),
        );
      }

      // Find tasks stuck in human_review for too long (>24h)
      const now = Date.now();
      const reviewTasks = tasks.filter((t) => t.status === 'human_review');
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
                targetId: task.id,
                targetType: 'task',
              },
            }),
          );
        }
      }
    }

    return suggestions;
  }

  function getSuggestions(): Suggestion[] {
    // Collect all suggestions
    const suggestions: Suggestion[] = [
      ...getStaleProjectSuggestions(),
      ...getParallelTaskSuggestions(),
      ...getBlockedTaskSuggestions(),
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
