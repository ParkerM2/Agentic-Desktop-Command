/**
 * AssistantService — Global headless Claude CLI assistant.
 *
 * Spawns a single headless Claude CLI session via the AgentManagerService
 * that lives for the entire app lifetime. Filters the stream-json output
 * to only emit human-readable assistant text responses.
 *
 * No API key required — the CLI handles its own auth.
 */

import type { BrowserWindow } from 'electron';

import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { serviceLogger } from '@main/lib/logger';

import { createHistoryStore } from './history-store';
import { buildSystemPrompt } from './tool-definitions';

import type { AgentManagerService } from '../agent-manager';

const ASSISTANT_MODEL = 'claude-sonnet-4-6';
const EVT_THINKING = 'event:assistant.thinking';
const EVT_RESPONSE = 'event:assistant.response';

export interface AssistantProject {
  id: string;
  name: string;
  path: string;
}

export interface AssistantService {
  /** Start the global assistant session. Call after auth + hydration. */
  start: (projects: AssistantProject[]) => void;
  /** Send a command to the global assistant session. */
  sendCommand: (input: string, context?: { activeView?: string; activeProjectId?: string }) => void;
  /** Stop the global assistant session (call on app quit). */
  stop: () => void;
  getHistory: () => ReturnType<ReturnType<typeof createHistoryStore>['getEntries']>;
  clearHistory: () => void;
}

export interface AssistantServiceDeps {
  getWindow: () => BrowserWindow | null;
  agentManager: AgentManagerService;
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

export function createAssistantService(deps: AssistantServiceDeps): AssistantService {
  const { getWindow, agentManager } = deps;
  const historyStore = createHistoryStore();

  let sessionId: string | null = null;
  let eventCleanup: (() => void) | null = null;
  let lastInput = '';

  function sendEvent(channel: string, payload: unknown): void {
    getWindow()?.webContents.send(channel, payload);
  }

  /**
   * Subscribe to agent manager events for the global session.
   * Filters to only emit assistant text content as response events.
   */
  function subscribeToSession(sid: string): void {
    if (eventCleanup) eventCleanup();

    const cleanup = agentManager.onEvent((event) => {
      if (event.sessionId !== sid) return;

      if (event.type === 'message.received') {
        const message = event.data as AgentChatMessage;
        if (message.role !== 'assistant') return;

        const text = extractText(message);
        if (text.length === 0) return;

        sendEvent(EVT_RESPONSE, { content: text, type: 'text' });
        sendEvent(EVT_THINKING, { isThinking: false });

        historyStore.addEntry({
          id: `${Date.now().toString()}-${Math.random().toString(36).slice(2)}`,
          input: lastInput,
          responseSummary: text.slice(0, 200),
          timestamp: new Date().toISOString(),
        });
      }

      if (event.type === 'status.changed') {
        const { newStatus } = event.data as { newStatus: string };
        if (newStatus === 'running') {
          sendEvent(EVT_THINKING, { isThinking: true });
        } else if (newStatus === 'idle' || newStatus === 'completed') {
          sendEvent(EVT_THINKING, { isThinking: false });
        }
      }

      if (event.type === 'session.ended') {
        sendEvent(EVT_THINKING, { isThinking: false });
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
      // Session died — clean up
      if (eventCleanup) eventCleanup();
      eventCleanup = null;
      sessionId = null;
    }
    return false;
  }

  return {
    start(projects) {
      if (ensureSession()) {
        serviceLogger.info('[Assistant] Session already running, skipping start');
        return;
      }

      try {
        const systemPrompt = buildSystemPrompt(projects);
        const session = agentManager.spawnProjectOwner({
          projectPath: process.cwd(),
          prompt: systemPrompt,
          model: ASSISTANT_MODEL,
          name: 'assistant-global',
        });

        sessionId = session.id;
        subscribeToSession(session.id);
        serviceLogger.info('[Assistant] Global session started:', session.id);
        sendEvent('event:assistant.autostart', { autoStarted: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        serviceLogger.error('[Assistant] Failed to start global session:', message);
      }
    },

    sendCommand(input, _context) {
      sendEvent(EVT_THINKING, { isThinking: true });

      try {
        if (!ensureSession()) {
          sendEvent(EVT_RESPONSE, {
            content: 'Assistant session is not running. It will auto-start after login.',
            type: 'error',
          });
          sendEvent(EVT_THINKING, { isThinking: false });
          return;
        }

        lastInput = input;
        // sessionId is guaranteed non-null after ensureSession() returns true
        const sid = sessionId ?? '';
        const success = agentManager.sendMessage(sid, input);
        if (!success) {
          sendEvent(EVT_RESPONSE, {
            content: 'Failed to send message to assistant session. The session may have crashed — try again.',
            type: 'error',
          });
          sendEvent(EVT_THINKING, { isThinking: false });
          // Force respawn on next attempt
          if (eventCleanup) eventCleanup();
          eventCleanup = null;
          sessionId = null;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        sendEvent(EVT_RESPONSE, {
          content: `Error sending to assistant session: ${message}`,
          type: 'error',
        });
        sendEvent(EVT_THINKING, { isThinking: false });
      }
    },

    stop() {
      if (sessionId) {
        serviceLogger.info('[Assistant] Stopping global session:', sessionId);
        // The agent manager handles killing the process
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
