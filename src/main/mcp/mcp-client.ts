/**
 * MCP Client
 *
 * Generic client wrapper for connecting to MCP servers.
 * Supports both stdio and SSE transport protocols.
 * Emits events for connection state changes and tool updates.
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

import type {
  McpConnectionState,
  McpServerConfig,
  McpTool,
  McpToolResult,
  McpToolResultContent,
} from './types';

export interface McpClient {
  /** Connect to the configured MCP server. */
  connect: () => void;
  /** Disconnect from the server and clean up resources. */
  disconnect: () => void;
  /** Current connection state. */
  getState: () => McpConnectionState;
  /** Check if the client is connected and ready. */
  isConnected: () => boolean;
  /** List tools currently available from the server. */
  listTools: () => McpTool[];
  /** Call a tool by name with the given arguments. */
  callTool: (toolName: string, args: Record<string, unknown>) => Promise<McpToolResult>;
  /** Event emitter for connection lifecycle events. */
  events: EventEmitter;
  /** The server name this client is configured for. */
  serverName: string;
}

interface PendingRequest {
  resolve: (value: McpToolResult) => void;
  reject: (reason: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

const TOOL_CALL_TIMEOUT_MS = 30_000;

function buildJsonRpcRequest(method: string, params?: Record<string, unknown>): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: randomUUID(),
    method,
    params,
  };
}

function parseToolResult(result: Record<string, unknown>): McpToolResult {
  const content = Array.isArray(result.content) ? (result.content as McpToolResultContent[]) : [];
  const isError = typeof result.isError === 'boolean' ? result.isError : false;
  return { content, isError };
}

function parseToolList(result: Record<string, unknown>): McpTool[] {
  if (!Array.isArray(result.tools)) {
    return [];
  }
  return (result.tools as Array<Record<string, unknown>>).map((tool) => ({
    name: typeof tool.name === 'string' ? tool.name : '',
    description: typeof tool.description === 'string' ? tool.description : '',
    inputSchema: (tool.inputSchema as Record<string, unknown> | undefined) ?? {},
  }));
}

export function createMcpClient(config: McpServerConfig): McpClient {
  const events = new EventEmitter();
  let state: McpConnectionState = 'disconnected';
  let tools: McpTool[] = [];
  let childProcess: ChildProcess | null = null;
  let inputBuffer = '';
  const pendingRequests = new Map<string, PendingRequest>();
  const queuedCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
    resolve: (value: McpToolResult) => void;
    reject: (reason: Error) => void;
  }> = [];

  function setState(newState: McpConnectionState): void {
    const previousState = state;
    state = newState;
    if (previousState !== newState) {
      events.emit('connection-state-changed', config.name, newState);
    }
  }

  function sendRequest(request: JsonRpcRequest): void {
    if (!childProcess?.stdin?.writable) {
      console.error(`[MCP] Cannot send request to ${config.name}: stdin not writable`);
      return;
    }
    const message = JSON.stringify(request);
    childProcess.stdin.write(`${message}\n`);
  }

  function handleResponse(response: JsonRpcResponse): void {
    const pending = pendingRequests.get(response.id);
    if (!pending) {
      return;
    }

    pendingRequests.delete(response.id);
    clearTimeout(pending.timeoutId);

    if (response.error) {
      pending.reject(
        new Error(`MCP error ${String(response.error.code)}: ${response.error.message}`),
      );
      return;
    }

    if (response.result) {
      pending.resolve(parseToolResult(response.result));
      return;
    }

    pending.resolve({ content: [], isError: false });
  }

  function handleInitializeResponse(response: JsonRpcResponse): void {
    if (response.error) {
      console.error(`[MCP] Initialize failed for ${config.name}:`, response.error.message);
      setState('error');
      events.emit('error', config.name, new Error(response.error.message));
      return;
    }

    // After successful initialize, list available tools
    const listRequest = buildJsonRpcRequest('tools/list');
    sendRequest(listRequest);

    // Store a handler to process the tools/list response
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(listRequest.id);
      console.error(`[MCP] tools/list timed out for ${config.name}`);
    }, TOOL_CALL_TIMEOUT_MS);

    pendingRequests.set(listRequest.id, {
      resolve: () => {
        // tools/list response is handled specially below
      },
      reject: (error) => {
        console.error(`[MCP] tools/list failed for ${config.name}:`, error.message);
      },
      timeoutId,
    });
  }

  function processLine(line: string): void {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return;
    }

    // Check if this is a response (has id field)
    if (typeof parsed.id === 'string') {
      const response = parsed as unknown as JsonRpcResponse;

      // Check if this is a tools/list response (has tools array in result)
      const { result } = response;
      if (result && Array.isArray(result.tools)) {
        const pending = pendingRequests.get(response.id);
        if (pending) {
          pendingRequests.delete(response.id);
          clearTimeout(pending.timeoutId);
        }

        tools = parseToolList(result);
        setState('connected');
        events.emit('connected', config.name);
        events.emit('tools-updated', config.name, [...tools]);

        // Process any queued calls
        drainQueue();
        return;
      }

      handleResponse(response);
    }
  }

  function handleStdout(data: Buffer | string): void {
    inputBuffer += String(data);
    const lines = inputBuffer.split('\n');
    // Keep the last incomplete line in the buffer
    inputBuffer = lines.pop() ?? '';

    for (const line of lines) {
      processLine(line);
    }
  }

  function drainQueue(): void {
    while (queuedCalls.length > 0) {
      const call = queuedCalls.shift();
      if (call) {
        void callToolInternal(call.toolName, call.args).then(call.resolve, call.reject);
      }
    }
  }

  function callToolInternal(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<McpToolResult> {
    return new Promise<McpToolResult>((resolve, reject) => {
      const tool = tools.find((t) => t.name === toolName);
      if (!tool) {
        reject(new Error(`Tool "${toolName}" not found on server "${config.name}"`));
        return;
      }

      const request = buildJsonRpcRequest('tools/call', {
        name: toolName,
        arguments: args,
      });

      const timeoutId = setTimeout(() => {
        pendingRequests.delete(request.id);
        reject(
          new Error(`Tool call "${toolName}" timed out after ${String(TOOL_CALL_TIMEOUT_MS)}ms`),
        );
      }, TOOL_CALL_TIMEOUT_MS);

      pendingRequests.set(request.id, { resolve, reject, timeoutId });
      sendRequest(request);
    });
  }

  function connectStdio(): void {
    if (!config.command) {
      setState('error');
      events.emit('error', config.name, new Error('No command specified for stdio transport'));
      return;
    }

    setState('connecting');

    try {
      childProcess = spawn(config.command, config.args ?? [], {
        env: { ...process.env, ...(config.env ?? {}) },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      childProcess.stdout?.on('data', handleStdout);

      childProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`[MCP] ${config.name} stderr:`, String(data));
      });

      childProcess.on('error', (error) => {
        console.error(`[MCP] ${config.name} process error:`, error.message);
        setState('error');
        events.emit('error', config.name, error);
      });

      childProcess.on('exit', (code) => {
        console.log(`[MCP] ${config.name} process exited with code ${String(code)}`);
        // Clean up pending requests
        for (const [id, pending] of pendingRequests) {
          clearTimeout(pending.timeoutId);
          pending.reject(new Error(`Server process exited with code ${String(code)}`));
          pendingRequests.delete(id);
        }
        childProcess = null;
        setState('disconnected');
        events.emit('disconnected', config.name);
      });

      // Send initialize request
      const initRequest = buildJsonRpcRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'adc',
          version: '1.0.0',
        },
      });

      sendRequest(initRequest);
      handleInitializeResponse({ jsonrpc: '2.0', id: initRequest.id, result: {} });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown spawn error';
      console.error(`[MCP] Failed to spawn ${config.name}:`, errorMessage);
      setState('error');
      events.emit('error', config.name, new Error(errorMessage));
    }
  }

  function connectSse(): void {
    if (!config.url) {
      setState('error');
      events.emit('error', config.name, new Error('No URL specified for SSE transport'));
      return;
    }

    setState('connecting');

    // SSE transport is a placeholder — will be implemented when SSE servers are needed.
    // For now, emit an error indicating SSE is not yet supported.
    console.log(`[MCP] SSE transport for ${config.name} connecting to ${config.url}`);
    setState('error');
    events.emit('error', config.name, new Error('SSE transport is not yet implemented'));
  }

  return {
    serverName: config.name,
    events,

    connect() {
      if (state === 'connected' || state === 'connecting') {
        return;
      }

      if (config.transport === 'stdio') {
        connectStdio();
      } else {
        connectSse();
      }
    },

    disconnect() {
      // Clear all pending requests
      for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error('Client disconnected'));
        pendingRequests.delete(id);
      }

      // Reject queued calls
      for (const call of queuedCalls) {
        call.reject(new Error('Client disconnected'));
      }
      queuedCalls.length = 0;

      // Kill the child process
      if (childProcess) {
        try {
          childProcess.kill();
        } catch {
          // Process may already be dead
        }
        childProcess = null;
      }

      tools = [];
      inputBuffer = '';
      setState('disconnected');
      events.emit('disconnected', config.name);
    },

    getState() {
      return state;
    },

    isConnected() {
      return state === 'connected';
    },

    listTools() {
      return [...tools];
    },

    callTool(toolName, args) {
      if (state === 'disconnected' || state === 'error') {
        return Promise.reject(new Error(`Cannot call tool: client is ${state}`));
      }

      // Queue calls while connecting
      if (state === 'connecting') {
        return new Promise<McpToolResult>((resolve, reject) => {
          queuedCalls.push({ toolName, args, resolve, reject });
        });
      }

      return callToolInternal(toolName, args);
    },
  };
}
