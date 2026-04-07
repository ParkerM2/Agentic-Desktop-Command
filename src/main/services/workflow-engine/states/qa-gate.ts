/**
 * QA_GATE State Handler
 *
 * Waits for all agents in the current wave to complete, then reads their
 * structured QA verdicts from JSONL progress files.
 *
 * Verdict format (written by QA agents to their progress JSONL):
 *   {"type":"qa.verdict","data":{"passed":true,"taskId":"...","issues":[],"round":1}}
 *
 * Decision logic:
 *   - All tasks passed  → GUARDIAN (or SPAWNING if useGuardian is false)
 *   - Any task failed + round < maxQaRounds → SPAWNING (retry)
 *   - Any task failed + round >= maxQaRounds → ERROR (hard fail)
 *
 * No free-text interpretation. Only structured JSONL verdicts count.
 */

import { existsSync, readFileSync } from 'node:fs';

import { QaVerdictEntrySchema } from '@shared/ipc/workflow-engine/verdict-schemas';
import type { QaVerdict } from '@shared/ipc/workflow-engine/verdict-schemas';

import { WorkflowState } from '../types';

import type { AgentOrchestrator, AgentSession } from '../../agent-orchestrator/types';
import type { WorkflowRuntimeRecord } from '../types';

// ─── Constants ────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_WAIT_MS = 30 * 60 * 1_000; // 30 minutes

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Resolves the progress JSONL file path for a task session.
 * AgentOrchestrator writes progress to `<progressDir>/<taskId>.jsonl`.
 */
function resolveProgressFile(session: AgentSession): string {
  return session.progressFile;
}

/**
 * Reads a JSONL file and returns all parsed lines (invalid lines skipped).
 */
function readJsonlLines(filePath: string): unknown[] {
  if (!existsSync(filePath)) return [];

  const raw = readFileSync(filePath, 'utf-8');
  const lines: unknown[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    try {
      lines.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines
    }
  }

  return lines;
}

/**
 * Finds the most recent qa.verdict entry in a JSONL progress file.
 * Returns null if no verdict has been written yet.
 */
function findLatestQaVerdict(progressFile: string): QaVerdict | null {
  const lines = readJsonlLines(progressFile);

  // Scan in reverse to find the most recent verdict
  for (let i = lines.length - 1; i >= 0; i--) {
    const parsed = QaVerdictEntrySchema.safeParse(lines[i]);
    if (parsed.success) {
      return parsed.data.data;
    }
  }

  return null;
}

/**
 * Returns true when the agent session is in a terminal state
 * (completed or error — not still running).
 */
function isSessionTerminal(session: AgentSession): boolean {
  return session.status === 'completed' || session.status === 'error' || session.status === 'killed';
}

/**
 * Polls until all sessions for the current wave tasks are terminal,
 * or until the timeout elapses.
 */
async function waitForAllSessions(
  taskSlugs: string[],
  agentOrchestrator: AgentOrchestrator,
  timeoutMs: number,
): Promise<Map<string, AgentSession | null>> {
  const deadline = Date.now() + timeoutMs;
  const result = new Map<string, AgentSession | null>();

  while (Date.now() < deadline) {
    let allDone = true;

    for (const slug of taskSlugs) {
      const session = agentOrchestrator.getSessionByTaskId(slug) ?? null;

      if (session === null || !isSessionTerminal(session)) {
        allDone = false;
      } else {
        result.set(slug, session);
      }
    }

    if (allDone) break;

    // Wait before next poll
    await new Promise<void>((resolve) => {
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
  }

  // Fill in any still-missing sessions as null
  for (const slug of taskSlugs) {
    if (!result.has(slug)) {
      result.set(slug, agentOrchestrator.getSessionByTaskId(slug) ?? null);
    }
  }

  return result;
}

// ─── QA_GATE State ────────────────────────────────────────────

/**
 * Runs QA_GATE — waits for all wave agents to finish, reads JSONL verdicts.
 *
 * On pass: returns GUARDIAN (or SPAWNING for next wave if more waves exist).
 * On fail with retries remaining: returns SPAWNING (re-runs the wave).
 * On fail with no retries: throws → ERROR.
 */
export async function runQaGate(
  record: WorkflowRuntimeRecord,
  agentOrchestrator: AgentOrchestrator,
): Promise<WorkflowState> {
  const { featureName, maxQaRounds, useGuardian } = record.config;

  if (!record.wavePlan) {
    throw new Error('QA_GATE FAIL: wavePlan is null — PLAN state did not complete');
  }

  const { currentWave } = record.wavePlan;
  const currentWaveTasks = record.wavePlan.waves[currentWave] ?? [];

  if (currentWaveTasks.length === 0) {
    throw new Error(
      `QA_GATE FAIL: No tasks in wave ${String(currentWave)} of ${featureName}`,
    );
  }

  const taskSlugs = currentWaveTasks.map((t) => t.taskSlug);

  console.warn(
    `[WorkflowEngine/QA_GATE] Waiting for ${String(taskSlugs.length)} agent(s) — ` +
      `feature: ${featureName}, wave: ${String(currentWave)}, round: ${String(record.qaRound)}`,
  );

  // ── 1. Wait for all sessions to complete ─────────────────────
  const sessions = await waitForAllSessions(taskSlugs, agentOrchestrator, MAX_POLL_WAIT_MS);

  // ── 2. Read verdicts from JSONL progress files ────────────────
  const failedTasks: string[] = [];

  for (const task of currentWaveTasks) {
    const session = sessions.get(task.taskSlug);

    if (!session) {
      console.warn(
        `[WorkflowEngine/QA_GATE] No session found for task "${task.taskSlug}" — treating as fail`,
      );
      failedTasks.push(task.taskSlug);
      continue;
    }

    const progressFile = resolveProgressFile(session);
    const verdict = findLatestQaVerdict(progressFile);

    if (!verdict) {
      console.warn(
        `[WorkflowEngine/QA_GATE] No qa.verdict found for task "${task.taskSlug}" ` +
          `(progress: ${progressFile}) — treating as fail`,
      );
      failedTasks.push(task.taskSlug);
      continue;
    }

    // Store verdict on the record for debugging / finalize logging
    record.verdictsByTaskSlug.set(task.taskSlug, verdict);

    if (verdict.passed) {
      console.warn(`[WorkflowEngine/QA_GATE] PASS — task "${task.taskSlug}"`);
    } else {
      const blockingCount = verdict.issues.filter((i) => i.blocking).length;
      console.warn(
        `[WorkflowEngine/QA_GATE] FAIL — task "${task.taskSlug}", ` +
          `round ${String(verdict.round)}, blocking issues: ${String(blockingCount)}`,
      );
      failedTasks.push(task.taskSlug);
    }
  }

  // ── 3. All passed ─────────────────────────────────────────────
  if (failedTasks.length === 0) {
    const moreWaves = currentWave + 1 < record.wavePlan.waves.length;

    if (moreWaves) {
      record.wavePlan.currentWave += 1;
      console.warn(
        `[WorkflowEngine/QA_GATE] Wave ${String(currentWave)} passed — advancing to wave ${String(record.wavePlan.currentWave)}`,
      );
      return WorkflowState.SETUP;
    }

    console.warn(
      `[WorkflowEngine/QA_GATE] All waves complete — transitioning to ${useGuardian ? 'GUARDIAN' : 'FINALIZING'}`,
    );
    return useGuardian ? WorkflowState.GUARDIAN : WorkflowState.FINALIZING;
  }

  // ── 4. Failures — retry or hard fail ─────────────────────────
  if (record.qaRound < maxQaRounds) {
    console.warn(
      `[WorkflowEngine/QA_GATE] Wave ${String(currentWave)} failed ` +
        `(round ${String(record.qaRound)}/${String(maxQaRounds)}) — ` +
        `failed tasks: ${failedTasks.join(', ')}. Retrying.`,
    );
    return WorkflowState.SPAWNING;
  }

  throw new Error(
    `QA_GATE FAIL: Wave ${String(currentWave)} failed after ${String(record.qaRound)} round(s). ` +
      `Max rounds (${String(maxQaRounds)}) exhausted. Failed tasks: ${failedTasks.join(', ')}`,
  );
}
