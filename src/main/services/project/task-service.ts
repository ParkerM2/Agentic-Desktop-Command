/**
 * Task Service — Spec file based task management
 *
 * Tasks are stored as directories inside `<project>/.auto-claude/specs/`.
 * Each task directory contains:
 *   - requirements.json  — title, description, workflow type
 *   - task_metadata.json — model config, branch info
 *   - implementation_plan.json — status, phases, execution state
 *   - task_logs.json — execution logs (optional)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import {
  AUTO_CLAUDE_DIR,
  SPECS_DIR,
  REQUIREMENTS_FILENAME,
  PLAN_FILENAME,
  METADATA_FILENAME,
  LOGS_FILENAME,
} from '@shared/constants';
import type { ExecutionPhase, Task, TaskDraft, TaskStatus, Subtask } from '@shared/types';

/* ------------------------------------------------------------------ */
/*  Interfaces for on-disk JSON structures                            */
/* ------------------------------------------------------------------ */

interface RequirementsJson {
  task_description?: string;
  workflow_type?: string;
}

interface PlanPhase {
  name?: string;
  title?: string;
  description?: string;
  completed?: boolean;
  started?: boolean;
  files?: string[];
}

interface ImplementationPlanJson {
  feature?: string;
  description?: string;
  status?: TaskStatus;
  xstateState?: TaskStatus;
  created_at?: string;
  updated_at?: string;
  phases?: PlanPhase[];
  executionPhase?: ExecutionPhase;
  completedPhases?: ExecutionPhase[];
  planStatus?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function readJsonFile(filePath: string): unknown {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as unknown;
}

/* ------------------------------------------------------------------ */
/*  Public interface                                                   */
/* ------------------------------------------------------------------ */

export interface TaskService {
  listTasks: (projectId: string) => Task[];
  getTask: (projectId: string, taskId: string) => Task;
  createTask: (draft: TaskDraft) => Task;
  updateTask: (taskId: string, updates: Record<string, unknown>) => Task;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Task;
  deleteTask: (projectId: string, taskId: string) => void;
  executeTask: (projectId: string, taskId: string) => { agentId: string };
}

type ProjectResolver = (projectId: string) => string | undefined;

function getPhaseStatus(ph: PlanPhase): 'completed' | 'in_progress' | 'pending' {
  if (ph.completed === true) return 'completed';
  if (ph.started === true) return 'in_progress';
  return 'pending';
}

function getSpecsDir(p: string): string {
  return join(p, AUTO_CLAUDE_DIR, SPECS_DIR);
}
function getTaskDir(p: string, id: string): string {
  return join(getSpecsDir(p), id);
}

function readTask(taskDir: string, taskId: string): Task | null {
  try {
    const reqPath = join(taskDir, REQUIREMENTS_FILENAME);
    const planPath = join(taskDir, PLAN_FILENAME);
    if (!existsSync(reqPath)) return null;

    const req = readJsonFile(reqPath) as RequirementsJson;
    const plan: ImplementationPlanJson = existsSync(planPath)
      ? (readJsonFile(planPath) as ImplementationPlanJson)
      : {};

    let logs: string[] = [];
    const logsPath = join(taskDir, LOGS_FILENAME);
    if (existsSync(logsPath)) {
      try {
        logs = readJsonFile(logsPath) as string[];
      } catch {
        /* corrupted logs file */
      }
    }

    const status: TaskStatus = plan.status ?? plan.xstateState ?? 'backlog';
    const subtasks: Subtask[] = (plan.phases ?? []).map((ph: PlanPhase, i: number) => ({
      id: `${taskId}-phase-${i}`,
      title: ph.name ?? ph.title ?? `Phase ${i + 1}`,
      description: ph.description ?? '',
      status: getPhaseStatus(ph),
      files: ph.files ?? [],
    }));

    return {
      id: taskId,
      specId: taskId,
      title: plan.feature ?? req.task_description ?? taskId,
      description: req.task_description ?? plan.description ?? '',
      status,
      subtasks,
      executionProgress: plan.executionPhase
        ? {
            phase: plan.executionPhase,
            phaseProgress: 0,
            overallProgress: plan.executionPhase === 'complete' ? 100 : 0,
            completedPhases: plan.completedPhases,
          }
        : undefined,
      logs,
      createdAt: plan.created_at ?? new Date().toISOString(),
      updatedAt: plan.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function slugify(title: string, num: number): string {
  const slug = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 50);
  return `${num}-${slug || 'task'}`;
}

function getNextNum(specsDir: string): number {
  if (!existsSync(specsDir)) return 1;
  const nums = readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => Number.parseInt(d.name.split('-')[0] ?? '', 10))
    .filter((n) => !Number.isNaN(n));
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

export function createTaskService(resolveProject: ProjectResolver): TaskService {
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
      if (!existsSync(specsDir)) return [];

      const tasks: Task[] = [];
      for (const entry of readdirSync(specsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const task = readTask(join(specsDir, entry.name), entry.name);
        if (task) {
          taskProjectMap.set(entry.name, projectPath);
          tasks.push(task);
        }
      }
      return tasks;
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
          {
            task_description: draft.description || draft.title,
            workflow_type: 'feature',
          },
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
      // Placeholder — real execution will be handled by AgentService
      // which spawns a Claude CLI process and monitors it
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
      // Return a placeholder agentId — AgentService will generate the real one
      return { agentId: `agent-${taskId}-${Date.now()}` };
    },
  };
}
