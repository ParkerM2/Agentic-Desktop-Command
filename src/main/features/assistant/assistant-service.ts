/**
 * AssistantService — Global headless Claude CLI assistant.
 *
 * Spawns a single headless Claude CLI session via the AgentManagerService
 * that lives for the entire app lifetime. Intercepts tool_use blocks from
 * Claude responses, routes them through the ToolExecutor, and returns
 * tool_results back to the session.
 *
 * No API key required — the CLI handles its own auth.
 */

import type { BrowserWindow } from 'electron';

import { ASSISTANT_EVENTS } from '@shared/ipc/assistant/channels';
import type { AgentChatMessage, ToolUseBlock } from '@shared/types/agent-dashboard';

import type { AdcDatabase } from '@main/db';
import { serviceLogger } from '@main/lib/logger';

import { createHistoryStore } from './history-store';
import { buildSystemPrompt } from './tool-definitions';

import type { ToolExecutor } from './tool-executor';
import type { AgentManager } from '../../agent-host/agent-host-client';

const ASSISTANT_MODEL = 'claude-sonnet-4-6';

export interface AssistantProject {
  id: string;
  name: string;
  path: string;
}

export interface AssistantService {
  /** Start the global assistant session. Call after auth + hydration. */
  start: (projects: AssistantProject[]) => void | Promise<void>;
  /** Send a command to the global assistant session. */
  sendCommand: (input: string, context?: { activeView?: string; activeProjectId?: string }) => void;
  /** Stop the global assistant session (call on app quit). */
  stop: () => void;
  getHistory: () => ReturnType<ReturnType<typeof createHistoryStore>['getEntries']>;
  clearHistory: () => void;
}

export interface AssistantServiceDeps {
  getWindow: () => BrowserWindow | null;
  agentManager: AgentManager;
  toolExecutor: ToolExecutor | null;
  db: AdcDatabase;
}

/**
 * Extract plain text from an AgentChatMessage's content blocks.
 * Only returns human-readable text — filters out tool_use and other block types.
 */
function extractText(message: AgentChatMessage): string {
  return message.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/**
 * Extract tool_use blocks from an AgentChatMessage.
 */
function extractToolUseBlocks(message: AgentChatMessage): ToolUseBlock[] {
  return message.content.filter(
    (block): block is ToolUseBlock => block.type === 'tool_use',
  );
}

export function createAssistantService(deps: AssistantServiceDeps): AssistantService {
  const { getWindow, agentManager, toolExecutor, db } = deps;
  const historyStore = createHistoryStore({ db });

  let sessionId: string | null = null;
  let eventCleanup: (() => void) | null = null;
  let lastInput = '';

  function sendEvent(channel: string, payload: unknown): void {
    getWindow()?.webContents.send(channel, payload);
  }

  /**
   * Handle tool_use blocks: execute each tool and send results back to the session.
   */
  async function handleToolUseBlocks(sid: string, blocks: ToolUseBlock[]): Promise<void> {
    if (!toolExecutor) {
      serviceLogger.warn('[Assistant] Tool executor not available, skipping tool calls');
      return;
    }

    for (const block of blocks) {
      serviceLogger.info(`[Assistant] Executing tool: ${block.name} (id: ${block.id})`);

      try {
        const result = await toolExecutor.execute(block.name, block.input);

        // Send tool_result back to the Claude session
        const toolResultContent = JSON.stringify(
          result.success ? result.data : { error: result.error },
        );

        // Format as a tool_result message for the Claude CLI
        const toolResultMessage = JSON.stringify({
          type: 'tool_result',
          tool_use_id: block.id,
          content: toolResultContent,
          is_error: !result.success,
        });

        agentManager.sendMessage(sid, toolResultMessage);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Tool execution failed';
        serviceLogger.error(`[Assistant] Tool execution error (${block.name}):`, message);

        const errorResult = JSON.stringify({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: message }),
          is_error: true,
        });

        agentManager.sendMessage(sid, errorResult);
      }
    }
  }

  /**
   * Subscribe to agent manager events for the global session.
   * Intercepts tool_use blocks and forwards text responses to renderer.
   */
  function subscribeToSession(sid: string): void {
    if (eventCleanup) eventCleanup();

    const cleanup = agentManager.onEvent((event) => {
      if (event.sessionId !== sid) return;

      if (event.type === 'message.received') {
        const message = event.data as AgentChatMessage;
        if (message.role !== 'assistant') return;

        // Check for tool_use blocks — execute them
        const toolBlocks = extractToolUseBlocks(message);
        if (toolBlocks.length > 0) {
          void handleToolUseBlocks(sid, toolBlocks);
        }

        // Forward text content to renderer
        const text = extractText(message);
        if (text.length > 0) {
          sendEvent(ASSISTANT_EVENTS.MESSAGE.RESPONSE, { content: text, type: 'text' });
          sendEvent(ASSISTANT_EVENTS.MESSAGE.THINKING, { isThinking: false });

          historyStore.addEntry({
            id: `${Date.now().toString()}-${Math.random().toString(36).slice(2)}`,
            input: lastInput,
            responseSummary: text.slice(0, 200),
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (event.type === 'status.changed') {
        const { newStatus } = event.data as { newStatus: string };
        if (newStatus === 'running') {
          sendEvent(ASSISTANT_EVENTS.MESSAGE.THINKING, { isThinking: true });
        } else if (newStatus === 'idle' || newStatus === 'completed') {
          sendEvent(ASSISTANT_EVENTS.MESSAGE.THINKING, { isThinking: false });
        }
      }

      if (event.type === 'session.ended') {
        sendEvent(ASSISTANT_EVENTS.MESSAGE.THINKING, { isThinking: false });
        if (eventCleanup) eventCleanup();
        eventCleanup = null;
        sessionId = null;
      }
    });

    eventCleanup = cleanup;
  }

  /**
   * Ensure the global assistant session is alive.
   * Returns true if usable, false if not.
   */
  function ensureSession(): boolean {
    if (sessionId) {
      const session = agentManager.getSession(sessionId);
      if (session && session.status !== 'completed' && session.status !== 'failed') {
        return true;
      }
      if (eventCleanup) eventCleanup();
      eventCleanup = null;
      sessionId = null;
    }
    return false;
  }

  return {
    async start(projects) {
      if (ensureSession()) {
        serviceLogger.info('[Assistant] Session already running, skipping start');
        return;
      }

      try {
        const systemPrompt = buildSystemPrompt(projects);
        const session = await agentManager.spawnProjectOwner({
          projectPath: process.cwd(),
          prompt: systemPrompt,
          model: ASSISTANT_MODEL,
          name: 'assistant-global',
        });

        sessionId = session.id;
        subscribeToSession(session.id);
        serviceLogger.info('[Assistant] Global session started:', session.id);
        sendEvent(ASSISTANT_EVENTS.SESSION.AUTOSTART, { autoStarted: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        serviceLogger.error('[Assistant] Failed to start global session:', message);
      }
    },

    sendCommand(input, _context) {
      sendEvent(ASSISTANT_EVENTS.MESSAGE.THINKING, { isThinking: true });

      try {
        if (!ensureSession()) {
          sendEvent(ASSISTANT_EVENTS.MESSAGE.RESPONSE, {
            content: 'Assistant session is not running. It will auto-start after login.',
            type: 'error',
          });
          sendEvent(ASSISTANT_EVENTS.MESSAGE.THINKING, { isThinking: false });
          return;
        }

        lastInput = input;
        const sid = sessionId ?? '';
        const success = agentManager.sendMessage(sid, input);
        if (!success) {
          sendEvent(ASSISTANT_EVENTS.MESSAGE.RESPONSE, {
            content: 'Failed to send message to assistant session. The session may have crashed — try again.',
            type: 'error',
          });
          sendEvent(ASSISTANT_EVENTS.MESSAGE.THINKING, { isThinking: false });
          if (eventCleanup) eventCleanup();
          eventCleanup = null;
          sessionId = null;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        sendEvent(ASSISTANT_EVENTS.MESSAGE.RESPONSE, {
          content: `Error sending to assistant session: ${message}`,
          type: 'error',
        });
        sendEvent(ASSISTANT_EVENTS.MESSAGE.THINKING, { isThinking: false });
      }
    },

    stop() {
      if (sessionId) {
        serviceLogger.info('[Assistant] Stopping global session:', sessionId);
        agentManager.stopSession(sessionId);
        if (eventCleanup) eventCleanup();
        eventCleanup = null;
        sessionId = null;
      }
    },

    getHistory() {
      return historyStore.getEntries();
    },

    clearHistory() {
      historyStore.clear();
    },
  };
}
