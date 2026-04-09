/**
 * PLAN State Handler
 *
 * Reads task files from .claude/progress/<featureName>/tasks/
 * and builds a wave execution plan.
 *
 * Task files are Markdown with YAML frontmatter:
 *   taskNumber, taskName, taskSlug, wave, blockedBy[], blocks[]
 *
 * Waves are groups of tasks with no cross-wave dependencies.
 * Tasks within a wave run in parallel.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { WorkflowState } from '../types';

import type { TaskEntry, WavePlan, WorkflowEngineRecord } from '../types';

const YAML_FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---/;

/**
 * Parse a YAML array value like `[1, 2, 3]` into a list.
 */
function parseYamlArray(rawValue: string): unknown[] {
  const inner = rawValue.slice(1, -1).trim();
  if (inner.length === 0) return [];
  return inner.split(',').map((v) => {
    const trimmed = v.trim();
    const num = Number(trimmed);
    return Number.isNaN(num) ? trimmed.replaceAll('"', '').replaceAll("'", '') : num;
  });
}

/**
 * Parse a single YAML scalar value (number, boolean, string).
 */
function parseYamlScalar(rawValue: string): unknown {
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  const num = Number(rawValue);
  return !Number.isNaN(num) && rawValue.length > 0 ? num : rawValue.replaceAll('"', '').replaceAll("'", '');
}

/**
 * Parse simple YAML frontmatter — scalar and array values only.
 */
function parseFrontmatter(raw: string): Record<string, unknown> {
  const match = YAML_FRONTMATTER_PATTERN.exec(raw);
  if (!match) return {};

  const yamlBlock = match[1];
  const result: Record<string, unknown> = {};

  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    result[key] =
      rawValue.startsWith('[') && rawValue.endsWith(']')
        ? parseYamlArray(rawValue)
        : parseYamlScalar(rawValue);
  }

  return result;
}

/**
 * Read all task .md files from the tasks directory and parse them.
 */
function readTaskFiles(tasksDir: string): TaskEntry[] {
  if (!existsSync(tasksDir)) {
    throw new Error(`PLAN FAIL: Tasks directory not found: ${tasksDir}`);
  }

  const files = readdirSync(tasksDir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    throw new Error(`PLAN FAIL: No task files found in: ${tasksDir}`);
  }

  const tasks: TaskEntry[] = [];

  for (const file of files) {
    const filePath = join(tasksDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(content);

    const taskNumber = typeof fm.taskNumber === 'number' ? fm.taskNumber : NaN;
    const taskName = typeof fm.taskName === 'string' ? fm.taskName : file;
    const taskSlug = typeof fm.taskSlug === 'string' ? fm.taskSlug : file.replace('.md', '');
    const wave = typeof fm.wave === 'number' ? fm.wave : 1;
    const blockedBy = Array.isArray(fm.blockedBy)
      ? (fm.blockedBy as unknown[]).filter((v): v is number => typeof v === 'number')
      : [];
    const blocks = Array.isArray(fm.blocks)
      ? (fm.blocks as unknown[]).filter((v): v is number => typeof v === 'number')
      : [];

    if (Number.isNaN(taskNumber)) {
      console.warn(`[WorkflowEngine/PLAN] Skipping task file (no taskNumber): ${file}`);
      continue;
    }

    tasks.push({ taskNumber, taskName, taskSlug, wave, blockedBy, blocks, filePath });
  }

  return tasks.sort((a, b) => a.taskNumber - b.taskNumber);
}

/**
 * Group tasks into waves (tasks with the same wave number run together).
 */
function buildWaves(tasks: TaskEntry[]): TaskEntry[][] {
  const waveMap = new Map<number, TaskEntry[]>();

  for (const task of tasks) {
    const existing = waveMap.get(task.wave) ?? [];
    existing.push(task);
    waveMap.set(task.wave, existing);
  }

  const sortedWaveNumbers = [...waveMap.keys()].sort((a, b) => a - b);
  return sortedWaveNumbers.map((waveNum) => waveMap.get(waveNum) ?? []);
}

/**
 * Runs PLAN state — reads task files and builds a wave plan.
 * Returns the plan and next state (SETUP) on success; throws on failure.
 */
export function runPlan(
  record: WorkflowEngineRecord,
  projectPath: string,
): { nextState: WorkflowState; wavePlan: WavePlan } {
  const { featureName } = record.config;

  const tasksDir = join(projectPath, '.claude', 'progress', featureName, 'tasks');

  const tasks = readTaskFiles(tasksDir);
  const waves = buildWaves(tasks);

  const wavePlan: WavePlan = {
    featureName,
    waves,
    currentWave: 0,
    totalTasks: tasks.length,
  };

  console.warn(
    `[WorkflowEngine/PLAN] Feature: ${featureName}, Tasks: ${tasks.length}, Waves: ${waves.length}`,
  );

  return { nextState: WorkflowState.SETUP, wavePlan };
}
