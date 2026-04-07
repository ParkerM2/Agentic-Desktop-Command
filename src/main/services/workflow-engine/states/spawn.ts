/**
 * SPAWNING State Handler
 *
 * Validates agent spawn prompts and spawns agents via AgentOrchestrator
 * for every task in the current wave.
 *
 * Validation (spawn-validator.ts) checks for three required references:
 *   - "CLAUDE.md"             — agent must reference project rules
 *   - "AGENT-WORKFLOW-PHASES" — agent must know the 4-phase protocol
 *   - "SendMessage"           — agent must know communication rules
 *
 * A missing reference is a HARD FAIL — transitions to ERROR. This prevents
 * the session 1e5c9e27 failure where agents ran with bare ~300-token prompts
 * and no project rules, producing unusable output.
 *
 * useWorktrees=false path:
 *   The CLAUDE.md content built by the SETUP state is embedded INLINE in
 *   the spawn prompt. This compensates for Claude Code issue #33045 where
 *   `isolation: worktree` is silently ignored for team agents, meaning
 *   CLAUDE.md is never auto-loaded from the worktree directory.
 *   See: https://github.com/anthropics/claude-code/issues/33045
 */

import { join } from 'node:path';

import { validateSpawnPrompt } from '../spawn-validator';
import { WorkflowState } from '../types';

import type { AgentOrchestrator } from '../../agent-orchestrator/types';
import type { TaskEntry, WorkflowRuntimeRecord } from '../types';

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Resolves the working directory for an agent.
 *
 * - useWorktrees=true:  `.worktrees/<feature>/<slug>` (isolated checkout)
 * - useWorktrees=false: project root (shared checkout, agent uses task branch)
 *
 * NOTE (Claude Code #33045): even with useWorktrees=true the worktree path
 * is set as cwd, but the CLAUDE.md is still embedded inline in the prompt.
 */
function resolveAgentCwd(
  projectPath: string,
  featureName: string,
  taskSlug: string,
  useWorktrees: boolean,
): string {
  if (useWorktrees) {
    return join(projectPath, '.worktrees', featureName, taskSlug);
  }
  return projectPath;
}

/**
 * Builds the spawn prompt for a task.
 *
 * When useWorktrees=false the full CLAUDE.md content is embedded inline
 * because the worktree isolation mechanism is not available (CC #33045).
 */
function buildSpawnPrompt(
  task: TaskEntry,
  claudeMdContent: string,
  useWorktrees: boolean,
): string {
  if (useWorktrees) {
    // Worktree has CLAUDE.md at its root — reference it by path
    return [
      `Your full protocol and project rules are in CLAUDE.md (already loaded in your working directory).`,
      ``,
      `Read AGENT-WORKFLOW-PHASES.md (under prompts/implementing-features/) and follow Phases 0-4.`,
      ``,
      `Use SendMessage to communicate with the team leader. Do NOT message other agents.`,
      ``,
      `Task file: ${task.filePath}`,
      ``,
      `Read your task file for description, acceptance criteria, and file scope.`,
    ].join('\n');
  }

  // useWorktrees=false: embed full CLAUDE.md inline (CC #33045 workaround)
  return [
    `# CLAUDE.md — Your Project Rules and Task Context`,
    ``,
    `<!-- CC #33045: isolation:worktree silently ignored — context injected inline -->`,
    ``,
    claudeMdContent,
    ``,
    `---`,
    ``,
    `## Workflow Protocol`,
    ``,
    `Read AGENT-WORKFLOW-PHASES.md (under prompts/implementing-features/) and follow Phases 0-4.`,
    ``,
    `Use SendMessage to communicate with the team leader. Do NOT message other agents.`,
    ``,
    `## Your Task`,
    ``,
    `Task file: ${task.filePath}`,
    ``,
    `Read your task file for the full description, acceptance criteria, and file scope.`,
  ].join('\n');
}

// ─── SPAWNING State ───────────────────────────────────────────

/**
 * Runs SPAWNING — validates and spawns agents for every task in the current wave.
 *
 * Reads `claudeMdBySlug` from the record (set by SETUP state).
 * Validates each prompt. Spawns via AgentOrchestrator.
 * Returns QA_GATE on success; throws (→ ERROR) on validation failure.
 */
export async function runSpawning(
  record: WorkflowRuntimeRecord,
  agentOrchestrator: AgentOrchestrator,
): Promise<WorkflowState> {
  const { featureName, projectPath, useWorktrees } = record.config;

  if (!record.wavePlan) {
    throw new Error('SPAWNING FAIL: wavePlan is null — PLAN state did not complete');
  }

  const currentWaveTasks = record.wavePlan.waves[record.wavePlan.currentWave] ?? [];
  if (currentWaveTasks.length === 0) {
    throw new Error(
      `SPAWNING FAIL: No tasks in wave ${String(record.wavePlan.currentWave)} of ${featureName}`,
    );
  }

  const { claudeMdBySlug } = record;

  for (const task of currentWaveTasks) {
    const claudeMdContent = claudeMdBySlug.get(task.taskSlug) ?? '';

    // Build and validate prompt — HARD FAIL if missing required refs
    const prompt = buildSpawnPrompt(task, claudeMdContent, useWorktrees);
    validateSpawnPrompt(prompt, task.taskSlug);

    // Resolve working directory for the agent
    const agentCwd = resolveAgentCwd(projectPath, featureName, task.taskSlug, useWorktrees);

    // Spawn via AgentOrchestrator
    const session = await agentOrchestrator.spawn({
      taskId: task.taskSlug,
      projectPath,
      subProjectPath: useWorktrees
        ? join('.worktrees', featureName, task.taskSlug)
        : undefined,
      prompt,
      phase: 'executing',
    });

    console.warn(
      `[WorkflowEngine/SPAWNING] Agent spawned for task "${task.taskSlug}": ` +
        `session=${session.id}, pid=${String(session.pid)}, cwd=${agentCwd}`,
    );
  }

  console.warn(
    `[WorkflowEngine/SPAWNING] Wave ${String(record.wavePlan.currentWave)} spawned: ` +
      `${String(currentWaveTasks.length)} agent(s) for feature "${featureName}"`,
  );

  return WorkflowState.QA_GATE;
}
