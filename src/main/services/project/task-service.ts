/**
 * Task Service — Spec file based task management
 *
 * Tasks are stored as directories inside `<project>/.adc/specs/`.
 * Each task directory contains:
 *   - requirements.json  — title, description, workflow type
 *   - task_metadata.json — model config, branch info
 *   - implementation_plan.json — status, phases, execution state
 *   - task_logs.json — execution logs (optional)
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { REQUIREMENTS_FILENAME, PLAN_FILENAME, METADATA_FILENAME } from '@shared/constants';
import type { Task, TaskDraft, TaskStatus } from '@shared/types';

import { getNextNum, slugify } from './task-slug';
import { getSpecsDir, getTaskDir, listTaskDirs, readJsonFile, readTask } from './task-store';

import type { ImplementationPlanJson } from './task-spec-parser';

/* ------------------------------------------------------------------ */
/*  Public interface                                                   */
/* ------------------------------------------------------------------ */

export type { ImplementationPlanJson, PlanPhase, RequirementsJson } from './task-spec-parser';

export interface TaskService {
  listTasks: (projectId: string) => Task[];
  listAllTasks: () => Task[];
  getTask: (projectId: string, taskId: string) => Task;
  createTask: (draft: TaskDraft) => Task;
  updateTask: (taskId: string, updates: Record<string, unknown>) => Task;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Task;
  deleteTask: (projectId: string, taskId: string) => void;
  executeTask: (projectId: string, taskId: string) => { agentId: string };
}

type ProjectResolver = (projectId: string) => string | undefined;
type ProjectsLister = () => Array<{ id: string; path: string }>;

export function createTaskService(
  resolveProject: ProjectResolver,
  listProjects?: ProjectsLister,
): TaskService {
  // Cache: taskId → projectPath (populated on list/get/create)
  const taskProjectMap = new Map<string, string>();

  function resolve(projectId: string): string {
    const p = resolveProject(projectId);
    if (!p) throw new Error(`Project ${projectId} not found`);
    return p;
  }

  function resolveByTaskId(taskId: string): string {
    const p = taskProjectMap.get(taskId);
    if (!p) throw new Error(`Unknown task ${taskId} — list tasks first`);
    return p;
  }

  return {
    listTasks(projectId) {
      const projectPath = resolve(projectId);
      const specsDir = getSpecsDir(projectPath);
      const tasks: Task[] = [];
      for (const name of listTaskDirs(specsDir)) {
        const task = readTask(join(specsDir, name), name);
        if (task) {
          taskProjectMap.set(name, projectPath);
          tasks.push(task);
        }
      }
      return tasks;
    },

    listAllTasks() {
      if (!listProjects) return [];

      const allTasks: Task[] = [];
      for (const project of listProjects()) {
        const specsDir = getSpecsDir(project.path);
        for (const name of listTaskDirs(specsDir)) {
          const task = readTask(join(specsDir, name), name);
          if (task) {
            taskProjectMap.set(name, project.path);
            allTasks.push({
              ...task,
              metadata: { ...task.metadata, projectId: project.id },
            });
          }
        }
      }
      return allTasks;
    },

    getTask(projectId, taskId) {
      const projectPath = resolve(projectId);
      const task = readTask(getTaskDir(projectPath, taskId), taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);
      taskProjectMap.set(taskId, projectPath);
      return task;
    },

    createTask(draft) {
      const projectPath = resolve(draft.projectId);
      const specsDir = getSpecsDir(projectPath);
      if (!existsSync(specsDir)) mkdirSync(specsDir, { recursive: true });

      const taskId = slugify(draft.title, getNextNum(specsDir));
      const taskDir = getTaskDir(projectPath, taskId);
      mkdirSync(taskDir, { recursive: true });

      const now = new Date().toISOString();
      writeFileSync(
        join(taskDir, REQUIREMENTS_FILENAME),
        JSON.stringify(
          { task_description: draft.description || draft.title, workflow_type: 'feature' },
          null,
          2,
        ),
      );

      writeFileSync(
        join(taskDir, PLAN_FILENAME),
        JSON.stringify(
          {
            feature: draft.title,
            description: draft.description,
            created_at: now,
            updated_at: now,
            status: 'backlog',
            phases: [],
            planStatus: 'pending',
            xstateState: 'backlog',
            executionPhase: 'idle',
          },
          null,
          2,
        ),
      );

      writeFileSync(
        join(taskDir, METADATA_FILENAME),
        JSON.stringify(
          {
            sourceType: 'manual',
            model: 'opus',
            thinkingLevel: 'high',
            complexity: draft.complexity ?? 'standard',
          },
          null,
          2,
        ),
      );

      taskProjectMap.set(taskId, projectPath);
      return {
        id: taskId,
        specId: taskId,
        title: draft.title,
        description: draft.description,
        status: 'backlog' as const,
        subtasks: [],
        createdAt: now,
        updatedAt: now,
      };
    },

    updateTask(taskId, updates) {
      const projectPath = resolveByTaskId(taskId);
      const planPath = join(getTaskDir(projectPath, taskId), PLAN_FILENAME);
      if (!existsSync(planPath)) throw new Error(`Task ${taskId} plan not found`);
      const plan = readJsonFile(planPath) as ImplementationPlanJson;
      const updated = { ...plan, ...updates, updated_at: new Date().toISOString() };
      writeFileSync(planPath, JSON.stringify(updated, null, 2));
      const task = readTask(getTaskDir(projectPath, taskId), taskId);
      if (!task) throw new Error('Failed to read updated task');
      return task;
    },

    updateTaskStatus(taskId, status) {
      const projectPath = resolveByTaskId(taskId);
      const planPath = join(getTaskDir(projectPath, taskId), PLAN_FILENAME);
      if (!existsSync(planPath)) throw new Error(`Task ${taskId} plan not found`);

      const plan = readJsonFile(planPath) as ImplementationPlanJson;
      plan.status = status;
      plan.xstateState = status;
      plan.updated_at = new Date().toISOString();
      writeFileSync(planPath, JSON.stringify(plan, null, 2));
      const task = readTask(getTaskDir(projectPath, taskId), taskId);
      if (!task) throw new Error('Failed to read updated task');
      return task;
    },

    deleteTask(projectId, taskId) {
      const projectPath = resolve(projectId);
      const taskDir = getTaskDir(projectPath, taskId);
      if (existsSync(taskDir)) {
        rmSync(taskDir, { recursive: true, force: true });
      }
      taskProjectMap.delete(taskId);
    },

    executeTask(projectId, taskId) {
      const projectPath = resolve(projectId);
      const planPath = join(getTaskDir(projectPath, taskId), PLAN_FILENAME);
      if (existsSync(planPath)) {
        const plan = readJsonFile(planPath) as ImplementationPlanJson;
        plan.status = 'in_progress';
        plan.xstateState = 'in_progress';
        plan.executionPhase = 'idle';
        plan.updated_at = new Date().toISOString();
        writeFileSync(planPath, JSON.stringify(plan, null, 2));
      }
      return { agentId: `agent-${taskId}-${Date.now()}` };
    },
  };
}
