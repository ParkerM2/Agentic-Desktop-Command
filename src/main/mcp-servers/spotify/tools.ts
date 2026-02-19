/**
 * Spotify MCP Tool Definitions
 *
 * Defines the tools that the assistant can invoke to control
 * Spotify playback. Each tool maps to a SpotifyClient method.
 */

import { mcpLogger } from '@main/lib/logger';

import type { SpotifyClient } from './spotify-client';
import type { McpToolDefinition, McpToolResult } from '../../mcp/types';

// ── Constants ────────────────────────────────────────────────

const DEVICE_ID_DESC = 'Target device ID';

// ── Tool Definitions ─────────────────────────────────────────

export const SPOTIFY_TOOLS: McpToolDefinition[] = [
  {
    name: 'spotify_get_playing',
    description: 'Get the currently playing track and playback state',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'spotify_play',
    description: 'Start or resume playback, optionally with a specific track URI',
    inputSchema: {
      type: 'object',
      properties: {
        uri: { type: 'string', description: 'Spotify URI to play (e.g. spotify:track:...)' },
        deviceId: { type: 'string', description: DEVICE_ID_DESC },
      },
    },
  },
  {
    name: 'spotify_pause',
    description: 'Pause the current playback',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: DEVICE_ID_DESC },
      },
    },
  },
  {
    name: 'spotify_next',
    description: 'Skip to the next track',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: DEVICE_ID_DESC },
      },
    },
  },
  {
    name: 'spotify_previous',
    description: 'Skip to the previous track',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: DEVICE_ID_DESC },
      },
    },
  },
  {
    name: 'spotify_search',
    description: 'Search for tracks on Spotify',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g. "lo-fi beats")' },
        limit: { type: 'number', description: 'Number of results (default: 10, max: 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'spotify_set_volume',
    description: 'Set the playback volume (0-100)',
    inputSchema: {
      type: 'object',
      properties: {
        volumePercent: { type: 'number', description: 'Volume level 0-100' },
        deviceId: { type: 'string', description: DEVICE_ID_DESC },
      },
      required: ['volumePercent'],
    },
  },
  {
    name: 'spotify_add_to_queue',
    description: 'Add a track to the playback queue',
    inputSchema: {
      type: 'object',
      properties: {
        uri: { type: 'string', description: 'Spotify URI to queue (e.g. spotify:track:...)' },
        deviceId: { type: 'string', description: DEVICE_ID_DESC },
      },
      required: ['uri'],
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
 * Execute a Spotify tool by name with the given arguments.
 */
export async function executeSpotifyTool(
  client: SpotifyClient,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  try {
    switch (toolName) {
      case 'spotify_get_playing': {
        const state = await client.getPlaybackState();
        if (!state) {
          return successResult({ message: 'No active playback' });
        }
        return successResult({
          isPlaying: state.is_playing,
          track: state.item?.name ?? 'Unknown',
          artist: state.item?.artists.map((a) => a.name).join(', ') ?? 'Unknown',
          album: state.item?.album.name ?? 'Unknown',
          progressMs: state.progress_ms,
          durationMs: state.item?.duration_ms,
          device: state.device.name,
          volume: state.device.volume_percent,
          shuffle: state.shuffle_state,
          repeat: state.repeat_state,
        });
      }

      case 'spotify_play': {
        const uri = typeof args.uri === 'string' ? args.uri : undefined;
        const deviceId = typeof args.deviceId === 'string' ? args.deviceId : undefined;
        const result = await client.play({ uri, deviceId });
        return successResult(result);
      }

      case 'spotify_pause': {
        const deviceId = typeof args.deviceId === 'string' ? args.deviceId : undefined;
        const result = await client.pause({ deviceId });
        return successResult(result);
      }

      case 'spotify_next': {
        const deviceId = typeof args.deviceId === 'string' ? args.deviceId : undefined;
        const result = await client.next({ deviceId });
        return successResult(result);
      }

      case 'spotify_previous': {
        const deviceId = typeof args.deviceId === 'string' ? args.deviceId : undefined;
        const result = await client.previous({ deviceId });
        return successResult(result);
      }

      case 'spotify_search': {
        const tracks = await client.search({
          query: str(args.query),
          limit: num(args.limit),
        });
        return successResult(
          tracks.map((t) => ({
            name: t.name,
            artist: t.artists.map((a) => a.name).join(', '),
            album: t.album.name,
            uri: t.uri,
            durationMs: t.duration_ms,
          })),
        );
      }

      case 'spotify_set_volume': {
        const result = await client.setVolume({
          volumePercent: num(args.volumePercent) ?? 50,
          deviceId: typeof args.deviceId === 'string' ? args.deviceId : undefined,
        });
        return successResult(result);
      }

      case 'spotify_add_to_queue': {
        const result = await client.addToQueue({
          uri: str(args.uri),
          deviceId: typeof args.deviceId === 'string' ? args.deviceId : undefined,
        });
        return successResult(result);
      }

      default:
        return errorResult(`Unknown tool: ${toolName}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    mcpLogger.error(`[Spotify] Tool "${toolName}" failed: ${message}`);
    return errorResult(`Spotify API error: ${message}`);
  }
}
