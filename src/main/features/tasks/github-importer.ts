/**
 * GitHub Task Importer — Import tasks from GitHub issues.
 *
 * Parses GitHub issue URLs and converts issues to task format.
 * Supports importing individual issues or bulk import from repositories.
 */

import type { GithubIssueImport, Task, TaskDraft } from '@shared/types';

import type { GitHubService } from '../github/github-service';
import type { TaskService } from '../project/task-service';

// ── Interface ─────────────────────────────────────────────────

export interface GithubTaskImporter {
  /**
   * Parse a GitHub issue URL and extract owner/repo/number.
   * @param url - GitHub issue URL
   * @returns Parsed issue reference or null if invalid
   */
  parseIssueUrl: (url: string) => { owner: string; repo: string; number: number } | null;

  /**
   * Fetch a GitHub issue and convert it to importable format.
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param issueNumber - Issue number
   * @returns Issue data ready for import
   */
  fetchIssue: (owner: string, repo: string, issueNumber: number) => Promise<GithubIssueImport>;

  /**
   * Import a task from a GitHub issue URL.
   * @param url - GitHub issue URL
   * @param projectId - Target project ID
   * @returns Created task
   */
  importFromUrl: (url: string, projectId: string) => Promise<Task>;

  /**
   * List open issues from a repository that can be imported.
   * @param owner - Repository owner
   * @param repo - Repository name
   * @returns Array of issues available for import
   */
  listImportableIssues: (owner: string, repo: string) => Promise<GithubIssueImport[]>;
}

// ── URL Parsing ───────────────────────────────────────────────

// Matches: https://github.com/owner/repo/issues/123
// Also handles trailing slashes and query params
const GITHUB_ISSUE_URL_REGEX =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?(?:\?.*)?$/;

function parseGitHubIssueUrl(url: string): { owner: string; repo: string; number: number } | null {
  const match = GITHUB_ISSUE_URL_REGEX.exec(url.trim());
  if (!match) {
    return null;
  }

  const [, owner, repo, numberStr] = match;
  const issueNumber = parseInt(numberStr, 10);

  if (!owner || !repo || isNaN(issueNumber) || issueNumber <= 0) {
    return null;
  }

  return { owner, repo, number: issueNumber };
}

// ── Factory ───────────────────────────────────────────────────

export interface GithubTaskImporterDeps {
  githubService: GitHubService;
  taskService: TaskService;
}

export function createGithubImporter(deps: GithubTaskImporterDeps): GithubTaskImporter {
  const { githubService, taskService } = deps;

  return {
    parseIssueUrl(url) {
      return parseGitHubIssueUrl(url);
    },

    async fetchIssue(owner, repo, issueNumber) {
      const issues = await githubService.listIssues({ owner, repo, state: 'open' });
      const issue = issues.find((i) => i.number === issueNumber);

      if (!issue) {
        // Try fetching all issues in case it's closed
        const allIssues = await githubService.listIssues({ owner, repo, state: 'all' });
        const foundIssue = allIssues.find((i) => i.number === issueNumber);

        if (!foundIssue) {
          throw new Error(`Issue #${String(issueNumber)} not found in ${owner}/${repo}`);
        }

        return {
          issueNumber: foundIssue.number,
          issueUrl: foundIssue.url,
          title: foundIssue.title,
          body: foundIssue.body,
          labels: foundIssue.labels.map((l) => l.name),
          assignees: foundIssue.assignees,
        };
      }

      return {
        issueNumber: issue.number,
        issueUrl: issue.url,
        title: issue.title,
        body: issue.body,
        labels: issue.labels.map((l) => l.name),
        assignees: issue.assignees,
      };
    },

    async importFromUrl(url, projectId) {
      const parsed = parseGitHubIssueUrl(url);
      if (!parsed) {
        throw new Error(
          'Invalid GitHub issue URL. Expected format: https://github.com/owner/repo/issues/123',
        );
      }

      const { owner, repo, number: issueNumber } = parsed;
      const issueData = await this.fetchIssue(owner, repo, issueNumber);

      // Build task description with GitHub context
      const descriptionParts = [issueData.body];

      if (issueData.labels.length > 0) {
        descriptionParts.push(`\n\n**Labels:** ${issueData.labels.join(', ')}`);
      }

      if (issueData.assignees.length > 0) {
        descriptionParts.push(`**Assignees:** ${issueData.assignees.join(', ')}`);
      }

      descriptionParts.push(`\n\n*Imported from: ${issueData.issueUrl}*`);

      const draft: TaskDraft = {
        title: issueData.title,
        description: descriptionParts.join(''),
        projectId,
        complexity: 'standard',
      };

      return taskService.createTask(draft);
    },

    async listImportableIssues(owner, repo) {
      const issues = await githubService.listIssues({ owner, repo, state: 'open' });

      return issues.map((issue) => ({
        issueNumber: issue.number,
        issueUrl: issue.url,
        title: issue.title,
        body: issue.body,
        labels: issue.labels.map((l) => l.name),
        assignees: issue.assignees,
      }));
    },
  };
}
