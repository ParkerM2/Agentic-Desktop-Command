/**
 * WorkflowEngine — Core State Machine
 *
 * Manages multi-agent feature development workflows as a typed state machine.
 * States: IDLE -> PREFLIGHT -> PLAN -> SETUP -> SPAWNING -> QA_GATE -> GUARDIAN -> FINALIZING -> DONE|ERROR
 *
 * Each engine instance is session-scoped: a unique runId per start() call.
 * State is serialized after every transition for crash recovery.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { desc, eq, inArray } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import type { AgentDefinition } from '@shared/ipc/workflow-engine';
import type { WorkflowTemplate } from '@shared/ipc/workflow-templates';

import { workflowRuns } from '../../../db/schema';
import { workflowRunsSummary } from '../workflow-runs-summary-schema';

import { runFinalizing } from './states/finalize';
import { runGuardian } from './states/guardian';
import { runPlan } from './states/plan';
import { runPreflight } from './states/preflight';
import { runQaGate } from './states/qa-gate';
import { runSetup } from './states/setup';
import { runSpawning } from './states/spawn';
import { VALID_TRANSITIONS, WorkflowState } from './types';

import type {
  WorkflowEngineDeps,
  WorkflowEngineRecord,
  WorkflowEngineService,
  WorkflowRunConfig,
  WorkflowRuntimeRecord,
} from './types';
import type { AdcDatabase } from '../../../db';

// ─── In-memory augmented record ──────────────────────────────

/** Extended record with runtime-only fields (not serialized to IPC) */
interface EngineRuntimeRecord extends WorkflowRuntimeRecord {
  aborted: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

function assertValidTransition(from: WorkflowState, to: WorkflowState): void {
  const allowed = VALID_TRANSITIONS.get(from) ?? [];
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid state transition: ${from} -> ${to}. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }
}

/** Upsert a workflow run record into SQLite via Drizzle. */
function saveRecord(db: AdcDatabase, record: WorkflowEngineRecord): void {
  try {
    const now = new Date().toISOString();
    db.insert(workflowRuns)
      .values({
        runId: record.runId,
        featureName: record.featureName,
        state: record.state,
        config: record.config as unknown,
        resolvedAgents: null,
        error: record.errorMessage ?? null,
        startedAt: record.startedAt,
        updatedAt: now,
        completedAt: record.state === WorkflowState.DONE ? now : null,
      })
      .onConflictDoUpdate({
        target: workflowRuns.runId,
        set: {
          state: record.state,
          config: record.config as unknown,
          error: record.errorMessage ?? null,
          updatedAt: now,
          completedAt: record.state === WorkflowState.DONE ? now : null,
        },
      })
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[WorkflowEngine] Failed to save state for ${record.runId}: ${message}`);
  }
}

/** Load a single workflow run record from SQLite. */
function loadRecord(db: AdcDatabase, runId: string): WorkflowEngineRecord | null {
  const row = db.select().from(workflowRuns).where(eq(workflowRuns.runId, runId)).get();
  if (!row) return null;
  return rowToRecord(row);
}

/** Convert a Drizzle row to a WorkflowEngineRecord. */
function rowToRecord(row: typeof workflowRuns.$inferSelect): WorkflowEngineRecord {
  return {
    runId: row.runId,
    featureName: row.featureName,
    state: row.state as WorkflowState,
    config: (row.config ?? {}) as WorkflowRunConfig,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    errorMessage: row.error ?? null,
    qaRound: 0, // not persisted — runtime only
    stateFilePath: '', // legacy field — no longer used
  };
}

/**
 * Migrate existing JSON state files into SQLite.
 * Scans `<progressBaseDir>/workflow-engine/*.json` and inserts each into the table.
 * Already-existing runIds are skipped (onConflictDoNothing).
 */
function migrateFromJson(db: AdcDatabase, progressBaseDir: string): void {
  const engineDir = join(progressBaseDir, 'workflow-engine');
  if (!existsSync(engineDir)) return;

  const jsonFiles = readdirSync(engineDir).filter((f) => f.endsWith('.json'));
  if (jsonFiles.length === 0) return;

  console.warn(`[WorkflowEngine] Migrating ${jsonFiles.length} JSON state files to SQLite...`);

  for (const file of jsonFiles) {
    try {
      const content = readFileSync(join(engineDir, file), 'utf-8');
      const parsed = JSON.parse(content) as WorkflowEngineRecord;
      db.insert(workflowRuns)
        .values({
          runId: parsed.runId,
          featureName: parsed.featureName,
          state: parsed.state,
          config: parsed.config as unknown,
          resolvedAgents: null,
          error: parsed.errorMessage ?? null,
          startedAt: parsed.startedAt,
          updatedAt: parsed.updatedAt,
          completedAt: parsed.state === WorkflowState.DONE ? parsed.updatedAt : null,
        })
        .onConflictDoUpdate({
          target: workflowRuns.runId,
          set: { updatedAt: parsed.updatedAt },
        })
        .run();
    } catch {
      // Skip corrupt files
    }
  }

  // Also migrate archive directory
  const archiveDir = join(engineDir, 'archive');
  if (existsSync(archiveDir)) {
    const archiveFiles = readdirSync(archiveDir).filter((f) => f.endsWith('.json'));
    for (const file of archiveFiles) {
      try {
        const content = readFileSync(join(archiveDir, file), 'utf-8');
        const parsed = JSON.parse(content) as WorkflowEngineRecord;
        db.insert(workflowRuns)
          .values({
            runId: parsed.runId,
            featureName: parsed.featureName,
            state: parsed.state,
            config: parsed.config as unknown,
            resolvedAgents: null,
            error: parsed.errorMessage ?? null,
            startedAt: parsed.startedAt,
            updatedAt: parsed.updatedAt,
            completedAt: parsed.state === WorkflowState.DONE ? parsed.updatedAt : null,
          })
          .onConflictDoUpdate({
            target: workflowRuns.runId,
            set: { updatedAt: parsed.updatedAt },
          })
          .run();
      } catch {
        // Skip corrupt files
      }
    }
  }

  console.warn(`[WorkflowEngine] JSON migration complete.`);
}

/**
 * Write the resolved template snapshot to disk so the engine can reconstruct
 * its configuration after a crash without re-reading the live template.
 */
function writeResolvedSnapshot(
  progressBaseDir: string,
  featureName: string,
  snapshot: WorkflowRunConfig,
): void {
  const dir = join(progressBaseDir, featureName);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, 'resolved-template.json');
  writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

/**
 * Three-layer merge: template defaults → user overrides → runtime values.
 *
 * Layer 1 (lowest priority) — template fields mapped to WorkflowRunConfig defaults:
 *   branching.useWorktrees, branching.workPrefix, qa.maxRounds,
 *   team.enableGuardian, permissions.allowCreatePr
 *
 * Layer 2 — caller-supplied overrides (any WorkflowRunConfig fields except
 *   featureName, projectPath, templateId — those are runtime-authoritative).
 *
 * Layer 3 (highest priority) — runtime values: featureName, projectPath,
 *   templateId. These always win and cannot be overridden by the caller.
 */
function mergeRunConfig(
  template: WorkflowTemplate,
  featureName: string,
  projectPath: string,
  overrides: Record<string, unknown>,
): WorkflowRunConfig {
  // Layer 1: template defaults
  const fromTemplate: Omit<WorkflowRunConfig, 'featureName' | 'projectPath' | 'templateId'> = {
    useWorktrees: template.branching.useWorktrees,
    branchPrefix: template.branching.workPrefix,
    maxQaRounds: template.qa.maxRounds,
    useGuardian: template.team.enableGuardian,
    createPr: template.permissions.allowCreatePr,
    overrides: {},
  };

  // Layer 2: user overrides (only well-typed fields; unknown keys land in overrides.*)
  const useWorktrees =
    typeof overrides.useWorktrees === 'boolean'
      ? overrides.useWorktrees
      : fromTemplate.useWorktrees;
  const branchPrefix =
    typeof overrides.branchPrefix === 'string'
      ? overrides.branchPrefix
      : fromTemplate.branchPrefix;
  const maxQaRounds =
    typeof overrides.maxQaRounds === 'number'
      ? overrides.maxQaRounds
      : fromTemplate.maxQaRounds;
  const useGuardian =
    typeof overrides.useGuardian === 'boolean'
      ? overrides.useGuardian
      : fromTemplate.useGuardian;
  const createPr =
    typeof overrides.createPr === 'boolean' ? overrides.createPr : fromTemplate.createPr;

  // Remaining entries in overrides are passed through for future extensibility
  const passthrough: Record<string, unknown> = {};
  const knownKeys = new Set(['useWorktrees', 'branchPrefix', 'maxQaRounds', 'useGuardian', 'createPr']);
  for (const [key, value] of Object.entries(overrides)) {
    if (!knownKeys.has(key)) {
      passthrough[key] = value;
    }
  }

  // Layer 3: runtime — always wins
  return {
    featureName,
    projectPath,
    templateId: template.id,
    useWorktrees,
    branchPrefix,
    maxQaRounds,
    useGuardian,
    createPr,
    overrides: passthrough,
  };
}

function toPublicRecord(runtime: EngineRuntimeRecord): WorkflowEngineRecord {
  return {
    runId: runtime.runId,
    featureName: runtime.featureName,
    state: runtime.state,
    config: runtime.config,
    startedAt: runtime.startedAt,
    updatedAt: runtime.updatedAt,
    errorMessage: runtime.errorMessage,
    qaRound: runtime.qaRound,
    stateFilePath: runtime.stateFilePath,
  };
}

// ─── Factory ──────────────────────────────────────────────────

export function createWorkflowEngineModule(deps: WorkflowEngineDeps): WorkflowEngineService {
  const { db, busSessionManager, gitService, progressBaseDir } = deps;

  // Run one-time migration from JSON files on startup
  migrateFromJson(db, progressBaseDir);

  /** All engine records, keyed by runId */
  const engines = new Map<string, EngineRuntimeRecord>();

  function writeRunSummary(
    runtime: EngineRuntimeRecord,
    status: 'passed' | 'failed' | 'cancelled',
    errorMessage?: string | null,
  ): void {
    try {
      const id = runtime.runId;
      const now = Date.now();
      // WorkflowRunConfig has no projectId — fall back to projectPath which uniquely
      // identifies the project on the local device.
      const projectId = runtime.config.projectPath;
      const startedAtMs = Date.parse(runtime.startedAt);
      const startedAt = Number.isNaN(startedAtMs) ? now : startedAtMs;
      const summaryText = errorMessage ?? null;
      const ranOnPeerId = deps.replicationEngine.getLocalPeerId();

      db.insert(workflowRunsSummary)
        .values({
          id,
          projectId,
          taskId: null,
          workflowId: runtime.config.templateId ?? null,
          status,
          startedAt,
          finishedAt: now,
          summary: summaryText,
          ranOnPeerId,
        })
        .onConflictDoUpdate({
          target: workflowRunsSummary.id,
          set: {
            status,
            finishedAt: now,
            summary: summaryText,
          },
        })
        .run();

      deps.replicationEngine.recordLocalWrite({
        tableName: 'workflow_runs_summary',
        pk: id,
        opType: 'insert',
        columns: {
          id,
          project_id: projectId,
          task_id: null,
          workflow_id: runtime.config.templateId ?? null,
          status,
          started_at: startedAt,
          finished_at: now,
          summary: summaryText,
          ran_on_peer_id: ranOnPeerId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[WorkflowEngine] writeRunSummary failed for ${runtime.runId}: ${message}`);
    }
  }

  function transition(
    runtime: EngineRuntimeRecord,
    nextState: WorkflowState,
    errorMessage: string | null = null,
  ): void {
    const previousState = runtime.state;
    assertValidTransition(previousState, nextState);

    runtime.state = nextState;
    runtime.updatedAt = new Date().toISOString();
    runtime.errorMessage = errorMessage;

    if (nextState === WorkflowState.QA_GATE && previousState === WorkflowState.SPAWNING) {
      runtime.qaRound += 1;
    }

    // Persist to SQLite after every transition for crash recovery
    saveRecord(db, runtime);

    // Dual-write workflow_runs_summary on terminal states so peers learn the
    // outcome via replication (Phase 4 — Task 2).
    if (nextState === WorkflowState.DONE && previousState !== WorkflowState.DONE) {
      writeRunSummary(runtime, 'passed');
    } else if (nextState === WorkflowState.ERROR && previousState !== WorkflowState.ERROR) {
      writeRunSummary(runtime, 'failed', errorMessage);
    }

    deps.onStateChanged({
      runId: runtime.runId,
      featureName: runtime.featureName,
      previousState,
      newState: nextState,
      timestamp: runtime.updatedAt,
      errorMessage,
    });
  }

  async function stepEngine(runtime: EngineRuntimeRecord): Promise<WorkflowState | null> {
    const currentState = runtime.state;

    switch (currentState) {
      case WorkflowState.PREFLIGHT: {
        return await runPreflight(runtime, gitService);
      }
      case WorkflowState.PLAN: {
        const { nextState, wavePlan } = runPlan(runtime, runtime.config.projectPath);
        runtime.wavePlan = wavePlan;
        return nextState;
      }
      case WorkflowState.SETUP: {
        return await runSetup(runtime, gitService);
      }
      case WorkflowState.SPAWNING: {
        return await runSpawning(runtime, busSessionManager);
      }
      case WorkflowState.QA_GATE: {
        return await runQaGate(runtime, busSessionManager);
      }
      case WorkflowState.GUARDIAN: {
        return await runGuardian(runtime, busSessionManager);
      }
      case WorkflowState.FINALIZING: {
        return await runFinalizing(runtime, gitService);
      }
      case WorkflowState.IDLE:
      case WorkflowState.DONE:
      case WorkflowState.ERROR: {
        // Terminal / pre-start states — not driven
        return null;
      }
    }
  }

  async function driveEngine(runtime: EngineRuntimeRecord): Promise<void> {
    while (
      !runtime.aborted &&
      runtime.state !== WorkflowState.DONE &&
      runtime.state !== WorkflowState.ERROR
    ) {
      const currentState = runtime.state;

      try {
        const nextState = await stepEngine(runtime);
        if (nextState === null) {
          // IDLE hit during drive — should not occur but exit gracefully
          console.warn(`[WorkflowEngine] Null nextState for state ${currentState}: ${runtime.runId}`);
          return;
        }

        transition(runtime, nextState);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[WorkflowEngine] Error in state ${currentState} for ${runtime.runId}: ${message}`);

        transition(runtime, WorkflowState.ERROR, message);

        deps.onError({
          runId: runtime.runId,
          featureName: runtime.featureName,
          state: currentState,
          errorMessage: message,
          timestamp: new Date().toISOString(),
        });

        return;
      }
    }

    if (runtime.state === WorkflowState.DONE) {
      deps.onCompleted({
        runId: runtime.runId,
        featureName: runtime.featureName,
        timestamp: runtime.updatedAt,
      });
    }
  }

  return {
    applyTemplate(
      templateId: string,
      featureName: string,
      projectPath: string,
      overrides: Record<string, unknown>,
    ): string {
      // Validate template exists — throws if not found
      const template = deps.templateService.get(templateId);

      // Resolve three-layer merge
      const resolvedConfig = mergeRunConfig(template, featureName, projectPath, overrides);

      // Snapshot to .claude/progress/<featureName>/resolved-template.json
      writeResolvedSnapshot(progressBaseDir, featureName, resolvedConfig);

      console.warn(
        `[WorkflowEngine] applyTemplate: template=${templateId}, feature=${featureName}, snapshot written`,
      );

      // Start engine from snapshot — engine never re-reads the live template
      return this.start(resolvedConfig);
    },

    start(config: WorkflowRunConfig): string {
      const runId = uuid();
      const now = new Date().toISOString();

      const runtime: EngineRuntimeRecord = {
        runId,
        featureName: config.featureName,
        state: WorkflowState.IDLE,
        config,
        startedAt: now,
        updatedAt: now,
        errorMessage: null,
        qaRound: 0,
        stateFilePath: '', // legacy — no longer used
        wavePlan: null,
        aborted: false,
        claudeMdBySlug: new Map(),
        verdictsByTaskSlug: new Map(),
      };

      engines.set(runId, runtime);

      // Transition IDLE -> PREFLIGHT and start async drive
      transition(runtime, WorkflowState.PREFLIGHT);

      void driveEngine(runtime);

      console.warn(`[WorkflowEngine] Started run ${runId} for feature: ${config.featureName}`);

      return runId;
    },

    stop(runId: string): { success: boolean; message: string } {
      const runtime = engines.get(runId);
      if (!runtime) {
        return { success: false, message: `Engine not found: ${runId}` };
      }

      if (runtime.state === WorkflowState.DONE || runtime.state === WorkflowState.ERROR) {
        return { success: false, message: `Engine already finished in state: ${runtime.state}` };
      }

      runtime.aborted = true;

      deps.onError({
        runId: runtime.runId,
        featureName: runtime.featureName,
        state: runtime.state,
        errorMessage: 'Engine stopped by user',
        timestamp: new Date().toISOString(),
      });

      transition(runtime, WorkflowState.ERROR, 'Engine stopped by user');

      return { success: true, message: `Engine ${runId} stopped` };
    },

    get(runId: string): WorkflowEngineRecord | undefined {
      const runtime = engines.get(runId);
      if (runtime) return toPublicRecord(runtime);
      // Fall back to SQLite for completed/crashed runs
      return loadRecord(db, runId) ?? undefined;
    },

    list(): WorkflowEngineRecord[] {
      return [...engines.values()].map(toPublicRecord);
    },

    listArchived(): WorkflowEngineRecord[] {
      const rows = db
        .select()
        .from(workflowRuns)
        .where(inArray(workflowRuns.state, [WorkflowState.DONE, WorkflowState.ERROR]))
        .orderBy(desc(workflowRuns.updatedAt))
        .all();
      return rows.map(rowToRecord);
    },

    async listAgentDefinitions(): Promise<AgentDefinition[]> {
      const agentsDir = join(progressBaseDir, '..', '.claude', 'agents');
      let entries: string[];

      try {
        const dirents = await readdir(agentsDir, { withFileTypes: true });
        entries = dirents
          .filter((d) => d.isFile() && d.name.endsWith('.md'))
          .map((d) => d.name);
      } catch {
        // agents directory may not exist in all environments
        return [];
      }

      const definitions: AgentDefinition[] = [];

      for (const filename of entries) {
        const slug = basename(filename, '.md');
        const filePath = join(agentsDir, filename);

        let content: string;
        try {
          content = readFileSync(filePath, 'utf-8');
        } catch {
          continue;
        }

        // Parse name from first H1: "# Some Name"
        const h1Match = /^#\s+(.+)$/m.exec(content);
        const name = h1Match ? h1Match[1].trim() : slug;

        // Parse description from first blockquote line: "> some text"
        const quoteMatch = /^>\s+(.+)$/m.exec(content);
        const description = quoteMatch ? quoteMatch[1].trim() : '';

        definitions.push({ slug, name, description, path: filePath });
      }

      return definitions.sort((a, b) => a.slug.localeCompare(b.slug));
    },
  };
}

// Re-export service factory under original name for backward compat
export { createWorkflowEngineModule as createWorkflowEngineService };

export type {
  WorkflowEngineDeps,
  WorkflowEngineRecord,
  WorkflowEngineService,
  WorkflowRunConfig,
  WorkflowRuntimeRecord,
  WorkflowStateChangedEvent,
  WorkflowCompletedEvent,
  WorkflowErrorEvent,
} from './types';

export { VALID_TRANSITIONS, WorkflowState } from './types';
