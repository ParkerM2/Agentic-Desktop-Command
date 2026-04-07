/**
 * Progress Service
 *
 * Filesystem-backed service that manages tasks in the `progress/` directory.
 * Provides CRUD operations, status reconciliation, agent session spawning,
 * and real-time file watching with event emission.
 *
 * Each task lives at `progress/<slug>/` and has a root markdown file
 * (task.md | description.md | ticket.md) with YAML frontmatter.
 */

import { watch } from 'node:fs';
import { access, mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { ProgressPriority, ProgressStatus, ProgressTask } from '@shared/types/progress';

import { serviceLogger } from '@main/lib/logger';

import { runLogCleanup as runLogCleanupFn } from './log-cleanup';
import { detectRootFile, readFrontmatter, writeFrontmatter } from './task-file-io';

import type { AgentManagerService } from '../agent-manager/agent-manager-service';
import type { FSWatcher } from 'node:fs';

// ─── Service Interface ────────────────────────────────────────

export interface ProgressService {
  listTasks: () => Promise<ProgressTask[]>;
  getTask: (slug: string) => Promise<ProgressTask | null>;
  createTask: (
    slug: string,
    title: string,
    description: string,
    priority?: ProgressPriority,
  ) => Promise<ProgressTask>;
  updateTask: (
    slug: string,
    updates: Partial<
      Pick<
        ProgressTask,
        | 'title'
        | 'description'
        | 'status'
        | 'priority'
        | 'jiraTicket'
        | 'jiraUrl'
        | 'prNumber'
        | 'prUrl'
        | 'prStatus'
        | 'workflow'
        | 'workflowPhase'
      >
    >,
  ) => Promise<ProgressTask>;
  archiveTask: (slug: string) => Promise<void>;
  deleteTask: (slug: string) => Promise<void>;
  listArchived: () => Promise<ProgressTask[]>;
  startResearch: (slug: string, prompt?: string) => Promise<{ sessionId: string }>;
  createPlan: (slug: string, prompt?: string) => Promise<{ sessionId: string }>;
  spinUpTeam: (slug: string, prompt?: string) => Promise<{ sessionId: string; action: string }>;
  runWorkflow: (slug: string, templateId?: string) => Promise<{ started: true }>;
  cancelAction: (slug: string) => Promise<{ success: boolean }>;
  runLogCleanup: () => Promise<{ deletedFiles: number }>;
  onTaskUpdated: (listener: (slug: string, task: ProgressTask) => void) => () => void;
  onTaskCreated: (listener: (slug: string, task: ProgressTask) => void) => () => void;
  onTaskArchived: (listener: (slug: string) => void) => () => void;
  onActionStarted: (
    listener: (slug: string, action: string, sessionId: string) => void,
  ) => () => void;
  onActionCompleted: (listener: (slug: string, action: string) => void) => () => void;
  onActionFailed: (listener: (slug: string, action: string, error: string) => void) => () => void;
  onWorkflowStep: (listener: (slug: string, step: string, status: string) => void) => () => void;
  dispose: () => void;
}

// ─── Status Ordering ──────────────────────────────────────────

const STATUS_ORDER: ProgressStatus[] = [
  'backlog',
  'researching',
  'research_done',
  'planning',
  'plan_ready',
  'executing',
  'review',
  'done',
  'archived',
  'error',
];

function statusRank(status: ProgressStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

function maxStatus(a: ProgressStatus, b: ProgressStatus): ProgressStatus {
  return statusRank(a) >= statusRank(b) ? a : b;
}

// ─── Frontmatter Helpers ──────────────────────────────────────

function isProgressStatus(value: unknown): value is ProgressStatus {
  return typeof value === 'string' && STATUS_ORDER.includes(value as ProgressStatus);
}

function isProgressPriority(value: unknown): value is ProgressPriority {
  const valid: ProgressPriority[] = ['low', 'normal', 'high', 'urgent'];
  return typeof value === 'string' && valid.includes(value as ProgressPriority);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

// ─── Directory Helpers ────────────────────────────────────────

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const s = await stat(dirPath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function countFiles(dirPath: string, pattern: RegExp): Promise<number> {
  try {
    const entries = await readdir(dirPath);
    return entries.filter((e) => pattern.test(e)).length;
  } catch {
    return 0;
  }
}

// ─── Task Builder ─────────────────────────────────────────────

async function buildTask(
  taskDir: string,
  slug: string,
  withContent = false,
): Promise<ProgressTask | null> {
  const rootFileName = await detectRootFile(taskDir);
  if (!rootFileName) return null;

  const rootFilePath = join(taskDir, rootFileName);
  let frontmatter: Record<string, unknown>;
  let content: string;

  try {
    const result = await readFrontmatter(rootFilePath);
    ({ frontmatter, content } = result);
  } catch {
    return null;
  }

  // Derived directory checks
  const researchFile = join(taskDir, 'research', 'research.md');
  const planFile = join(taskDir, 'plans', 'plan.md');
  const tasksDir = join(taskDir, 'tasks');

  const [hasResearch, hasPlan, teamTaskCount] = await Promise.all([
    fileExists(researchFile),
    fileExists(planFile),
    countFiles(tasksDir, /^task-\d+.*\.md$/),
  ]);

  const hasTeamTasks = teamTaskCount > 0;

  // Status reconciliation — bump if directory has more progress than frontmatter says
  let status: ProgressStatus = isProgressStatus(frontmatter.status)
    ? frontmatter.status
    : 'backlog';

  if (hasResearch) {
    status = maxStatus(status, 'research_done');
  }
  if (hasPlan) {
    status = maxStatus(status, 'plan_ready');
  }
  if (hasTeamTasks) {
    status = maxStatus(status, 'executing');
  }

  const task: ProgressTask = {
    slug,
    rootFile: rootFileName,
    title: asString(frontmatter.title) || slug,
    description: asString(frontmatter.description),
    status,
    priority: isProgressPriority(frontmatter.priority) ? frontmatter.priority : 'normal',
    jiraTicket: asOptionalString(frontmatter.jiraTicket),
    jiraUrl: asOptionalString(frontmatter.jiraUrl),
    prNumber: asOptionalNumber(frontmatter.prNumber),
    prUrl: asOptionalString(frontmatter.prUrl),
    prStatus: asOptionalString(frontmatter.prStatus),
    workflow: asOptionalString(frontmatter.workflow),
    workflowPhase: asOptionalString(frontmatter.workflowPhase),
    createdAt: asString(frontmatter.createdAt) || new Date().toISOString(),
    updatedAt: asString(frontmatter.updatedAt) || new Date().toISOString(),
    hasResearch,
    hasPlan,
    hasTeamTasks,
    teamTaskCount,
  };

  if (withContent) {
    if (hasResearch) {
      try {
        task.researchContent = await readFile(researchFile, 'utf-8');
      } catch {
        // Ignore — optional content
      }
    }
    if (hasPlan) {
      try {
        task.planContent = await readFile(planFile, 'utf-8');
      } catch {
        // Ignore — optional content
      }
    }
  }

  // Attach long-form markdown body as description if frontmatter description is empty
  if (!task.description && content.trim().length > 0) {
    task.description = content.trim();
  }

  return task;
}

// ─── Event Emitter ────────────────────────────────────────────

function createEmitter<T extends unknown[]>(): {
  emit: (...args: T) => void;
  on: (listener: (...args: T) => void) => () => void;
  clear: () => void;
} {
  const listeners: Array<(...args: T) => void> = [];

  return {
    emit(...args: T): void {
      for (const fn of listeners) {
        fn(...args);
      }
    },
    on(listener: (...args: T) => void): () => void {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    },
    clear(): void {
      listeners.length = 0;
    },
  };
}

// ─── Active Session Tracking ──────────────────────────────────

interface ActiveSession {
  sessionId: string;
  action: string;
}

// ─── Summary Instruction Builder ─────────────────────────────

function buildSummaryInstruction(summarySpec: { maxChars: number; tableFields: string[] }): string {
  return `\n\nIMPORTANT: Include a \`<!-- summary -->\` section at the top of your output with: a synopsis paragraph (max ${String(summarySpec.maxChars)} characters) and a key-facts table with columns: ${summarySpec.tableFields.join(', ')}. Wrap it in \`<!-- summary -->\` / \`<!-- /summary -->\` HTML comment markers.`;
}

// ─── Factory ─────────────────────────────────────────────────

export function createProgressService(
  projectPath: string,
  agentManagerService: AgentManagerService,
): ProgressService {
  const progressDir = join(projectPath, 'progress');
  const archivedDir = join(progressDir, 'archived');

  // Active sessions: slug → { sessionId, action }
  const activeSessions = new Map<string, ActiveSession>();

  // Events
  const taskUpdated = createEmitter<[string, ProgressTask]>();
  const taskCreated = createEmitter<[string, ProgressTask]>();
  const taskArchived = createEmitter<[string]>();
  const actionStarted = createEmitter<[string, string, string]>();
  const actionCompleted = createEmitter<[string, string]>();
  const actionFailed = createEmitter<[string, string, string]>();
  const workflowStep = createEmitter<[string, string, string]>();

  // FS watcher state
  let fsWatcher: FSWatcher | null = null;
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // ─── Directory Initialization ────────────────────────────────

  async function ensureProgressDir(): Promise<void> {
    await mkdir(progressDir, { recursive: true });
    await mkdir(archivedDir, { recursive: true });
  }

  // ─── Task Scanning ────────────────────────────────────────────

  async function scanDir(dir: string): Promise<ProgressTask[]> {
    await mkdir(dir, { recursive: true });

    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return [];
    }

    const tasks: ProgressTask[] = [];

    for (const entry of entries) {
      if (entry === 'archived') continue;

      const taskDir = join(dir, entry);
      try {
        const s = await stat(taskDir);
        if (!s.isDirectory()) continue;
      } catch {
        continue;
      }

      const task = await buildTask(taskDir, entry, false);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  // ─── File Watcher ─────────────────────────────────────────────

  function scheduleUpdate(slug: string): void {
    const existing = debounceTimers.get(slug);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      debounceTimers.delete(slug);

      const taskDir = join(progressDir, slug);

      void (async () => {
        try {
          const task = await buildTask(taskDir, slug, false);
          if (task) {
            taskUpdated.emit(slug, task);
          }
        } catch (err: unknown) {
          serviceLogger.warn(
            `[ProgressService] Failed to re-read task after FS change: ${slug}`,
            err instanceof Error ? err.message : String(err),
          );
        }
      })();
    }, 200);

    debounceTimers.set(slug, timer);
  }

  function startWatcher(): void {
    try {
      fsWatcher = watch(progressDir, { recursive: false }, (_eventType, filename) => {
        if (!filename || filename === 'archived') return;

        // filename could be a slug subdirectory or a file inside one
        const slug = filename.split('/')[0].split('\\')[0];
        if (slug) {
          scheduleUpdate(slug);
        }
      });

      fsWatcher.on('error', (err: Error) => {
        serviceLogger.warn(`[ProgressService] FS watcher error:`, err.message);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      serviceLogger.warn(`[ProgressService] Failed to start FS watcher: ${message}`);
    }
  }

  // ─── Session Spawning Helpers ─────────────────────────────────

  function handleSessionEnd(
    slug: string,
    action: string,
    exitCode: number | null,
  ): void {
    activeSessions.delete(slug);

    if (exitCode === null || exitCode === 0) {
      actionCompleted.emit(slug, action);

      void (async () => {
        try {
          const taskDir = join(progressDir, slug);
          const task = await buildTask(taskDir, slug, false);
          if (task) {
            taskUpdated.emit(slug, task);
          }
        } catch {
          // Ignore post-session reconciliation errors
        }
      })();
    } else {
      const errorMsg = `Session exited with code ${String(exitCode)}`;
      actionFailed.emit(slug, action, errorMsg);
    }
  }

  function spawnAndTrack(
    slug: string,
    action: string,
    prompt: string,
  ): { sessionId: string } {
    // Subscribe to events BEFORE spawning to avoid race condition where
    // a fast session ends before the listener is registered.
    let targetSessionId: string | null = null;
    let handled = false;

    const unsubscribe = agentManagerService.onEvent((event) => {
      if (handled) return;
      if (targetSessionId === null || event.sessionId !== targetSessionId) return;
      if (event.type !== 'session.ended') return;

      handled = true;
      unsubscribe();

      const data = event.data as { code?: number | null } | null;
      const exitCode = data?.code ?? null;
      handleSessionEnd(slug, action, exitCode);
    });

    const session = agentManagerService.spawnProjectOwner({
      projectPath,
      prompt,
      name: `progress-${action}-${slug}`,
    });

    targetSessionId = session.id;
    activeSessions.set(slug, { sessionId: session.id, action });
    actionStarted.emit(slug, action, session.id);

    // Check if session already ended during spawn (safety net).
    // Since we subscribed before spawning, the event listener covers
    // the normal case. This catches edge cases where getSession already
    // shows a terminal status but the event hasn't dispatched yet.
    const currentStatus = agentManagerService.getSession(session.id)?.status;
    if (currentStatus === 'completed' || currentStatus === 'failed') {
      handled = true;
      unsubscribe();
      const exitCode = currentStatus === 'completed' ? 0 : 1;
      handleSessionEnd(slug, action, exitCode);
    }

    return { sessionId: session.id };
  }

  // ─── Bootstrap ────────────────────────────────────────────────

  // Ensure progress dir exists and start watcher on first use
  let initPromise: Promise<void> | null = null;

  function init(): Promise<void> {
    initPromise ??= (async () => {
      await ensureProgressDir();
      startWatcher();
    })();
    return initPromise;
  }

  // ─── Public API ───────────────────────────────────────────────

  const service: ProgressService = {
    async listTasks(): Promise<ProgressTask[]> {
      await init();
      return await scanDir(progressDir);
    },

    async getTask(slug: string): Promise<ProgressTask | null> {
      await init();
      const taskDir = join(progressDir, slug);
      const exists = await directoryExists(taskDir);
      if (!exists) return null;
      return await buildTask(taskDir, slug, true);
    },

    async createTask(
      slug: string,
      title: string,
      description: string,
      priority: ProgressPriority = 'normal',
    ): Promise<ProgressTask> {
      await init();

      const taskDir = join(progressDir, slug);
      await mkdir(taskDir, { recursive: true });

      const now = new Date().toISOString();
      const frontmatter: Record<string, unknown> = {
        title,
        description,
        status: 'backlog' as ProgressStatus,
        priority,
        createdAt: now,
        updatedAt: now,
      };

      const rootFilePath = join(taskDir, 'task.md');
      await writeFrontmatter(rootFilePath, frontmatter, '');

      const task = await buildTask(taskDir, slug, false);
      if (!task) {
        throw new Error(`Failed to read task after creation: ${slug}`);
      }

      taskCreated.emit(slug, task);
      return task;
    },

    async updateTask(
      slug: string,
      updates: Partial<
        Pick<
          ProgressTask,
          | 'title'
          | 'description'
          | 'status'
          | 'priority'
          | 'jiraTicket'
          | 'jiraUrl'
          | 'prNumber'
          | 'prUrl'
          | 'prStatus'
          | 'workflow'
          | 'workflowPhase'
        >
      >,
    ): Promise<ProgressTask> {
      await init();

      const taskDir = join(progressDir, slug);
      const rootFileName = await detectRootFile(taskDir);
      if (!rootFileName) {
        throw new Error(`Task not found: ${slug}`);
      }

      const rootFilePath = join(taskDir, rootFileName);
      const { frontmatter, content } = await readFrontmatter(rootFilePath);

      const now = new Date().toISOString();
      // Spread updates but exclude keys explicitly set to undefined
      const updatesEntries = Object.entries(updates as Record<string, unknown>).filter(
        ([, v]) => v !== undefined,
      );
      const updated: Record<string, unknown> = {
        ...frontmatter,
        ...Object.fromEntries(updatesEntries),
        updatedAt: now,
      };

      await writeFrontmatter(rootFilePath, updated, content);

      const task = await buildTask(taskDir, slug, false);
      if (!task) {
        throw new Error(`Failed to read task after update: ${slug}`);
      }

      taskUpdated.emit(slug, task);
      return task;
    },

    async archiveTask(slug: string): Promise<void> {
      await init();
      await mkdir(archivedDir, { recursive: true });

      const src = join(progressDir, slug);
      const dest = join(archivedDir, slug);

      await rename(src, dest);
      taskArchived.emit(slug);
    },

    async deleteTask(slug: string): Promise<void> {
      await init();
      const taskDir = join(progressDir, slug);
      await rm(taskDir, { recursive: true, force: true });
    },

    async listArchived(): Promise<ProgressTask[]> {
      await init();
      return await scanDir(archivedDir);
    },

    async startResearch(slug: string, customPrompt?: string): Promise<{ sessionId: string }> {
      await init();

      const task = await service.getTask(slug);
      if (!task) throw new Error(`Task not found: ${slug}`);

      await service.updateTask(slug, { status: 'researching' });

      const researchOutPath = `progress/${slug}/research/research.md`;
      const defaultResearchPrompt =
        `Deep research on "${task.title}". ` +
        `Read existing files in progress/${slug}/. ` +
        `Write a comprehensive research document to ${researchOutPath}. ` +
        `Include background, technical analysis, risks, and recommendations.`;

      const defaultSummarySpec = { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] };
      const summaryInstruction = buildSummaryInstruction(defaultSummarySpec);
      const fullPrompt = (customPrompt ?? defaultResearchPrompt) + summaryInstruction;

      return spawnAndTrack(slug, 'research', fullPrompt);
    },

    async createPlan(slug: string, customPrompt?: string): Promise<{ sessionId: string }> {
      await init();

      const task = await service.getTask(slug);
      if (!task) throw new Error(`Task not found: ${slug}`);

      await service.updateTask(slug, { status: 'planning' });

      const researchPath = `progress/${slug}/research/research.md`;
      const planOutPath = `progress/${slug}/plans/plan.md`;
      const defaultPlanPrompt =
        `Read the research document at ${researchPath}. ` +
        `Create a detailed, actionable implementation plan at ${planOutPath}. ` +
        `Include numbered tasks suitable for agent execution, file scope, and acceptance criteria.`;

      const defaultSummarySpec = { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] };
      const summaryInstruction = buildSummaryInstruction(defaultSummarySpec);
      const fullPrompt = (customPrompt ?? defaultPlanPrompt) + summaryInstruction;

      return spawnAndTrack(slug, 'plan', fullPrompt);
    },

    async spinUpTeam(slug: string, customPrompt?: string): Promise<{ sessionId: string; action: string }> {
      await init();

      const task = await service.getTask(slug);
      if (!task) throw new Error(`Task not found: ${slug}`);

      const planPath = join(projectPath, 'progress', slug, 'plans', 'plan.md');
      const hasPlanFile = await fileExists(planPath);

      const defaultPrompt = hasPlanFile
        ? `Read the implementation plan at progress/${slug}/plans/plan.md. ` +
          `Decompose it into task files under progress/${slug}/tasks/. ` +
          `Then spawn agent workers to execute each task sequentially or in parallel as appropriate.`
        : `Implement the feature described in progress/${slug}/task.md. ` +
          `Create task files under progress/${slug}/tasks/ and execute them.`;

      const { sessionId } = spawnAndTrack(slug, 'team', customPrompt ?? defaultPrompt);
      return { sessionId, action: 'team' };
    },

    async runWorkflow(slug: string, templateId?: string): Promise<{ started: true }> {
      await init();

      const runStep = async (): Promise<void> => {
        const task = await service.getTask(slug);
        if (!task) throw new Error(`Task not found: ${slug}`);

        // Record workflow template and starting phase
        await service.updateTask(slug, {
          workflow: templateId ?? 'default',
          workflowPhase: 'research',
        });

        if (!task.hasResearch) {
          workflowStep.emit(slug, 'research', 'started');
          try {
            await service.startResearch(slug);
            workflowStep.emit(slug, 'research', 'completed');
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            workflowStep.emit(slug, 'research', 'failed');
            await service.updateTask(slug, { status: 'error' });
            throw new Error(`Research step failed: ${message}`);
          }
          return;
        }

        if (!task.hasPlan) {
          await service.updateTask(slug, { workflowPhase: 'planning' });
          workflowStep.emit(slug, 'plan', 'started');
          try {
            await service.createPlan(slug);
            workflowStep.emit(slug, 'plan', 'completed');
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            workflowStep.emit(slug, 'plan', 'failed');
            await service.updateTask(slug, { status: 'error' });
            throw new Error(`Plan step failed: ${message}`);
          }
          return;
        }

        if (!task.hasTeamTasks) {
          await service.updateTask(slug, { workflowPhase: 'implementation' });
          workflowStep.emit(slug, 'team', 'started');
          try {
            await service.spinUpTeam(slug);
            workflowStep.emit(slug, 'team', 'completed');
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            workflowStep.emit(slug, 'team', 'failed');
            await service.updateTask(slug, { status: 'error' });
            throw new Error(`Team step failed: ${message}`);
          }
        }
      };

      // Fire and forget — workflow runs asynchronously
      void runStep().catch((err: unknown) => {
        serviceLogger.error(
          `[ProgressService] runWorkflow error for ${slug}:`,
          err instanceof Error ? err.message : String(err),
        );
      });

      return { started: true };
    },

    cancelAction(slug: string): Promise<{ success: boolean }> {
      const active = activeSessions.get(slug);
      if (!active) {
        return Promise.resolve({ success: false });
      }

      const stopped = agentManagerService.stopSession(active.sessionId);
      if (stopped) {
        activeSessions.delete(slug);
        actionCompleted.emit(slug, active.action);
      }

      return Promise.resolve({ success: stopped });
    },

    async runLogCleanup(): Promise<{ deletedFiles: number }> {
      await init();
      return await runLogCleanupFn(progressDir);
    },

    onTaskUpdated(listener: (slug: string, task: ProgressTask) => void): () => void {
      return taskUpdated.on(listener);
    },

    onTaskCreated(listener: (slug: string, task: ProgressTask) => void): () => void {
      return taskCreated.on(listener);
    },

    onTaskArchived(listener: (slug: string) => void): () => void {
      return taskArchived.on(listener);
    },

    onActionStarted(
      listener: (slug: string, action: string, sessionId: string) => void,
    ): () => void {
      return actionStarted.on(listener);
    },

    onActionCompleted(listener: (slug: string, action: string) => void): () => void {
      return actionCompleted.on(listener);
    },

    onActionFailed(
      listener: (slug: string, action: string, error: string) => void,
    ): () => void {
      return actionFailed.on(listener);
    },

    onWorkflowStep(
      listener: (slug: string, step: string, status: string) => void,
    ): () => void {
      return workflowStep.on(listener);
    },

    dispose(): void {
      // Clear all debounce timers
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();

      // Close FS watcher
      if (fsWatcher) {
        fsWatcher.close();
        fsWatcher = null;
      }

      // Clear all event listeners
      taskUpdated.clear();
      taskCreated.clear();
      taskArchived.clear();
      actionStarted.clear();
      actionCompleted.clear();
      actionFailed.clear();
      workflowStep.clear();

      serviceLogger.info('[ProgressService] Disposed');
    },
  };

  return service;
}
