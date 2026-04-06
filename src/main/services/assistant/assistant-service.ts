/**
 * AssistantService — Headless Claude CLI assistant.
 *
 * Spawns a headless Claude CLI session via the AgentManagerService and
 * filters the stream-json output to only emit human-readable assistant
 * text responses. No API key required — the CLI handles its own auth.
 *
 * Sessions are keyed by projectPath so switching projects keeps both alive.
 */

import type { BrowserWindow } from 'electron';

import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { createHistoryStore } from './history-store';

import type { AgentManagerService } from '../agent-manager';

const ASSISTANT_MODEL = 'claude-sonnet-4-6';
const EVT_THINKING = 'event:assistant.thinking';
const EVT_RESPONSE = 'event:assistant.response';

export interface AssistantService {
  sendCommand: (
    input: string,
    projectPath: string,
    context?: { activeView?: string; activeProjectId?: string },
  ) => void;
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

interface ProjectSession {
  sessionId: string;
  eventCleanup: (() => void) | null;
  lastInput: string;
}

export function createAssistantService(deps: AssistantServiceDeps): AssistantService {
  const { getWindow, agentManager } = deps;
  const historyStore = createHistoryStore();

  /** Active sessions keyed by normalized projectPath */
  const projectSessions = new Map<string, ProjectSession>();

  function sendEvent(channel: string, payload: unknown): void {
    getWindow()?.webContents.send(channel, payload);
  }

  function normalizeKey(projectPath: string): string {
    return projectPath.replaceAll('\\', '/').toLowerCase();
  }

  /**
   * Subscribe to agent manager events for a project session.
   * Filters to only emit assistant text content as response events.
   */
  function subscribeToSession(key: string, sid: string): void {
    const ps = projectSessions.get(key);
    if (!ps) return;

    if (ps.eventCleanup) ps.eventCleanup();

    const cleanup = agentManager.onEvent((event) => {
      if (event.sessionId !== sid) return;

      if (event.type === 'message.received') {
        const message = event.data as AgentChatMessage;
        if (message.role !== 'assistant') return;

        const text = extractText(message);
        if (text.length === 0) return;

        sendEvent(EVT_RESPONSE, { content: text, type: 'text' });
        sendEvent(EVT_THINKING, { isThinking: false });

        const currentPs = projectSessions.get(key);
        historyStore.addEntry({
          id: `${Date.now().toString()}-${Math.random().toString(36).slice(2)}`,
          input: currentPs?.lastInput ?? '',
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
        const currentPs = projectSessions.get(key);
        if (currentPs) {
          if (currentPs.eventCleanup) currentPs.eventCleanup();
          projectSessions.delete(key);
        }
      }
    });

    ps.eventCleanup = cleanup;
  }

  /**
   * Ensure an assistant session exists for the given project.
   * Spawns one if needed, reuses if alive. Each projectPath gets its own session.
   */
  function ensureSession(projectPath: string): string {
    const key = normalizeKey(projectPath);
    const existing = projectSessions.get(key);

    if (existing) {
      const session = agentManager.getSession(existing.sessionId);
      if (session && session.status !== 'completed' && session.status !== 'failed') {
        return existing.sessionId;
      }
      // Session died — clean up stale entry
      if (existing.eventCleanup) existing.eventCleanup();
      projectSessions.delete(key);
    }

    const cwd = projectPath.length > 0 ? projectPath : process.cwd();
    const session = agentManager.spawnProjectOwner({
      projectPath: cwd,
      prompt: 'You are the ADC assistant. Respond concisely to user queries about their project, tasks, and development work. Await user messages.',
      model: ASSISTANT_MODEL,
      name: `assistant-${key.split('/').pop() ?? 'default'}`,
    });

    const ps: ProjectSession = {
      sessionId: session.id,
      eventCleanup: null,
      lastInput: '',
    };
    projectSessions.set(key, ps);
    subscribeToSession(key, session.id);
    return session.id;
  }

  return {
    sendCommand(input, projectPath, _context) {
      const key = normalizeKey(projectPath);
      sendEvent(EVT_THINKING, { isThinking: true });

      try {
        const sid = ensureSession(projectPath);
        // Update lastInput on the correct project session
        const ps = projectSessions.get(key);
        if (ps) ps.lastInput = input;

        const success = agentManager.sendMessage(sid, input);
        if (!success) {
          sendEvent(EVT_RESPONSE, {
            content: 'Failed to send message to assistant session. The session may have crashed — try again.',
            type: 'error',
          });
          sendEvent(EVT_THINKING, { isThinking: false });
          // Force respawn on next attempt
          const stale = projectSessions.get(key);
          if (stale?.eventCleanup) stale.eventCleanup();
          projectSessions.delete(key);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        sendEvent(EVT_RESPONSE, {
          content: `Error starting assistant session: ${message}`,
          type: 'error',
        });
        sendEvent(EVT_THINKING, { isThinking: false });
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
