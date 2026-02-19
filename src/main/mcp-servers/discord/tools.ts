/**
 * Discord MCP Tool Definitions
 *
 * Defines the tools that the assistant can invoke to interact
 * with Discord. Each tool maps to a DiscordClient method.
 */

import { mcpLogger } from '@main/lib/logger';

import type { DiscordClient } from './discord-client';
import type { DiscordStatusType } from './types';
import type { McpToolDefinition, McpToolResult } from '../../mcp/types';

// ── Tool Definitions ─────────────────────────────────────────

export const DISCORD_TOOLS: McpToolDefinition[] = [
  {
    name: 'discord_send_message',
    description: 'Send a message to a Discord channel',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Discord channel ID' },
        content: { type: 'string', description: 'Message content (supports Discord markdown)' },
      },
      required: ['channelId', 'content'],
    },
  },
  {
    name: 'discord_call_user',
    description: 'Open a voice/video call with a Discord user (opens Discord app)',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Discord user ID to call' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'discord_read_channel',
    description: 'Read recent messages from a Discord channel',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Discord channel ID' },
        limit: { type: 'number', description: 'Number of messages (default: 20, max: 100)' },
      },
      required: ['channelId'],
    },
  },
  {
    name: 'discord_list_servers',
    description: 'List Discord servers (guilds) you are a member of',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'discord_set_status',
    description: 'Set your Discord presence status',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['online', 'dnd', 'idle', 'invisible'],
          description: 'Presence status',
        },
        activityName: { type: 'string', description: 'Custom activity name (optional)' },
      },
      required: ['status'],
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

const VALID_STATUSES = new Set<string>(['online', 'dnd', 'idle', 'invisible']);

/**
 * Execute a Discord tool by name with the given arguments.
 */
export async function executeDiscordTool(
  client: DiscordClient,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  try {
    switch (toolName) {
      case 'discord_send_message': {
        const result = await client.sendMessage({
          channelId: str(args.channelId),
          content: str(args.content),
        });
        return successResult(result);
      }

      case 'discord_call_user': {
        const result = await client.callUser({
          userId: str(args.userId),
        });
        return successResult(result);
      }

      case 'discord_read_channel': {
        const result = await client.readChannel({
          channelId: str(args.channelId),
          limit: num(args.limit),
        });
        return successResult(result);
      }

      case 'discord_list_servers': {
        const result = await client.listServers();
        return successResult(result);
      }

      case 'discord_set_status': {
        const statusStr = str(args.status, 'online');
        const status: DiscordStatusType = VALID_STATUSES.has(statusStr)
          ? (statusStr as DiscordStatusType)
          : 'online';
        const result = await client.setStatus({
          status,
          activityName: typeof args.activityName === 'string' ? args.activityName : undefined,
        });
        return successResult(result);
      }

      default:
        return errorResult(`Unknown tool: ${toolName}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    mcpLogger.error(`[Discord] Tool "${toolName}" failed: ${message}`);
    return errorResult(`Discord API error: ${message}`);
  }
}
