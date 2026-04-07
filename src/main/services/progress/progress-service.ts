/**
 * Progress Service
 *
 * Filesystem-backed service that manages tasks in the `progress/` directory.
 * Provides CRUD operations, status reconciliation, agent session spawning,
 * and real-time file watching with event emission.
 *
 * Each task lives at `progress/<slug>/` and has a root markdown file
 * (task.md | description.md | ticket.md) with YAML frontmatter.
 *
 * TODO: Replace local ProgressTask / ProgressStatus / ProgressPriority types
 * with `@shared/types/progress` once Task 1 is merged.
 */

import { watch } from 'node:fs';
import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { serviceLogger } from '@main/lib/logger';

import { detectRootFile, readFrontmatter, writeFrontmatter } from './task-file-io';

import type { AgentManagerService } from '../agent-manager/agent-manager-service';
import type { FSWatcher } from 'node:fs';

// ─── Temporary Local Types ────────────────────────────────────
// TODO: Replace with `import type { ProgressTask, ProgressStatus, ProgressPriority }
//       from '@shared/types/progress'` once Task 1 is merged.

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

  // Derived from directory contents
  hasResearch: boolean;
  hasPlan: boolean;
  hasTeamTasks: boolean;
  teamTaskCount: number;

  // Content (populated on getTask, not listTasks)
  researchContent?: string;
  planContent?: string;
}

// ─── Service Interface ────────────────────────────────────────

export interface ProgressService {
  listTasks(): Promise<ProgressTask[]>;
  getTask(slug: string): Promise<ProgressTask | null>;
  createTask(
    slug: string,
    title: string,
    description: string,
    priority?: ProgressPriority,
  ): Promise<ProgressTask>;
  updateTask(
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
      >
    >,
  ): Promise<ProgressTask>;
  archiveTask(slug: string): Promise<void>;
  deleteTask(slug: string): Promise<void>;
  listArchived(): Promise<ProgressTask[]>;
  startResearch(slug: string): Promise<{ sessionId: string }>;
  createPlan(slug: string): Promise<{ sessionId: string }>;
  spinUpTeam(slug: string): Promise<{ sessionId: string; action: string }>;
  runWorkflow(slug: string): Promise<{ started: true }>;
  cancelAction(slug: string): Promise<{ success: boolean }>;
  onTaskUpdated(listener: (slug: string, task: ProgressTask) => void): () => void;
  onTaskCreated(listener: (slug: string, task: ProgressTask) => void): () => void;
  onTaskArchived(listener: (slug: string) => void): () => void;
  onActionStarted(
    listener: (slug: string, action: string, sessionId: string) => void,
  ): () => void;
  onActionCompleted(listener: (slug: string, action: string) => void): () => void;
  onActionFailed(listener: (slug: string, action: string, error: string) => void): () => void;
  onWorkflowStep(listener: (slug: string, step: string, status: string) => void): () => void;
  dispose(): void;
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
    frontmatter = result.frontmatter;
    content = result.content;
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

  // Attach long-form markdown body as part of description if present and description is empty
  if (!task.description && content.trim().length > 0) {
    task.description = content.trim();
  }

  return task;
}

// ─── Event Emitter ────────────────────────────────────────────

type ListenerMap<T extends unknown[]> = Map<string, Array<(...args: T) => void>>;

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

// Suppress unused variable warning — ListenerMap is kept for documentation clarity
const _unusedListenerMap: ListenerMap<[string]> | null = null;
void _unusedListenerMap;

// ─── Active Session Tracking ──────────────────────────────────

interface ActiveSession {
  sessionId: string;
  action: string;
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
      buildTask(taskDir, slug, false)
        .then((task) => {
          if (task) {
            taskUpdated.emit(slug, task);
          }
        })
        .catch((err: unknown) => {
          serviceLogger.warn(
            `[ProgressService] Failed to re-read task after FS change: ${slug}`,
            err instanceof Error ? err.message : String(err),
          );
        });
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

      fsWatcher.on('error', (err) => {
        serviceLogger.warn(`[ProgressService] FS watcher error:`, err.message);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      serviceLogger.warn(`[ProgressService] Failed to start FS watcher: ${message}`);
    }
  }

  // ─── Session Spawning Helpers ─────────────────────────────────

  function spawnAndTrack(
    slug: string,
    action: string,
    prompt: string,
  ): { sessionId: string } {
    const session = agentManagerService.spawnProjectOwner({
      projectPath,
      prompt,
      name: `progress-${action}-${slug}`,
    });

    activeSessions.set(slug, { sessionId: session.id, action });
    actionStarted.emit(slug, action, session.id);

    // Listen for session end to reconcile status
    const unsubscribe = agentManagerService.onEvent((event) => {
      if (event.sessionId !== session.id) return;
      if (event.type !== 'session.ended') return;

      unsubscribe();
      activeSessions.delete(slug);

      const data = event.data as { code?: number | null } | null;
      const exitCode = data?.code ?? null;

      if (exitCode === 0 || exitCode === null) {
        actionCompleted.emit(slug, action);

        const taskDir = join(progressDir, slug);
        buildTask(taskDir, slug, false)
          .then((task) => {
            if (task) {
              taskUpdated.emit(slug, task);
            }
          })
          .catch(() => {
            // Ignore post-session reconciliation errors
          });
      } else {
        const errorMsg = `Session exited with code ${String(exitCode)}`;
        actionFailed.emit(slug, action, errorMsg);
      }
    });

    return { sessionId: session.id };
  }

  // ─── Bootstrap ────────────────────────────────────────────────

  // Ensure progress dir exists and start watcher on first use
  let initPromise: Promise<void> | null = null;

  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = ensureProgressDir().then(() => {
        startWatcher();
      });
    }
    return initPromise;
  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    async listTasks(): Promise<ProgressTask[]> {
      await init();
      return scanDir(progressDir);
    },

    async getTask(slug: string): Promise<ProgressTask | null> {
      await init();
      const taskDir = join(progressDir, slug);
      const exists = await directoryExists(taskDir);
      if (!exists) return null;
      return buildTask(taskDir, slug, true);
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
      const updated: Record<string, unknown> = {
        ...frontmatter,
        ...Object.fromEntries(
          Object.entries(updates).filter(([, v]) => v !== undefined),
        ),
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
      return scanDir(archivedDir);
    },

    async startResearch(slug: string): Promise<{ sessionId: string }> {
      await init();

      const task = await this.getTask(slug);
      if (!task) throw new Error(`Task not found: ${slug}`);

      await this.updateTask(slug, { status: 'researching' });

      const researchOutPath = `progress/${slug}/research/research.md`;
      const prompt =
        `Deep research on "${task.title}". ` +
        `Read existing files in progress/${slug}/. ` +
        `Write a comprehensive research document to ${researchOutPath}. ` +
        `Include background, technical analysis, risks, and recommendations.`;

      return spawnAndTrack(slug, 'research', prompt);
    },

    async createPlan(slug: string): Promise<{ sessionId: string }> {
      await init();

      const task = await this.getTask(slug);
      if (!task) throw new Error(`Task not found: ${slug}`);

      await this.updateTask(slug, { status: 'planning' });

      const researchPath = `progress/${slug}/research/research.md`;
      const planOutPath = `progress/${slug}/plans/plan.md`;
      const prompt =
        `Read the research document at ${researchPath}. ` +
        `Create a detailed, actionable implementation plan at ${planOutPath}. ` +
        `Include numbered tasks suitable for agent execution, file scope, and acceptance criteria.`;

      return spawnAndTrack(slug, 'plan', prompt);
    },

    async spinUpTeam(slug: string): Promise<{ sessionId: string; action: string }> {
      await init();

      const task = await this.getTask(slug);
      if (!task) throw new Error(`Task not found: ${slug}`);

      const planPath = join(projectPath, 'progress', slug, 'plans', 'plan.md');
      const hasPlanFile = await fileExists(planPath);

      const prompt = hasPlanFile
        ? `Read the implementation plan at progress/${slug}/plans/plan.md. ` +
          `Decompose it into task files under progress/${slug}/tasks/. ` +
          `Then spawn agent workers to execute each task sequentially or in parallel as appropriate.`
        : `Implement the feature described in progress/${slug}/task.md. ` +
          `Create task files under progress/${slug}/tasks/ and execute them.`;

      const { sessionId } = spawnAndTrack(slug, 'team', prompt);
      return { sessionId, action: 'team' };
    },

    async runWorkflow(slug: string): Promise<{ started: true }> {
      await init();

      const startStep = async (): Promise<void> => {
        const task = await this.getTask(slug);
        if (!task) throw new Error(`Task not found: ${slug}`);

        if (!task.hasResearch) {
          workflowStep.emit(slug, 'research', 'started');
          try {
            await this.startResearch(slug);
            workflowStep.emit(slug, 'research', 'completed');
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            workflowStep.emit(slug, 'research', 'failed');
            await this.updateTask(slug, { status: 'error' });
            throw new Error(`Research step failed: ${message}`);
          }
          return;
        }

        if (!task.hasPlan) {
          workflowStep.emit(slug, 'plan', 'started');
          try {
            await this.createPlan(slug);
            workflowStep.emit(slug, 'plan', 'completed');
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            workflowStep.emit(slug, 'plan', 'failed');
            await this.updateTask(slug, { status: 'error' });
            throw new Error(`Plan step failed: ${message}`);
          }
          return;
        }

        if (!task.hasTeamTasks) {
          workflowStep.emit(slug, 'team', 'started');
          try {
            await this.spinUpTeam(slug);
            workflowStep.emit(slug, 'team', 'completed');
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            workflowStep.emit(slug, 'team', 'failed');
            await this.updateTask(slug, { status: 'error' });
            throw new Error(`Team step failed: ${message}`);
          }
        }
      };

      // Fire and forget — workflow runs asynchronously
      startStep().catch((err: unknown) => {
        serviceLogger.error(
          `[ProgressService] runWorkflow error for ${slug}:`,
          err instanceof Error ? err.message : String(err),
        );
      });

      return { started: true };
    },

    async cancelAction(slug: string): Promise<{ success: boolean }> {
      const active = activeSessions.get(slug);
      if (!active) {
        return { success: false };
      }

      const stopped = agentManagerService.stopSession(active.sessionId);
      if (stopped) {
        activeSessions.delete(slug);
        actionCompleted.emit(slug, active.action);
      }

      return { success: stopped };
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
}
