/**
 * FINALIZING State Handler
 *
 * Cleans up workflow artifacts, then optionally pushes the feature branch
 * and creates a PR.
 *
 * Cleanup steps:
 *   1. Remove engine state file for this run
 *   2. Remove resolved-template snapshot
 *   3. Remove agent-context directories (.claude/agent-contexts/<feature>/)
 *   4. Remove any stamp files inadvertently staged (`git rm --cached`)
 *   5. Ensure .gitignore has entries for all workflow artifact patterns
 *
 * Push/PR (if configured):
 *   6. Push feature branch to remote
 *   7. Create PR via GitHub CLI (if createPr: true)
 */

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

import { WorkflowState } from '../types';

import type { GitService } from '../../../git/git-service';
import type { WorkflowRuntimeRecord } from '../types';

// ─── Constants ────────────────────────────────────────────────

const execFileAsync = promisify(execFile);

/**
 * Gitignore entries that must be present for workflow artifact exclusion.
 * These patterns cover stamp files, engine state, and agent contexts.
 */
const REQUIRED_GITIGNORE_ENTRIES = [
  '.claude/.workflow-state/',
  '.claude/agent-contexts/',
  '.claude/progress/**/wave-*-spawned.json',
  '.claude/progress/**/wave-*-complete.json',
  '.claude/progress/**/all-waves-complete.json',
  '.claude/progress/**/preflight-complete.json',
  '.claude/progress/**/plan-complete.json',
  '.claude/progress/**/setup-complete.json',
  '.claude/progress/**/guardian-passed.json',
  '.claude/progress/**/.workflow-active',
  '.claude/agent-contexts/',
] as const;

const GITIGNORE_SECTION_HEADER = '# Workflow engine artifacts (ephemeral, auto-generated)';

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Removes a file or directory silently (no error if not found).
 */
function removeArtifact(artifactPath: string): void {
  if (!existsSync(artifactPath)) return;

  try {
    rmSync(artifactPath, { recursive: true, force: true });
    console.warn(`[WorkflowEngine/FINALIZING] Removed: ${artifactPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[WorkflowEngine/FINALIZING] Could not remove ${artifactPath}: ${message}`);
  }
}

/**
 * Moves a file to an archive directory instead of deleting it.
 * Creates the archive directory if it does not exist.
 * Silently skips if the source file is missing.
 */
export function archiveArtifact(artifactPath: string, archiveDir: string): void {
  if (!existsSync(artifactPath)) return;

  try {
    mkdirSync(archiveDir, { recursive: true });
    const dest = join(archiveDir, basename(artifactPath));
    renameSync(artifactPath, dest);
    console.warn(`[WorkflowEngine/FINALIZING] Archived: ${artifactPath} → ${dest}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[WorkflowEngine/FINALIZING] Could not archive ${artifactPath}: ${message}`);
  }
}

/**
 * Runs `git rm --cached <paths>` to unstage files that were accidentally
 * staged as workflow artifacts. Silently skips files that are not staged.
 */
async function unstageArtifacts(
  projectPath: string,
  artifactPaths: string[],
): Promise<void> {
  if (artifactPaths.length === 0) return;

  try {
    await execFileAsync(
      'git',
      ['rm', '--cached', '--force', '--ignore-unmatch', ...artifactPaths],
      {
        cwd: projectPath,
        shell: platform() === 'win32',
      },
    );
    console.warn(
      `[WorkflowEngine/FINALIZING] git rm --cached: ${String(artifactPaths.length)} path(s) unstaged`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[WorkflowEngine/FINALIZING] git rm --cached warning: ${message}`);
  }
}

/**
 * Ensures the .gitignore file contains all required workflow artifact entries.
 * Appends a labeled section if any entries are missing.
 * Does NOT modify entries that already exist.
 */
function ensureGitignoreEntries(projectPath: string): void {
  const gitignorePath = join(projectPath, '.gitignore');
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';

  const missing = REQUIRED_GITIGNORE_ENTRIES.filter((entry) => !existing.includes(entry));

  if (missing.length === 0) {
    console.warn(`[WorkflowEngine/FINALIZING] .gitignore already has all workflow artifact entries`);
    return;
  }

  const addition = [
    '',
    GITIGNORE_SECTION_HEADER,
    ...missing,
    '',
  ].join('\n');

  writeFileSync(gitignorePath, existing + addition, 'utf-8');

  console.warn(
    `[WorkflowEngine/FINALIZING] Added ${String(missing.length)} entry(s) to .gitignore`,
  );
}

/**
 * Collects artifact paths that may have been staged in the repository.
 * Returns relative paths for `git rm --cached`.
 */
function collectStagedArtifactPaths(projectPath: string, featureName: string): string[] {
  const paths: string[] = [];

  // Engine state for this run
  const engineStateDir = '.claude/.workflow-state';
  if (existsSync(join(projectPath, engineStateDir))) {
    paths.push(engineStateDir);
  }

  // Feature-scoped stamp files
  const progressBase = join('.claude', 'progress', featureName);
  const stampPatterns = [
    'preflight-complete.json',
    'plan-complete.json',
    'setup-complete.json',
    'guardian-passed.json',
    '.workflow-active',
    'all-waves-complete.json',
  ];
  for (const stamp of stampPatterns) {
    const relative = join(progressBase, stamp);
    if (existsSync(join(projectPath, relative))) {
      paths.push(relative);
    }
  }

  // Wave stamp files (wave-N-spawned.json, wave-N-complete.json)
  const waveBase = join(projectPath, progressBase);
  if (existsSync(waveBase)) {
    try {
      for (const entry of readdirSync(waveBase)) {
        if (/^wave-\d+-(spawned|complete)\.json$/.test(entry)) {
          paths.push(join(progressBase, entry));
        }
      }
    } catch {
      // Directory unreadable — skip
    }
  }

  // Agent context directories
  const agentContextBase = '.claude/agent-contexts';
  if (existsSync(join(projectPath, agentContextBase))) {
    paths.push(agentContextBase);
  }

  return paths;
}

// ─── FINALIZING State ─────────────────────────────────────────

/**
 * Runs FINALIZING — cleans up artifacts, optionally pushes and creates PR.
 *
 * Returns DONE on success; throws → ERROR on failure.
 */
export async function runFinalizing(
  record: WorkflowRuntimeRecord,
  gitService: GitService,
): Promise<WorkflowState> {
  const { featureName, projectPath, createPr, branchPrefix } = record.config;

  console.warn(`[WorkflowEngine/FINALIZING] Starting cleanup for feature "${featureName}"`);

  // ── 1–2. Archive engine state file + resolved-template snapshot ──
  const engineArchiveDir = join(record.stateFilePath, '..', 'archive');
  const snapshotPath = join(projectPath, '.claude', 'progress', featureName, 'resolved-template.json');
  archiveArtifact(record.stateFilePath, engineArchiveDir);
  archiveArtifact(snapshotPath, engineArchiveDir);

  // ── 3. Remove agent-context directories (large, reconstructable) ──
  const agentContextDir = join(projectPath, '.claude', 'agent-contexts', featureName);
  removeArtifact(agentContextDir);

  // ── 4. git rm --cached staged artifacts ──────────────────────
  const stagedArtifacts = collectStagedArtifactPaths(projectPath, featureName);
  await unstageArtifacts(projectPath, stagedArtifacts);

  // ── 5. Ensure .gitignore has all required entries ─────────────
  ensureGitignoreEntries(projectPath);

  // ── 6. Push feature branch (if configured) ────────────────────
  const featureBranch = `${branchPrefix}/${featureName}`;

  if (createPr) {
    console.warn(`[WorkflowEngine/FINALIZING] Pushing branch "${featureBranch}" to remote`);

    const pushResult = await gitService.push(projectPath, 'origin', featureBranch);

    if (!pushResult.success) {
      throw new Error(
        `FINALIZING FAIL: Push failed for branch "${featureBranch}": remote=${pushResult.remote}`,
      );
    }

    console.warn(
      `[WorkflowEngine/FINALIZING] Pushed: ${pushResult.remote}/${pushResult.branch}`,
    );

    // ── 7. Create PR ─────────────────────────────────────────────
    const prTitle = `feat(${featureName}): automated workflow output`;
    const prBody = buildPrBody(record);

    const pr = await gitService.createPr(
      projectPath,
      prTitle,
      prBody,
      'master',
      featureBranch,
    );

    console.warn(
      `[WorkflowEngine/FINALIZING] PR created: #${String(pr.number)} — ${pr.url}`,
    );
  }

  console.warn(`[WorkflowEngine/FINALIZING] Complete for feature "${featureName}"`);
  return WorkflowState.DONE;
}

// ─── PR Body Builder ──────────────────────────────────────────

function buildPrBody(record: WorkflowRuntimeRecord): string {
  const { featureName } = record.config;
  const totalTasks = record.wavePlan?.totalTasks ?? 0;
  const waves = record.wavePlan?.waves.length ?? 0;

  return [
    `## Summary`,
    ``,
    `Automated workflow output for feature \`${featureName}\`.`,
    ``,
    `- Tasks completed: ${String(totalTasks)}`,
    `- Waves: ${String(waves)}`,
    `- QA rounds: ${String(record.qaRound)}`,
    ``,
    `## Tasks`,
    '',
    ...(record.wavePlan?.waves.flat().map((t) => `- [x] ${t.taskName} (\`${t.taskSlug}\`)`) ?? []),
    ``,
    `---`,
    `*Generated by WorkflowEngine — runId: ${record.runId}*`,
  ].join('\n');
}
