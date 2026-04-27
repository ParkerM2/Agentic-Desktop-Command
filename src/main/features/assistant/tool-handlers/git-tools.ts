/**
 * Git tool handlers for the assistant tool executor.
 *
 * Handles: git_status, github_list_prs
 * Resolves projectId → filesystem path via projectService,
 * then delegates to gitService / githubService.
 */

import type { GitService } from '../../git/git-service';
import type { GitHubService } from '../../github';
import type { ProjectService } from '../../projects/project-service';
import type { ToolResult } from '../tool-executor';

type ToolInput = Record<string, unknown>;

export interface GitToolDeps {
  projectService: Pick<ProjectService, 'getProjectPath'> | null;
  gitService: GitService | null;
  githubService: GitHubService | null;
}

function fail(error: string): ToolResult {
  return { success: false, error, queryKeyRoots: [] };
}

function resolveProjectPath(
  projectId: string,
  projectService: GitToolDeps['projectService'],
): string | ToolResult {
  if (!projectService) return fail('Project service unavailable');
  const path = projectService.getProjectPath(projectId);
  if (!path) return fail(`Project not found: ${projectId}`);
  return path;
}

async function executeGitStatus(
  input: ToolInput,
  deps: GitToolDeps,
): Promise<ToolResult> {
  const projectId = typeof input.projectId === 'string' ? input.projectId : '';
  if (!projectId) return fail('projectId is required');

  const pathOrError = resolveProjectPath(projectId, deps.projectService);
  if (typeof pathOrError !== 'string') return pathOrError;

  if (!deps.gitService) return fail('Git service unavailable');

  try {
    const status = await deps.gitService.getStatus(pathOrError);
    return { success: true, data: status, queryKeyRoots: [] };
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to get git status');
  }
}

async function executeGithubListPrs(
  input: ToolInput,
  deps: GitToolDeps,
): Promise<ToolResult> {
  const projectId = typeof input.projectId === 'string' ? input.projectId : '';
  if (!projectId) return fail('projectId is required');

  const pathOrError = resolveProjectPath(projectId, deps.projectService);
  if (typeof pathOrError !== 'string') return pathOrError;

  if (!deps.githubService) return fail('GitHub service unavailable');
  if (!deps.gitService) return fail('Git service unavailable');

  try {
    // Derive owner/repo from the remote URL
    const remoteUrl = await deps.gitService.getRemoteUrl(pathOrError);
    if (!remoteUrl) return fail('No git remote found for this project');

    const match = /[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(remoteUrl);
    if (!match) return fail(`Could not parse owner/repo from remote URL: ${remoteUrl}`);

    const [, owner, repo] = match;

    const prs = await deps.githubService.listPrs({
      owner,
      repo,
      state: 'open',
    });
    return { success: true, data: prs, queryKeyRoots: [] };
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to list PRs');
  }
}

/**
 * Handle git-related tool calls.
 * Returns undefined if the tool name is not handled by this module.
 */
export async function handleGitTool(
  toolName: string,
  input: ToolInput,
  deps: GitToolDeps,
): Promise<ToolResult | undefined> {
  switch (toolName) {
    case 'git_status':
      return await executeGitStatus(input, deps);
    case 'github_list_prs':
      return await executeGithubListPrs(input, deps);
    default:
      return undefined;
  }
}
