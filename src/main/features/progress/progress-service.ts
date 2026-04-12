/**
 * Progress Service
 *
 * SQLite-backed service that manages task metadata in the `progress_tasks`
 * table while keeping markdown files under `progress/` for content and
 * agent consumption.
 *
 * Each task lives at `progress/<slug>/` and has a root markdown file
 * (task.md | description.md | ticket.md) with YAML frontmatter.
 * SQLite is the primary metadata index; the filesystem stays in sync.
 */

import { watch } from 'node:fs';
import { access, mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { eq, ne } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';
import type { ProgressPriority, ProgressStatus, ProgressTask } from '@shared/types/progress';

import type { AdcDatabase } from '@main/db';
import { progressTasks } from '@main/db/schema';
import { serviceLogger } from '@main/lib/logger';

import { runLogCleanup as runLogCleanupFn } from './log-cleanup';
import { detectRootFile, readFrontmatter, writeFrontmatter } from './task-file-io';

import type { AgentManager } from '../../agent-host/agent-host-client';
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
    id?: string,
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
        | 'lastSessionId'
        | 'lastAgentName'
        | 'completedAt'
        | 'archivedAt'
        | 'teamName'
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

function reconcileStatus(
  raw: unknown,
  hasResearch: boolean,
  hasPlan: boolean,
  hasTeamTasks: boolean,
): ProgressStatus {
  let status: ProgressStatus = isProgressStatus(raw) ? raw : 'backlog';

  if (hasResearch) status = maxStatus(status, 'research_done');
  if (hasPlan) status = maxStatus(status, 'plan_ready');
  if (hasTeamTasks) status = maxStatus(status, 'executing');

  return status;
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

function parseSessionHistory(
  raw: unknown,
): Array<{
  sessionId: string;
  agentName: string;
  action: string;
  exitCode: number | null;
  timestamp: string;
}> | undefined {
  if (!Array.isArray(raw)) return undefined;

  return (raw as Array<Record<string, unknown>>).map((s) => ({
    sessionId: asString(s.sessionId),
    agentName: asString(s.agentName),
    action: asString(s.action),
    exitCode: typeof s.exitCode === 'number' ? s.exitCode : null,
    timestamp: asString(s.timestamp),
  }));
}

async function extractTeamName(
  tasksDir: string,
): Promise<string | undefined> {
  try {
    const taskFiles = await readdir(tasksDir);
    const firstTask = taskFiles.find((f) => f.endsWith('.md'));
    if (firstTask) {
      const { frontmatter: taskFm } = await readFrontmatter(join(tasksDir, firstTask));
      return asOptionalString(taskFm.teamName);
    }
  } catch {
    // teamName is optional
  }
  return undefined;
}

// ─── Path Constants ──────────────────────────────────────────

const RESEARCH_MD = 'research.md';
const PLAN_MD = 'plan.md';

// ─── Directory Helpers ────────────────────────────────────────

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

// ─── SQLite ↔ Filesystem Migration ───────────────────────────

async function migrateFromFilesystem(db: AdcDatabase, projectPath: string): Promise<void> {
  const progressDir = join(projectPath, 'progress');

  let entries: string[];
  try {
    entries = await readdir(progressDir);
  } catch {
    return; // progress/ doesn't exist yet — nothing to migrate
  }

  for (const entry of entries) {
    if (entry === 'archived') continue;

    const taskDir = join(progressDir, entry);
    try {
      const s = await stat(taskDir);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }

    // Skip if already in SQLite
    const existing = db.select({ slug: progressTasks.slug })
      .from(progressTasks)
      .where(eq(progressTasks.slug, entry))
      .all();
    if (existing.length > 0) continue;

    // Build task from filesystem to get reconciled metadata
    const task = await buildTask(taskDir, entry, false);
    if (!task) continue;

    const now = new Date().toISOString();
    db.insert(progressTasks).values({
      slug: task.slug,
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      jiraKey: task.jiraTicket ?? null,
      jiraUrl: task.jiraUrl ?? null,
      prUrl: task.prUrl ?? null,
      prNumber: task.prNumber ?? null,
      prStatus: task.prStatus ?? null,
      lastSessionId: task.lastSessionId ?? null,
      lastAgentName: task.lastAgentName ?? null,
      completedAt: task.completedAt ?? null,
      archivedAt: task.archivedAt ?? null,
      teamName: task.teamName ?? null,
      sessionHistory: task.sessionHistory ?? null,
      description: task.description || null,
      createdAt: task.createdAt || now,
      updatedAt: task.updatedAt || now,
    }).run();
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
  const researchFile = join(taskDir, 'research', RESEARCH_MD);
  const planFile = join(taskDir, 'plans', PLAN_MD);
  const tasksDir = join(taskDir, 'tasks');

  const [hasResearch, hasPlan, teamTaskCount] = await Promise.all([
    fileExists(researchFile),
    fileExists(planFile),
    countFiles(tasksDir, /^task-\d+.*\.md$/),
  ]);

  const hasTeamTasks = teamTaskCount > 0;

  // Extract teamName from first team task file if present
  const teamNameFromTasks = hasTeamTasks
    ? await extractTeamName(tasksDir)
    : undefined;

  // Status reconciliation — bump if directory has more progress than frontmatter says
  const status = reconcileStatus(frontmatter.status, hasResearch, hasPlan, hasTeamTasks);

  const task: ProgressTask = {
    id: asOptionalString(frontmatter.id) ?? generateId(),
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
    lastSessionId: asOptionalString(frontmatter.lastSessionId),
    lastAgentName: asOptionalString(frontmatter.lastAgentName),
    completedAt: asOptionalString(frontmatter.completedAt),
    archivedAt: asOptionalString(frontmatter.archivedAt),
    teamName: asOptionalString(frontmatter.teamName) ?? teamNameFromTasks,
    sessionHistory: parseSessionHistory(frontmatter.sessionHistory),
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

// ─── SQLite Row → ProgressTask Converter ──────────────────────

function rowToTask(
  row: typeof progressTasks.$inferSelect,
  derived: {
    rootFile: string;
    hasResearch: boolean;
    hasPlan: boolean;
    hasTeamTasks: boolean;
    teamTaskCount: number;
    researchContent?: string;
    planContent?: string;
  },
): ProgressTask {
  return {
    id: row.id ?? row.slug,
    slug: row.slug,
    rootFile: derived.rootFile,
    title: row.title,
    description: row.description ?? '',
    status: row.status as ProgressStatus,
    priority: row.priority as ProgressPriority,
    jiraTicket: row.jiraKey ?? undefined,
    jiraUrl: row.jiraUrl ?? undefined,
    prUrl: row.prUrl ?? undefined,
    prNumber: row.prNumber ?? undefined,
    prStatus: row.prStatus ?? undefined,
    lastSessionId: row.lastSessionId ?? undefined,
    lastAgentName: row.lastAgentName ?? undefined,
    completedAt: row.completedAt ?? undefined,
    archivedAt: row.archivedAt ?? undefined,
    teamName: row.teamName ?? undefined,
    sessionHistory: Array.isArray(row.sessionHistory)
      ? (row.sessionHistory as ProgressTask['sessionHistory'])
      : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hasResearch: derived.hasResearch,
    hasPlan: derived.hasPlan,
    hasTeamTasks: derived.hasTeamTasks,
    teamTaskCount: derived.teamTaskCount,
    researchContent: derived.researchContent,
    planContent: derived.planContent,
  };
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
  agentManagerService: AgentManager,
  db: AdcDatabase,
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
            // Sync filesystem changes back to SQLite
            db.update(progressTasks)
              .set({
                title: task.title,
                status: task.status,
                priority: task.priority,
                description: task.description || null,
                lastSessionId: task.lastSessionId ?? null,
                lastAgentName: task.lastAgentName ?? null,
                completedAt: task.completedAt ?? null,
                teamName: task.teamName ?? null,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(progressTasks.slug, slug))
              .run();

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
    const session = activeSessions.get(slug);
    const sessionId = session?.sessionId ?? 'unknown';
    activeSessions.delete(slug);

    // Persist session metadata to SQLite + frontmatter (best-effort, async)
    void (async () => {
      try {
        const agentName = `progress-${action}-${slug}`;
        const now = new Date().toISOString();
        const historyEntry = {
          sessionId,
          agentName,
          action,
          exitCode,
          timestamp: now,
        };

        // Update SQLite — append to session history, update metadata
        const rows = db.select().from(progressTasks)
          .where(eq(progressTasks.slug, slug))
          .all();
        if (rows.length > 0) {
          const row = rows[0];
          const history = Array.isArray(row.sessionHistory)
            ? [...row.sessionHistory]
            : [];
          history.push(historyEntry);
          while (history.length > 20) history.shift();

          const dbUpdates: Record<string, unknown> = {
            lastSessionId: sessionId,
            lastAgentName: agentName,
            sessionHistory: history,
            updatedAt: now,
          };
          if (exitCode === null || exitCode === 0) {
            dbUpdates.completedAt = now;
          }

          db.update(progressTasks)
            .set(dbUpdates)
            .where(eq(progressTasks.slug, slug))
            .run();
        }

        // Also sync to frontmatter
        const taskDir = join(progressDir, slug);
        const rootFileName = await detectRootFile(taskDir);
        if (rootFileName) {
          const rootFilePath = join(taskDir, rootFileName);
          const { frontmatter, content } = await readFrontmatter(rootFilePath);

          frontmatter.lastSessionId = sessionId;
          frontmatter.lastAgentName = agentName;
          frontmatter.updatedAt = now;

          const fmHistory = Array.isArray(frontmatter.sessionHistory)
            ? [...(frontmatter.sessionHistory as unknown[])]
            : [];
          fmHistory.push(historyEntry);
          while (fmHistory.length > 20) fmHistory.shift();
          frontmatter.sessionHistory = fmHistory;

          if (exitCode === null || exitCode === 0) {
            frontmatter.completedAt = now;
          }

          await writeFrontmatter(rootFilePath, frontmatter, content);
        }
      } catch {
        // Best-effort — don't block event emission
      }
    })();

    // Existing event emission logic
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

  async function spawnAndTrack(
    slug: string,
    action: string,
    prompt: string,
  ): Promise<{ sessionId: string }> {
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

    const session = await agentManagerService.spawnProjectOwner({
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
      await migrateFromFilesystem(db, projectPath);
      startWatcher();
    })();
    return initPromise;
  }

  // ─── Public API ───────────────────────────────────────────────

  const service: ProgressService = {
    async listTasks(): Promise<ProgressTask[]> {
      await init();

      const rows = db.select().from(progressTasks)
        .where(ne(progressTasks.status, 'archived'))
        .all();

      const tasks: ProgressTask[] = [];
      for (const row of rows) {
        const taskDir = join(progressDir, row.slug);
        const rootFileName = await detectRootFile(taskDir).catch(() => null);
        if (!rootFileName) continue; // filesystem dir gone — skip

        const researchFile = join(taskDir, 'research', RESEARCH_MD);
        const planFile = join(taskDir, 'plans', PLAN_MD);
        const tasksDir = join(taskDir, 'tasks');
        const [hasResearch, hasPlan, teamTaskCount] = await Promise.all([
          fileExists(researchFile),
          fileExists(planFile),
          countFiles(tasksDir, /^task-\d+.*\.md$/),
        ]);

        tasks.push(rowToTask(row, {
          rootFile: rootFileName,
          hasResearch,
          hasPlan,
          hasTeamTasks: teamTaskCount > 0,
          teamTaskCount,
        }));
      }

      return tasks;
    },

    async getTask(slug: string): Promise<ProgressTask | null> {
      await init();

      const rows = db.select().from(progressTasks)
        .where(eq(progressTasks.slug, slug))
        .all();
      if (rows.length === 0) return null;
      const row = rows[0];

      const taskDir = join(progressDir, slug);
      const rootFileName = await detectRootFile(taskDir).catch(() => null);
      if (!rootFileName) return null;

      const researchFile = join(taskDir, 'research', RESEARCH_MD);
      const planFile = join(taskDir, 'plans', PLAN_MD);
      const tasksDir = join(taskDir, 'tasks');
      const [hasResearch, hasPlan, teamTaskCount] = await Promise.all([
        fileExists(researchFile),
        fileExists(planFile),
        countFiles(tasksDir, /^task-\d+.*\.md$/),
      ]);

      let researchContent: string | undefined;
      let planContent: string | undefined;
      if (hasResearch) {
        try { researchContent = await readFile(researchFile, 'utf-8'); } catch { /* optional */ }
      }
      if (hasPlan) {
        try { planContent = await readFile(planFile, 'utf-8'); } catch { /* optional */ }
      }

      const task = rowToTask(row, {
        rootFile: rootFileName,
        hasResearch,
        hasPlan,
        hasTeamTasks: teamTaskCount > 0,
        teamTaskCount,
        researchContent,
        planContent,
      });

      // Fill description from markdown body if SQLite description is empty
      if (!task.description) {
        try {
          const { content } = await readFrontmatter(join(taskDir, rootFileName));
          if (content.trim().length > 0) {
            task.description = content.trim();
          }
        } catch { /* ignore */ }
      }

      return task;
    },

    async createTask(
      slug: string,
      title: string,
      description: string,
      priority: ProgressPriority = 'normal',
      id?: string,
    ): Promise<ProgressTask> {
      await init();

      const now = new Date().toISOString();
      const resolvedId = id ?? generateId();

      // 1. Insert into SQLite
      db.insert(progressTasks).values({
        slug,
        id: resolvedId,
        title,
        status: 'backlog',
        priority,
        description: description || null,
        createdAt: now,
        updatedAt: now,
      }).run();

      // 2. Create filesystem directory + markdown file
      const taskDir = join(progressDir, slug);
      await mkdir(taskDir, { recursive: true });

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

      // 3. Build task from SQLite row
      const task: ProgressTask = {
        id: resolvedId,
        slug,
        rootFile: 'task.md',
        title,
        description,
        status: 'backlog',
        priority,
        createdAt: now,
        updatedAt: now,
        hasResearch: false,
        hasPlan: false,
        hasTeamTasks: false,
        teamTaskCount: 0,
      };

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
          | 'lastSessionId'
          | 'lastAgentName'
          | 'completedAt'
          | 'archivedAt'
          | 'teamName'
        >
      >,
    ): Promise<ProgressTask> {
      await init();

      const now = new Date().toISOString();

      // 1. Build SQLite column updates (map ProgressTask fields → column names)
      const dbUpdates: Record<string, unknown> = { updatedAt: now };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.jiraTicket !== undefined) dbUpdates.jiraKey = updates.jiraTicket;
      if (updates.jiraUrl !== undefined) dbUpdates.jiraUrl = updates.jiraUrl;
      if (updates.prUrl !== undefined) dbUpdates.prUrl = updates.prUrl;
      if (updates.prNumber !== undefined) dbUpdates.prNumber = updates.prNumber;
      if (updates.prStatus !== undefined) dbUpdates.prStatus = updates.prStatus;
      if (updates.lastSessionId !== undefined) dbUpdates.lastSessionId = updates.lastSessionId;
      if (updates.lastAgentName !== undefined) dbUpdates.lastAgentName = updates.lastAgentName;
      if (updates.completedAt !== undefined) dbUpdates.completedAt = updates.completedAt;
      if (updates.archivedAt !== undefined) dbUpdates.archivedAt = updates.archivedAt;
      if (updates.teamName !== undefined) dbUpdates.teamName = updates.teamName;

      db.update(progressTasks)
        .set(dbUpdates)
        .where(eq(progressTasks.slug, slug))
        .run();

      // 2. Also rewrite frontmatter so filesystem stays in sync
      const taskDir = join(progressDir, slug);
      const rootFileName = await detectRootFile(taskDir);
      if (rootFileName) {
        const rootFilePath = join(taskDir, rootFileName);
        try {
          const { frontmatter, content } = await readFrontmatter(rootFilePath);
          const updatesEntries = Object.entries(updates as Record<string, unknown>).filter(
            ([, v]) => v !== undefined,
          );
          const updated: Record<string, unknown> = {
            ...frontmatter,
            ...Object.fromEntries(updatesEntries),
            updatedAt: now,
          };
          await writeFrontmatter(rootFilePath, updated, content);
        } catch {
          // Best-effort — SQLite is authoritative
        }
      }

      // 3. Re-read from SQLite + filesystem for response
      const task = await service.getTask(slug);
      if (!task) {
        throw new Error(`Failed to read task after update: ${slug}`);
      }

      taskUpdated.emit(slug, task);
      return task;
    },

    async archiveTask(slug: string): Promise<void> {
      await init();
      const now = new Date().toISOString();

      // 1. Update SQLite
      db.update(progressTasks)
        .set({ status: 'archived', archivedAt: now, updatedAt: now })
        .where(eq(progressTasks.slug, slug))
        .run();

      // 2. Stamp frontmatter and move directory
      await mkdir(archivedDir, { recursive: true });
      const src = join(progressDir, slug);
      const dest = join(archivedDir, slug);

      const rootFileName = await detectRootFile(src);
      if (rootFileName) {
        const rootFilePath = join(src, rootFileName);
        try {
          const { frontmatter, content } = await readFrontmatter(rootFilePath);
          frontmatter.archivedAt = now;
          frontmatter.status = 'archived';
          await writeFrontmatter(rootFilePath, frontmatter, content);
        } catch {
          // Best-effort — still archive even if frontmatter write fails
        }
      }

      await rename(src, dest);
      taskArchived.emit(slug);
    },

    async deleteTask(slug: string): Promise<void> {
      await init();

      // 1. Delete from SQLite
      db.delete(progressTasks)
        .where(eq(progressTasks.slug, slug))
        .run();

      // 2. Remove filesystem directory
      const taskDir = join(progressDir, slug);
      await rm(taskDir, { recursive: true, force: true });
    },

    async listArchived(): Promise<ProgressTask[]> {
      await init();

      const rows = db.select().from(progressTasks)
        .where(eq(progressTasks.status, 'archived'))
        .all();

      const tasks: ProgressTask[] = [];
      for (const row of rows) {
        // Archived tasks live under archived/ dir
        const taskDir = join(archivedDir, row.slug);
        const rootFileName = await detectRootFile(taskDir).catch(() => null);
        if (!rootFileName) continue;

        const researchFile = join(taskDir, 'research', RESEARCH_MD);
        const planFile = join(taskDir, 'plans', PLAN_MD);
        const tasksDir = join(taskDir, 'tasks');
        const [hasResearch, hasPlan, teamTaskCount] = await Promise.all([
          fileExists(researchFile),
          fileExists(planFile),
          countFiles(tasksDir, /^task-\d+.*\.md$/),
        ]);

        tasks.push(rowToTask(row, {
          rootFile: rootFileName,
          hasResearch,
          hasPlan,
          hasTeamTasks: teamTaskCount > 0,
          teamTaskCount,
        }));
      }

      return tasks;
    },

    async startResearch(slug: string, customPrompt?: string): Promise<{ sessionId: string }> {
      await init();

      const task = await service.getTask(slug);
      if (!task) throw new Error(`Task not found: ${slug}`);

      await service.updateTask(slug, { status: 'researching' });

      // Ensure research subdirectory exists before spawning agent
      await mkdir(join(progressDir, slug, 'research'), { recursive: true });

      const researchOutPath = `progress/${slug}/research/research.md`;
      const defaultResearchPrompt =
        `Deep research on "${task.title}". ` +
        `Read existing files in progress/${slug}/. ` +
        `Write a comprehensive research document to ${researchOutPath}. ` +
        `Include background, technical analysis, risks, and recommendations.`;

      const defaultSummarySpec = { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] };
      const summaryInstruction = buildSummaryInstruction(defaultSummarySpec);
      const fullPrompt = (customPrompt ?? defaultResearchPrompt) + summaryInstruction;

      return await spawnAndTrack(slug, 'research', fullPrompt);
    },

    async createPlan(slug: string, customPrompt?: string): Promise<{ sessionId: string }> {
      await init();

      const task = await service.getTask(slug);
      if (!task) throw new Error(`Task not found: ${slug}`);

      await service.updateTask(slug, { status: 'planning' });

      // Ensure plans subdirectory exists before spawning agent
      await mkdir(join(progressDir, slug, 'plans'), { recursive: true });

      const researchPath = `progress/${slug}/research/research.md`;
      const planOutPath = `progress/${slug}/plans/plan.md`;
      const defaultPlanPrompt =
        `Read the research document at ${researchPath}. ` +
        `Create a detailed, actionable implementation plan at ${planOutPath}. ` +
        `Include numbered tasks suitable for agent execution, file scope, and acceptance criteria.`;

      const defaultSummarySpec = { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] };
      const summaryInstruction = buildSummaryInstruction(defaultSummarySpec);
      const fullPrompt = (customPrompt ?? defaultPlanPrompt) + summaryInstruction;

      return await spawnAndTrack(slug, 'plan', fullPrompt);
    },

    async spinUpTeam(slug: string, customPrompt?: string): Promise<{ sessionId: string; action: string }> {
      await init();

      const task = await service.getTask(slug);
      if (!task) throw new Error(`Task not found: ${slug}`);

      // Ensure tasks subdirectory exists before spawning team
      await mkdir(join(progressDir, slug, 'tasks'), { recursive: true });

      const planPath = join(projectPath, 'progress', slug, 'plans', 'plan.md');
      const hasPlanFile = await fileExists(planPath);

      const defaultPrompt = hasPlanFile
        ? `Read the implementation plan at progress/${slug}/plans/plan.md. ` +
          `Decompose it into task files under progress/${slug}/tasks/. ` +
          `Then spawn agent workers to execute each task sequentially or in parallel as appropriate.`
        : `Implement the feature described in progress/${slug}/task.md. ` +
          `Create task files under progress/${slug}/tasks/ and execute them.`;

      const { sessionId } = await spawnAndTrack(slug, 'team', customPrompt ?? defaultPrompt);
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
