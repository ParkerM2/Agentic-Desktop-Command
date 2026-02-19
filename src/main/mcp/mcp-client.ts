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
import http from 'node:http';
import https from 'node:https';

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

  // SSE transport state
  let sseAbortController: AbortController | null = null;
  let ssePostEndpoint: string | null = null;
  let sseLastEventId = '';
  let sseReconnecting = false;

  function setState(newState: McpConnectionState): void {
    const previousState = state;
    state = newState;
    if (previousState !== newState) {
      events.emit('connection-state-changed', config.name, newState);
    }
  }

  function sendRequest(request: JsonRpcRequest): void {
    if (config.transport === 'sse') {
      sendSseRequest(request);
      return;
    }

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

  function ssePostRequest(
    endpointUrl: string,
    body: string,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const postUrl = new URL(endpointUrl);
      const postTransport = postUrl.protocol === 'https:' ? https : http;

      const req = postTransport.request(
        endpointUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer | string) => {
            data += String(chunk);
          });
          res.on('end', () => {
            if (
              res.statusCode !== undefined &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve(data);
            } else {
              reject(
                new Error(
                  `SSE POST to ${endpointUrl} returned status ${String(res.statusCode ?? 'unknown')}`,
                ),
              );
            }
          });
        },
      );

      req.on('error', (error) => {
        reject(new Error(`SSE POST request failed: ${error.message}`));
      });

      req.write(body);
      req.end();
    });
  }

  function sendSseRequest(request: JsonRpcRequest): void {
    if (!ssePostEndpoint) {
      console.error(`[MCP] Cannot send SSE request to ${config.name}: no POST endpoint`);
      return;
    }

    const body = JSON.stringify(request);
    void (async () => {
      try {
        const responseBody = await ssePostRequest(ssePostEndpoint, body);
        // Some SSE servers return JSON-RPC responses inline on POST.
        // If the response body is non-empty JSON, process it.
        if (responseBody.trim().length > 0) {
          try {
            const responseJson = JSON.parse(responseBody) as Record<string, unknown>;
            if (typeof responseJson.id === 'string') {
              processLine(responseBody);
            }
          } catch {
            // Not JSON — the response will come via the SSE stream
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown POST error';
        console.error(`[MCP] SSE POST failed for ${config.name}:`, message);

        // Reject the pending request if it exists
        const pending = pendingRequests.get(request.id);
        if (pending) {
          pendingRequests.delete(request.id);
          clearTimeout(pending.timeoutId);
          pending.reject(new Error(message));
        }
      }
    })();
  }

  function parseSseStream(chunk: string): Array<{ event: string; data: string; id: string }> {
    const results: Array<{ event: string; data: string; id: string }> = [];
    let currentEvent = '';
    let currentData = '';
    let currentId = '';

    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.length === 0) {
        // Empty line = dispatch event
        if (currentData.length > 0) {
          results.push({ event: currentEvent, data: currentData, id: currentId });
        }
        currentEvent = '';
        currentData = '';
        currentId = '';
        continue;
      }

      if (line.startsWith(':')) {
        // Comment line — ignore
        continue;
      }

      const colonIndex = line.indexOf(':');
      let field: string;
      let value: string;

      if (colonIndex === -1) {
        field = line;
        value = '';
      } else {
        field = line.slice(0, colonIndex);
        // Skip optional space after colon
        value = line[colonIndex + 1] === ' ' ? line.slice(colonIndex + 2) : line.slice(colonIndex + 1);
      }

      switch (field) {
        case 'event': {
          currentEvent = value;
          break;
        }
        case 'data': {
          currentData = currentData.length > 0 ? `${currentData}\n${value}` : value;
          break;
        }
        case 'id': {
          currentId = value;
          break;
        }
        case 'retry': {
          // The retry field is informational; reconnect timing is handled by the manager
          break;
        }
        default: {
          break;
        }
      }
    }

    return results;
  }

  function resolveEndpointUrl(endpointPath: string, baseUrl: string): string {
    // If the endpoint is already an absolute URL, use it directly
    if (endpointPath.startsWith('http://') || endpointPath.startsWith('https://')) {
      return endpointPath;
    }
    // Otherwise resolve relative to the SSE base URL
    const base = new URL(baseUrl);
    return new URL(endpointPath, base).toString();
  }

  function sseInitialize(): void {
    const initRequest = buildJsonRpcRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'adc',
        version: '1.0.0',
      },
    });

    // Register a pending request for the initialize response
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(initRequest.id);
      console.error(`[MCP] SSE initialize timed out for ${config.name}`);
      setState('error');
      events.emit('error', config.name, new Error('SSE initialize timed out'));
    }, TOOL_CALL_TIMEOUT_MS);

    pendingRequests.set(initRequest.id, {
      resolve: () => {
        // Initialize succeeded — now list tools
        const listRequest = buildJsonRpcRequest('tools/list');
        const listTimeoutId = setTimeout(() => {
          pendingRequests.delete(listRequest.id);
          console.error(`[MCP] SSE tools/list timed out for ${config.name}`);
        }, TOOL_CALL_TIMEOUT_MS);

        pendingRequests.set(listRequest.id, {
          resolve: () => {
            // tools/list handled specially in processLine
          },
          reject: (error) => {
            console.error(`[MCP] SSE tools/list failed for ${config.name}:`, error.message);
          },
          timeoutId: listTimeoutId,
        });

        sendSseRequest(listRequest);
      },
      reject: (error) => {
        console.error(`[MCP] SSE initialize failed for ${config.name}:`, error.message);
        setState('error');
        events.emit('error', config.name, error);
      },
      timeoutId,
    });

    sendSseRequest(initRequest);
  }

  function handleSseEvent(sseEvent: { event: string; data: string; id: string }): void {
    if (sseEvent.id.length > 0) {
      sseLastEventId = sseEvent.id;
    }

    const eventType = sseEvent.event.length > 0 ? sseEvent.event : 'message';

    if (eventType === 'endpoint') {
      // The server tells us where to POST JSON-RPC requests
      const endpointPath = sseEvent.data.trim();
      if (endpointPath.length === 0) {
        console.error(`[MCP] SSE endpoint event with empty data for ${config.name}`);
        return;
      }

      ssePostEndpoint = resolveEndpointUrl(endpointPath, config.url ?? '');
      console.log(`[MCP] SSE POST endpoint for ${config.name}: ${ssePostEndpoint}`);

      // Send initialize handshake
      sseInitialize();
      return;
    }

    if (eventType === 'message') {
      // Standard JSON-RPC response delivered via SSE
      processLine(sseEvent.data);
      return;
    }

    // Unknown event types are ignored per the SSE spec
    console.log(`[MCP] SSE unknown event type "${eventType}" for ${config.name}`);
  }

  function connectSse(): void {
    if (!config.url) {
      setState('error');
      events.emit('error', config.name, new Error('No URL specified for SSE transport'));
      return;
    }

    setState('connecting');
    sseAbortController = new AbortController();
    let sseBuffer = '';

    console.log(`[MCP] SSE transport for ${config.name} connecting to ${config.url}`);

    const sseUrl = new URL(config.url);
    const transport = sseUrl.protocol === 'https:' ? https : http;

    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    };

    if (sseLastEventId.length > 0) {
      headers['Last-Event-ID'] = sseLastEventId;
    }

    const req = transport.get(config.url, { headers }, (res) => {
      if (
        res.statusCode !== undefined &&
        (res.statusCode < 200 || res.statusCode >= 300)
      ) {
        const errorMsg = `SSE connection to ${config.url ?? 'unknown'} returned status ${String(res.statusCode)}`;
        console.error(`[MCP] ${config.name}: ${errorMsg}`);
        setState('error');
        events.emit('error', config.name, new Error(errorMsg));
        return;
      }

      res.on('data', (chunk: Buffer | string) => {
        if (sseAbortController?.signal.aborted) {
          return;
        }

        sseBuffer += String(chunk);

        // SSE events are delimited by double newlines
        let boundaryIndex = sseBuffer.indexOf('\n\n');
        while (boundaryIndex !== -1) {
          const rawEvent = sseBuffer.slice(0, boundaryIndex + 2);
          sseBuffer = sseBuffer.slice(boundaryIndex + 2);

          const sseEvents = parseSseStream(rawEvent);
          for (const sseEvent of sseEvents) {
            handleSseEvent(sseEvent);
          }

          boundaryIndex = sseBuffer.indexOf('\n\n');
        }
      });

      res.on('end', () => {
        if (sseAbortController?.signal.aborted) {
          return;
        }

        console.log(`[MCP] SSE connection ended for ${config.name}`);

        // Process any remaining buffer content
        if (sseBuffer.trim().length > 0) {
          const remainingEvents = parseSseStream(`${sseBuffer}\n\n`);
          for (const sseEvent of remainingEvents) {
            handleSseEvent(sseEvent);
          }
          sseBuffer = '';
        }

        if (!sseReconnecting) {
          setState('disconnected');
          events.emit('disconnected', config.name);
        }
      });

      res.on('error', (error) => {
        if (sseAbortController?.signal.aborted) {
          return;
        }

        console.error(`[MCP] SSE stream error for ${config.name}:`, error.message);
        setState('error');
        events.emit('error', config.name, error);
      });
    });

    req.on('error', (error) => {
      if (sseAbortController?.signal.aborted) {
        return;
      }

      console.error(`[MCP] SSE request error for ${config.name}:`, error.message);
      setState('error');
      events.emit('error', config.name, error);
    });

    // Wire abort controller to destroy the request
    sseAbortController.signal.addEventListener('abort', () => {
      req.destroy();
    });
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

      // Kill the child process (stdio transport)
      if (childProcess) {
        try {
          childProcess.kill();
        } catch {
          // Process may already be dead
        }
        childProcess = null;
      }

      // Abort SSE connection (SSE transport)
      if (sseAbortController) {
        sseReconnecting = false;
        sseAbortController.abort();
        sseAbortController = null;
      }
      ssePostEndpoint = null;

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
