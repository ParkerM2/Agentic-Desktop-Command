/**
 * GitHub MCP Tool Definitions
 *
 * Defines the tools that the assistant can invoke to interact
 * with GitHub. Each tool maps to a GitHubClient method.
 */

import { mcpLogger } from '@main/lib/logger';

import type { GitHubClient } from './github-client';
import type { McpToolDefinition, McpToolResult } from '../../mcp/types';

// ── Constants ────────────────────────────────────────────────

const OWNER_DESCRIPTION = 'Repository owner';
const REPO_DESCRIPTION = 'Repository name';

// ── Tool Definitions ─────────────────────────────────────────

export const GITHUB_TOOLS: McpToolDefinition[] = [
  {
    name: 'github_list_prs',
    description: 'List pull requests for a GitHub repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: `${OWNER_DESCRIPTION} (user or org)` },
        repo: { type: 'string', description: REPO_DESCRIPTION },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by PR state (default: open)',
        },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'github_get_pr',
    description: 'Get detailed information about a specific pull request',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: OWNER_DESCRIPTION },
        repo: { type: 'string', description: REPO_DESCRIPTION },
        number: { type: 'number', description: 'Pull request number' },
      },
      required: ['owner', 'repo', 'number'],
    },
  },
  {
    name: 'github_review_pr',
    description: 'Submit a review on a pull request',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: OWNER_DESCRIPTION },
        repo: { type: 'string', description: REPO_DESCRIPTION },
        number: { type: 'number', description: 'Pull request number' },
        body: { type: 'string', description: 'Review comment body' },
        event: {
          type: 'string',
          enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'],
          description: 'Review action',
        },
      },
      required: ['owner', 'repo', 'number', 'body', 'event'],
    },
  },
  {
    name: 'github_list_issues',
    description: 'List issues for a GitHub repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: OWNER_DESCRIPTION },
        repo: { type: 'string', description: REPO_DESCRIPTION },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by issue state (default: open)',
        },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'github_create_issue',
    description: 'Create a new issue in a GitHub repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: OWNER_DESCRIPTION },
        repo: { type: 'string', description: REPO_DESCRIPTION },
        title: { type: 'string', description: 'Issue title' },
        body: { type: 'string', description: 'Issue body (markdown)' },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to apply',
        },
        assignees: {
          type: 'array',
          items: { type: 'string' },
          description: 'GitHub usernames to assign',
        },
      },
      required: ['owner', 'repo', 'title'],
    },
  },
  {
    name: 'github_get_notifications',
    description: 'Get notifications for the authenticated GitHub user',
    inputSchema: {
      type: 'object',
      properties: {
        all: {
          type: 'boolean',
          description: 'Include read notifications (default: false)',
        },
      },
    },
  },
  {
    name: 'github_watch_repo',
    description: 'Subscribe to notifications for a GitHub repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: OWNER_DESCRIPTION },
        repo: { type: 'string', description: REPO_DESCRIPTION },
      },
      required: ['owner', 'repo'],
    },
  },
];

// ── Tool Executor ────────────────────────────────────────────

function successResult(data: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    isError: false,
  };
}

function errorResult(message: string): McpToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

/** Safely extract a string from unknown args */
function argString(args: Record<string, unknown>, key: string, fallback = ''): string {
  const value = args[key];
  return typeof value === 'string' ? value : fallback;
}

/** Safely extract a number from unknown args */
function argNumber(args: Record<string, unknown>, key: string, fallback = 0): number {
  const value = args[key];
  return typeof value === 'number' ? value : fallback;
}

/**
 * Execute a GitHub tool by name with the given arguments.
 * Returns an McpToolResult with the JSON response or error.
 */
export async function executeGitHubTool(
  client: GitHubClient,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  try {
    switch (toolName) {
      case 'github_list_prs': {
        const result = await client.listPrs({
          owner: argString(args, 'owner'),
          repo: argString(args, 'repo'),
          state: (args.state as 'open' | 'closed' | 'all' | undefined) ?? 'open',
        });
        return successResult(result);
      }

      case 'github_get_pr': {
        const result = await client.getPr({
          owner: argString(args, 'owner'),
          repo: argString(args, 'repo'),
          number: argNumber(args, 'number'),
        });
        return successResult(result);
      }

      case 'github_review_pr': {
        const result = await client.reviewPr({
          owner: argString(args, 'owner'),
          repo: argString(args, 'repo'),
          number: argNumber(args, 'number'),
          body: argString(args, 'body'),
          event:
            typeof args.event === 'string'
              ? (args.event as 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT')
              : 'COMMENT',
        });
        return successResult(result);
      }

      case 'github_list_issues': {
        const result = await client.listIssues({
          owner: argString(args, 'owner'),
          repo: argString(args, 'repo'),
          state: (args.state as 'open' | 'closed' | 'all' | undefined) ?? 'open',
        });
        return successResult(result);
      }

      case 'github_create_issue': {
        const bodyValue = args.body;
        const result = await client.createIssue({
          owner: argString(args, 'owner'),
          repo: argString(args, 'repo'),
          title: argString(args, 'title'),
          body: typeof bodyValue === 'string' ? bodyValue : undefined,
          labels: Array.isArray(args.labels) ? (args.labels as string[]) : undefined,
          assignees: Array.isArray(args.assignees) ? (args.assignees as string[]) : undefined,
        });
        return successResult(result);
      }

      case 'github_get_notifications': {
        const result = await client.getNotifications({
          all: typeof args.all === 'boolean' ? args.all : false,
        });
        return successResult(result);
      }

      case 'github_watch_repo': {
        const result = await client.watchRepo({
          owner: argString(args, 'owner'),
          repo: argString(args, 'repo'),
        });
        return successResult(result);
      }

      default:
        return errorResult(`Unknown tool: ${toolName}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    mcpLogger.error(`[GitHub] Tool "${toolName}" failed: ${message}`);
    return errorResult(`GitHub API error: ${message}`);
  }
}
