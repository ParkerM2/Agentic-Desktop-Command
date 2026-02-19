/**
 * Browser MCP Tool Definitions
 *
 * Provides tools for opening URLs and apps via the system shell.
 * Uses Electron's shell module for safe external URL handling.
 */

import { shell } from 'electron';

import { mcpLogger } from '@main/lib/logger';

import type { McpToolDefinition, McpToolResult } from '../../mcp/types';

// ── Tool Definitions ─────────────────────────────────────────

export const BROWSER_TOOLS: McpToolDefinition[] = [
  {
    name: 'browser_open_url',
    description: 'Open a URL in the default browser',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to open (must be http:// or https://)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_search',
    description: 'Search the web using the default browser',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        engine: {
          type: 'string',
          enum: ['google', 'duckduckgo', 'bing'],
          description: 'Search engine (default: google)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'browser_open_app',
    description: 'Open a file or application using the system default handler',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File or application path to open' },
      },
      required: ['path'],
    },
  },
];

// ── Constants ────────────────────────────────────────────────

const SEARCH_ENGINES: Record<string, string> = {
  google: 'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  bing: 'https://www.bing.com/search?q=',
};

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

function isValidUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}

/**
 * Execute a Browser tool by name with the given arguments.
 */
export async function executeBrowserTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  try {
    switch (toolName) {
      case 'browser_open_url': {
        const url = typeof args.url === 'string' ? args.url : '';
        if (!isValidUrl(url)) {
          return errorResult('URL must start with http:// or https://');
        }
        await shell.openExternal(url);
        return successResult({ opened: url });
      }

      case 'browser_search': {
        const query = typeof args.query === 'string' ? args.query : '';
        const engine = typeof args.engine === 'string' ? args.engine : 'google';
        const baseUrl = SEARCH_ENGINES[engine] ?? SEARCH_ENGINES.google;
        const searchUrl = `${baseUrl}${encodeURIComponent(query)}`;
        await shell.openExternal(searchUrl);
        return successResult({ searched: query, engine, url: searchUrl });
      }

      case 'browser_open_app': {
        const filePath = typeof args.path === 'string' ? args.path : '';
        if (filePath.length === 0) {
          return errorResult('Path is required');
        }
        await shell.openPath(filePath);
        return successResult({ opened: filePath });
      }

      default:
        return errorResult(`Unknown tool: ${toolName}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    mcpLogger.error(`[Browser] Tool "${toolName}" failed: ${message}`);
    return errorResult(`Browser error: ${message}`);
  }
}
