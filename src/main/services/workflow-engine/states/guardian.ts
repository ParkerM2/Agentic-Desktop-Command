/**
 * GUARDIAN State Handler
 *
 * Spawns the Guardian agent, waits for it to complete, then reads its
 * structured JSONL verdict from the progress file.
 *
 * Verdict format (written by Guardian agent to its progress JSONL):
 *   {"type":"guardian.verdict","data":{"passed":true,"violations":[],"checksRun":5}}
 *
 * Decision logic:
 *   - passed: true  → FINALIZING
 *   - passed: false → ERROR (no discretion — blocking violations prevent finalization)
 *
 * No free-text interpretation. Only structured JSONL verdicts count.
 * The team leader is NOT asked to interpret Guardian results.
 */

import { existsSync, readFileSync } from 'node:fs';

import { GuardianVerdictEntrySchema } from '@shared/ipc/workflow-engine/verdict-schemas';
import type { GuardianVerdict } from '@shared/ipc/workflow-engine/verdict-schemas';

import { WorkflowState } from '../types';

import type { AgentOrchestrator, AgentSession } from '../../agent-orchestrator/types';
import type { WorkflowRuntimeRecord } from '../types';

// ─── Constants ────────────────────────────────────────────────

const GUARDIAN_TASK_ID = 'guardian';
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_WAIT_MS = 20 * 60 * 1_000; // 20 minutes

// ─── Helpers ──────────────────────────────────────────────────

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
 * Finds the guardian.verdict entry in a JSONL progress file.
 * Returns null if no verdict has been written yet.
 */
function findGuardianVerdict(progressFile: string): GuardianVerdict | null {
  const lines = readJsonlLines(progressFile);

  // Scan in reverse to find the most recent verdict
  for (let i = lines.length - 1; i >= 0; i--) {
    const parsed = GuardianVerdictEntrySchema.safeParse(lines[i]);
    if (parsed.success) {
      return parsed.data.data;
    }
  }

  return null;
}

/**
 * Returns true when the agent session is in a terminal state.
 */
function isSessionTerminal(session: AgentSession): boolean {
  return session.status === 'completed' || session.status === 'error' || session.status === 'killed';
}

/**
 * Builds the Guardian spawn prompt. The Guardian agent receives all task
 * slugs and is asked to produce a structured guardian.verdict JSONL entry.
 */
function buildGuardianPrompt(
  record: WorkflowRuntimeRecord,
): string {
  const { featureName } = record.config;
  const taskSlugs = record.wavePlan
    ? record.wavePlan.waves.flat().map((t) => t.taskSlug)
    : [];

  return [
    `# Guardian Review — ${featureName}`,
    ``,
    `You are the Guardian agent for feature "${featureName}".`,
    `Your job: review the completed work and emit a structured guardian.verdict JSONL entry.`,
    ``,
    `## Tasks Completed`,
    ...taskSlugs.map((slug) => `- ${slug}`),
    ``,
    `## Required Output`,
    ``,
    `Write the following JSON as a single line to your progress JSONL file:`,
    `{"type":"guardian.verdict","data":{"passed":<bool>,"violations":[...],"checksRun":<int>,"recommendations":[...]}}`,
    ``,
    `Violation format: {"rule":"<name>","file":"<path>","detail":"<description>","severity":"blocking"|"warning"}`,
    `Recommendation format: {"suggestion":"<text>","file":"<optional path>"}`,
    ``,
    `## Rules`,
    `- "passed": true only if there are NO blocking violations`,
    `- List ALL violations found — do not filter`,
    `- "checksRun" is the number of discrete checks you performed`,
    `- Do NOT use SendMessage to report results — the verdict JSONL entry is the only signal`,
  ].join('\n');
}

// ─── GUARDIAN State ───────────────────────────────────────────

/**
 * Runs GUARDIAN — spawns the Guardian agent, waits for completion,
 * reads the structured JSONL verdict.
 *
 * On pass (passed: true): returns FINALIZING.
 * On fail (passed: false): throws → ERROR. No discretion.
 */
export async function runGuardian(
  record: WorkflowRuntimeRecord,
  agentOrchestrator: AgentOrchestrator,
): Promise<WorkflowState> {
  const { featureName, projectPath } = record.config;

  console.warn(`[WorkflowEngine/GUARDIAN] Spawning Guardian for feature "${featureName}"`);

  // ── 1. Spawn Guardian agent ──────────────────────────────────
  const prompt = buildGuardianPrompt(record);

  const session = await agentOrchestrator.spawn({
    taskId: GUARDIAN_TASK_ID,
    projectPath,
    prompt,
    phase: 'qa',
  });

  console.warn(
    `[WorkflowEngine/GUARDIAN] Guardian spawned: session=${session.id}, pid=${String(session.pid)}`,
  );

  // ── 2. Wait for Guardian to complete ─────────────────────────
  const deadline = Date.now() + MAX_POLL_WAIT_MS;

  while (Date.now() < deadline) {
    const current = agentOrchestrator.getSession(session.id);
    if (current && isSessionTerminal(current)) break;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
  }

  // ── 3. Read verdict from JSONL ────────────────────────────────
  const verdict = findGuardianVerdict(session.progressFile);

  if (!verdict) {
    throw new Error(
      `GUARDIAN FAIL: No guardian.verdict found in progress file: ${session.progressFile}. ` +
        `Guardian agent must emit a structured JSONL verdict.`,
    );
  }

  console.warn(
    `[WorkflowEngine/GUARDIAN] Verdict received — ` +
      `passed: ${String(verdict.passed)}, checksRun: ${String(verdict.checksRun)}, ` +
      `violations: ${String(verdict.violations.length)}`,
  );

  // ── 4. Blocking violations → ERROR ───────────────────────────
  if (!verdict.passed) {
    const blockingViolations = verdict.violations.filter((v) => v.severity === 'blocking');
    const violationSummary = blockingViolations
      .map((v) => `[${v.rule}] ${v.file}: ${v.detail}`)
      .join('\n  ');

    throw new Error(
      `GUARDIAN FAIL: Guardian verdict passed=false. ` +
        `Blocking violations (${String(blockingViolations.length)}):\n  ${violationSummary}`,
    );
  }

  console.warn(`[WorkflowEngine/GUARDIAN] PASS — transitioning to FINALIZING`);
  return WorkflowState.FINALIZING;
}
