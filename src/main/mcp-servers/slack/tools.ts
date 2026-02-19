/**
 * Slack MCP Tool Definitions
 *
 * Defines the tools that the assistant can invoke to interact
 * with Slack. Each tool maps to a SlackClient method.
 */

import { mcpLogger } from '@main/lib/logger';

import type { SlackClient } from './slack-client';
import type { StandupEntry } from './types';
import type { McpToolDefinition, McpToolResult } from '../../mcp/types';

// ── Tool Definitions ─────────────────────────────────────────

export const SLACK_TOOLS: McpToolDefinition[] = [
  {
    name: 'slack_send_message',
    description: 'Send a message to a Slack channel or DM',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel ID or name' },
        text: { type: 'string', description: 'Message text (supports Slack markdown)' },
        threadTs: { type: 'string', description: 'Thread timestamp to reply to' },
      },
      required: ['channel', 'text'],
    },
  },
  {
    name: 'slack_read_channel',
    description: 'Read recent messages from a Slack channel',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel ID' },
        limit: { type: 'number', description: 'Number of messages (default: 20, max: 100)' },
      },
      required: ['channel'],
    },
  },
  {
    name: 'slack_search',
    description: 'Search messages across the Slack workspace',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Number of results (default: 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'slack_get_threads',
    description: 'Get thread replies for a message',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel ID containing the thread' },
        threadTs: { type: 'string', description: 'Timestamp of the parent message' },
      },
      required: ['channel', 'threadTs'],
    },
  },
  {
    name: 'slack_set_status',
    description: 'Set your Slack status',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Status text' },
        emoji: { type: 'string', description: 'Status emoji (e.g. :house:)' },
        expiration: {
          type: 'number',
          description: 'Unix timestamp when status expires (0 = no expiry)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'slack_list_channels',
    description: 'List Slack channels you have access to',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max channels to return (default: 100)' },
      },
    },
  },
  {
    name: 'slack_standup',
    description:
      'Post a formatted standup update to a channel. Uses Y: (yesterday), T: (today), B: (blockers) format.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel to post standup (e.g. #standup)' },
        yesterday: { type: 'string', description: 'What you did yesterday' },
        today: { type: 'string', description: 'What you plan to do today' },
        blockers: { type: 'string', description: 'Any blockers (empty string if none)' },
      },
      required: ['channel', 'yesterday', 'today', 'blockers'],
    },
  },
];

// ── Tool Executor ────────────────────────────────────────────

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

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

/**
 * Execute a Slack tool by name with the given arguments.
 */
export async function executeSlackTool(
  client: SlackClient,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  try {
    switch (toolName) {
      case 'slack_send_message': {
        const result = await client.sendMessage({
          channel: str(args.channel),
          text: str(args.text),
          threadTs: typeof args.threadTs === 'string' ? args.threadTs : undefined,
        });
        return successResult(result);
      }

      case 'slack_read_channel': {
        const result = await client.readChannel({
          channel: str(args.channel),
          limit: num(args.limit),
        });
        return successResult(result);
      }

      case 'slack_search': {
        const result = await client.search({
          query: str(args.query),
          count: num(args.count),
        });
        return successResult(result);
      }

      case 'slack_get_threads': {
        const result = await client.getThreads({
          channel: str(args.channel),
          threadTs: str(args.threadTs),
        });
        return successResult(result);
      }

      case 'slack_set_status': {
        const result = await client.setStatus({
          text: str(args.text),
          emoji: typeof args.emoji === 'string' ? args.emoji : undefined,
          expiration: num(args.expiration),
        });
        return successResult(result);
      }

      case 'slack_list_channels': {
        const result = await client.listChannels({
          limit: num(args.limit),
        });
        return successResult(result);
      }

      case 'slack_standup': {
        const standup: StandupEntry = {
          yesterday: str(args.yesterday),
          today: str(args.today),
          blockers: str(args.blockers),
        };
        const result = await client.postStandup({
          channel: str(args.channel),
          standup,
        });
        return successResult(result);
      }

      default:
        return errorResult(`Unknown tool: ${toolName}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    mcpLogger.error(`[Slack] Tool "${toolName}" failed: ${message}`);
    return errorResult(`Slack API error: ${message}`);
  }
}
