/**
 * Task Store — File I/O helpers for reading task spec directories.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  ADC_DIR,
  SPECS_DIR,
  REQUIREMENTS_FILENAME,
  PLAN_FILENAME,
  METADATA_FILENAME,
  LOGS_FILENAME,
} from '@shared/constants';
import type { Subtask, Task, TaskPriority, TaskStatus } from '@shared/types';
import { LEGACY_STATUS_MAP } from '@shared/types';

import { getPhaseStatus } from './task-spec-parser';

import type { ImplementationPlanJson, PlanPhase, RequirementsJson } from './task-spec-parser';

/** On-disk shape of task_metadata.json */
interface TaskMetadataJson {
  uuid?: string;
  priority?: string;
  projectId?: string;
  workspaceId?: string;
  [key: string]: unknown;
}

/** Valid TaskPriority values for runtime checking */
const VALID_PRIORITIES = new Set<string>(['low', 'normal', 'high', 'urgent']);

export function readJsonFile(filePath: string): unknown {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as unknown;
}

export function getSpecsDir(projectPath: string): string {
  return join(projectPath, ADC_DIR, SPECS_DIR);
}

export function getTaskDir(projectPath: string, taskId: string): string {
  return join(getSpecsDir(projectPath), taskId);
}

export function readTask(taskDir: string, taskId: string): Task | null {
  try {
    const reqPath = join(taskDir, REQUIREMENTS_FILENAME);
    const planPath = join(taskDir, PLAN_FILENAME);
    if (!existsSync(reqPath)) return null;

    const req = readJsonFile(reqPath) as RequirementsJson;
    const plan: ImplementationPlanJson = existsSync(planPath)
      ? (readJsonFile(planPath) as ImplementationPlanJson)
      : {};

    // Read task_metadata.json for UUID, priority, projectId, workspaceId
    let meta: TaskMetadataJson = {};
    const metaPath = join(taskDir, METADATA_FILENAME);
    if (existsSync(metaPath)) {
      try {
        meta = readJsonFile(metaPath) as TaskMetadataJson;
      } catch {
        /* corrupted metadata file — use defaults */
      }
    }

    let logs: string[] = [];
    const logsPath = join(taskDir, LOGS_FILENAME);
    if (existsSync(logsPath)) {
      try {
        logs = readJsonFile(logsPath) as string[];
      } catch {
        /* corrupted logs file */
      }
    }

    const rawStatus: string = plan.status ?? plan.xstateState ?? 'backlog';
    const status: TaskStatus = LEGACY_STATUS_MAP[rawStatus] ?? (rawStatus as TaskStatus);
    const subtasks: Subtask[] = (plan.phases ?? []).map((ph: PlanPhase, i: number) => ({
      id: `${taskId}-phase-${i}`,
      title: ph.name ?? ph.title ?? `Phase ${i + 1}`,
      description: ph.description ?? '',
      status: getPhaseStatus(ph),
      files: ph.files ?? [],
    }));

    const priority: TaskPriority | undefined =
      typeof meta.priority === 'string' && VALID_PRIORITIES.has(meta.priority)
        ? (meta.priority as TaskPriority)
        : undefined;

    return {
      id: taskId,
      specId: taskId,
      title: plan.feature ?? req.task_description ?? taskId,
      description: req.task_description ?? plan.description ?? '',
      status,
      priority,
      projectId: meta.projectId,
      workspaceId: meta.workspaceId,
      subtasks,
      executionProgress: plan.executionPhase
        ? {
            phase: plan.executionPhase,
            phaseProgress: 0,
            overallProgress: plan.executionPhase === 'complete' ? 100 : 0,
            completedPhases: plan.completedPhases,
          }
        : undefined,
      metadata: meta.uuid ? { uuid: meta.uuid } : undefined,
      logs,
      createdAt: plan.created_at ?? new Date().toISOString(),
      updatedAt: plan.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function listTaskDirs(specsDir: string): string[] {
  if (!existsSync(specsDir)) return [];
  return readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}
