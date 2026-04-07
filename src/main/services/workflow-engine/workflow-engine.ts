/**
 * WorkflowEngine — Core State Machine
 *
 * Manages multi-agent feature development workflows as a typed state machine.
 * States: IDLE -> PREFLIGHT -> PLAN -> SETUP -> SPAWNING -> QA_GATE -> GUARDIAN -> FINALIZING -> DONE|ERROR
 *
 * Each engine instance is session-scoped: a unique runId per start() call.
 * State is serialized after every transition for crash recovery.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { v4 as uuid } from 'uuid';

import { runPlan } from './states/plan';
import { runPreflight } from './states/preflight';
import { VALID_TRANSITIONS, WorkflowState } from './types';

import type {
  WavePlan,
  WorkflowEngineDeps,
  WorkflowEngineRecord,
  WorkflowEngineService,
  WorkflowRunConfig,
} from './types';

// ─── In-memory augmented record ──────────────────────────────

/** Extended record with runtime-only fields (not serialized to IPC) */
interface EngineRuntimeRecord extends WorkflowEngineRecord {
  wavePlan: WavePlan | null;
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

// ─── State stubs (tasks 4 + 6 own full implementations) ──────

function runSetup(record: WorkflowEngineRecord): Promise<WorkflowState> {
  // Full implementation in Task #4 (context-injection)
  console.warn(`[WorkflowEngine/SETUP] Stub — runId: ${record.runId}`);
  return Promise.resolve(WorkflowState.SPAWNING);
}

function runSpawning(record: WorkflowEngineRecord): Promise<WorkflowState> {
  // Full implementation in Task #4 (context-injection)
  console.warn(`[WorkflowEngine/SPAWNING] Stub — runId: ${record.runId}`);
  return Promise.resolve(WorkflowState.QA_GATE);
}

function runQaGate(record: WorkflowEngineRecord): Promise<WorkflowState> {
  // Full implementation in Task #6 (verdicts-cleanup)
  console.warn(`[WorkflowEngine/QA_GATE] Stub — round ${record.qaRound}, runId: ${record.runId}`);
  return Promise.resolve(WorkflowState.GUARDIAN);
}

function runGuardian(record: WorkflowEngineRecord): Promise<WorkflowState> {
  // Full implementation in Task #6 (verdicts-cleanup)
  console.warn(`[WorkflowEngine/GUARDIAN] Stub — runId: ${record.runId}`);
  return Promise.resolve(WorkflowState.FINALIZING);
}

function runFinalizing(record: WorkflowEngineRecord): Promise<WorkflowState> {
  // Full implementation in Task #6 (verdicts-cleanup)
  console.warn(`[WorkflowEngine/FINALIZING] Stub — runId: ${record.runId}`);
  return Promise.resolve(WorkflowState.DONE);
}

// ─── Factory ──────────────────────────────────────────────────

export function createWorkflowEngineService(deps: WorkflowEngineDeps): WorkflowEngineService {
  const { agentOrchestrator: _agentOrchestrator, gitService, progressBaseDir } = deps;

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
        return await runSetup(runtime);
      }
      case WorkflowState.SPAWNING: {
        return await runSpawning(runtime);
      }
      case WorkflowState.QA_GATE: {
        return await runQaGate(runtime);
      }
      case WorkflowState.GUARDIAN: {
        return await runGuardian(runtime);
      }
      case WorkflowState.FINALIZING: {
        return await runFinalizing(runtime);
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
  };
}
