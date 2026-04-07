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

import { v4 as uuid } from 'uuid';

import type { AgentDefinition } from '@shared/ipc/workflow-engine';
import type { WorkflowTemplate } from '@shared/ipc/workflow-templates';

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

function serializeRecord(record: WorkflowEngineRecord): void {
  try {
    const dir = join(record.stateFilePath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(record.stateFilePath, JSON.stringify(record, null, 2), 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[WorkflowEngine] Failed to serialize state for ${record.runId}: ${message}`);
  }
}

function buildStateFilePath(progressBaseDir: string, runId: string): string {
  return join(progressBaseDir, 'workflow-engine', `${runId}.json`);
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

export function createWorkflowEngineService(deps: WorkflowEngineDeps): WorkflowEngineService {
  const { agentOrchestrator, gitService, progressBaseDir } = deps;

  /** All engine records, keyed by runId */
  const engines = new Map<string, EngineRuntimeRecord>();

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

    // Serialize after every transition for crash recovery
    serializeRecord(runtime);

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
        return await runSpawning(runtime, agentOrchestrator);
      }
      case WorkflowState.QA_GATE: {
        return await runQaGate(runtime, agentOrchestrator);
      }
      case WorkflowState.GUARDIAN: {
        return await runGuardian(runtime, agentOrchestrator);
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
      const stateFilePath = buildStateFilePath(progressBaseDir, runId);

      const runtime: EngineRuntimeRecord = {
        runId,
        featureName: config.featureName,
        state: WorkflowState.IDLE,
        config,
        startedAt: now,
        updatedAt: now,
        errorMessage: null,
        qaRound: 0,
        stateFilePath,
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
      return runtime ? toPublicRecord(runtime) : undefined;
    },

    list(): WorkflowEngineRecord[] {
      return [...engines.values()].map(toPublicRecord);
    },

    listArchived(): WorkflowEngineRecord[] {
      const archiveDir = join(progressBaseDir, 'workflow-engine', 'archive');
      if (!existsSync(archiveDir)) return [];

      const files = readdirSync(archiveDir).filter((f) => f.endsWith('.json'));
      const records: WorkflowEngineRecord[] = [];

      for (const file of files) {
        try {
          const content = readFileSync(join(archiveDir, file), 'utf-8');
          const parsed = JSON.parse(content) as WorkflowEngineRecord;
          records.push(parsed);
        } catch {
          // Skip corrupt files
        }
      }

      return records.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
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
