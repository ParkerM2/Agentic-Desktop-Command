/**
 * Agent Manager Service — Spawns and manages headless Claude processes
 *
 * Phase 1 of the ADC v2 architecture. Replaces terminal-service for
 * agent monitoring. Uses stream-json protocol for bidirectional
 * structured communication with Claude CLI.
 *
 * This service handles Project Owner sessions (headless stream-json).
 * Team Lead sessions use stdin-based spawn (SubprocessStrategy).
 */

import { randomUUID } from 'node:crypto';

import type {
  AgentChatMessage,
  AgentSession,
  AgentSessionType,
  AgentStatus,
  AgentTokenUsage,
  StreamJsonEvent,
} from '@shared/types/agent-dashboard';


import { agentLogger } from '@main/lib/logger';

import { createProcessManager } from './process-manager';
import { createStreamJsonParser } from './stream-json-parser';
import { SubprocessStrategy } from './subprocess-strategy';

import type { AgentConnectionStrategy } from './agent-connection-strategy';
import type { ManagedProcess } from './process-manager';
import type { StreamJsonParser } from './stream-json-parser';

// ── Configuration Types ──────────────────────────────────────

/** Config for spawning a headless Project Owner session */
export interface ProjectOwnerConfig {
  projectPath: string;
  prompt: string;
  model?: string;
  name?: string;
  projectId?: string;
}

/** Config for spawning a Team Lead session */
export interface TeamLeadConfig {
  projectPath: string;
  teamName: string;
  prompt: string;
  model?: string;
  name?: string;
  projectId?: string;
}

// ── Event Types ──────────────────────────────────────────────

export type AgentManagerEventType =
  | 'session.started'
  | 'session.ended'
  | 'message.received'
  | 'status.changed'
  | 'stream.event';

export interface AgentManagerEvent {
  type: AgentManagerEventType;
  sessionId: string;
  data: unknown;
}

type AgentManagerEventHandler = (event: AgentManagerEvent) => void;

// ── Result Types ────────────────────────────────────────────

export interface SpawnTeamLeadError {
  error: 'spawn_failed';
  session: null;
}

export type SpawnTeamLeadResult = AgentSession | SpawnTeamLeadError;

// ── Service Interface ────────────────────────────────────────

export interface AgentManagerService {
  /** Spawn a headless stream-json Project Owner session */
  spawnProjectOwner: (config: ProjectOwnerConfig) => AgentSession;
  /** Spawn a Team Lead session */
  spawnTeamLead: (config: TeamLeadConfig) => SpawnTeamLeadResult;
  /** List all active agent sessions */
  listSessions: (filter?: { type?: AgentSessionType; teamName?: string }) => AgentSession[];
  /** Get a single session by ID */
  getSession: (sessionId: string) => AgentSession | undefined;
  /** Send a message to an agent session */
  sendMessage: (sessionId: string, message: string) => boolean;
  /** Stop an agent session gracefully */
  stopSession: (sessionId: string) => boolean;
  /** Register a handler for agent manager events */
  onEvent: (handler: AgentManagerEventHandler) => () => void;
  /** Get the working directory (project path) for a session */
  getSessionProjectPath: (sessionId: string) => string | undefined;
  /** Get chat messages for a session */
  getMessages: (sessionId: string) => AgentChatMessage[];
  /** Clean up all sessions (used during app shutdown) */
  dispose: () => void;
}

// ── Internal Session Tracking ────────────────────────────────

interface InternalSession {
  session: AgentSession;
  process: ManagedProcess | null;
  parser: StreamJsonParser | null;
  messages: AgentChatMessage[];
  cleanups: Array<() => void>;
  /** Working directory the agent was spawned in */
  cwd?: string;
}

// ── Factory ──────────────────────────────────────────────────

export interface AgentManagerDeps {
  /** Optional connection strategy — defaults to SubprocessStrategy */
  strategy?: AgentConnectionStrategy;
}

/**
 * Create an AgentManagerService instance.
 *
 * Follows the ADC factory pattern: returns synchronous values,
 * emits events via IPC router for renderer updates.
 */
export function createAgentManagerService(deps: AgentManagerDeps): AgentManagerService {
  const processManager = createProcessManager();
  // Strategy is available for future use — currently SubprocessStrategy delegates to processManager
  const _strategy: AgentConnectionStrategy = deps.strategy ?? new SubprocessStrategy(processManager);
  const sessions = new Map<string, InternalSession>();
  const eventHandlers = new Set<AgentManagerEventHandler>();

  // ── Event Emission ───────────────────────────────────────

  function emitEvent(event: AgentManagerEvent): void {
    for (const handler of eventHandlers) {
      handler(event);
    }
  }

  function updateSessionStatus(internal: InternalSession, newStatus: AgentStatus): void {
    const previousStatus = internal.session.status;
    if (previousStatus === newStatus) {
      return;
    }

    internal.session.status = newStatus;
    internal.session.lastActivityAt = new Date().toISOString();

    emitEvent({
      type: 'status.changed',
      sessionId: internal.session.id,
      data: {
        sessionId: internal.session.id,
        previousStatus,
        newStatus,
      },
    });
  }

  function updateTokenUsage(internal: InternalSession, usage: AgentTokenUsage): void {
    internal.session.tokenUsage = {
      input: internal.session.tokenUsage.input + usage.input,
      output: internal.session.tokenUsage.output + usage.output,
    };
  }

  // ── Stream Event Processing ──────────────────────────────

  function handleStreamEvent(internal: InternalSession, event: StreamJsonEvent): void {
    internal.session.lastActivityAt = new Date().toISOString();

    // Extract model from system init event
    if (event.type === 'system' && event.system?.model) {
      internal.session.model = event.system.model;
    }

    // Update token usage from result events
    if (event.type === 'result' && event.usage) {
      updateTokenUsage(internal, {
        input: event.usage.input_tokens,
        output: event.usage.output_tokens,
      });
    }

    // Update status based on event type
    if (event.type === 'assistant' || event.type === 'stream_event') {
      updateSessionStatus(internal, 'running');
    } else if (event.type === 'result') {
      updateSessionStatus(internal, 'idle');
    }

    // Emit stream event to renderer
    emitEvent({
      type: 'stream.event',
      sessionId: internal.session.id,
      data: {
        sessionId: internal.session.id,
        event,
      },
    });
  }

  function handleChatMessage(internal: InternalSession, message: AgentChatMessage): void {
    internal.messages.push(message);

    emitEvent({
      type: 'message.received',
      sessionId: internal.session.id,
      data: message,
    });
  }

  // ── Session Creation Helpers ─────────────────────────────

  function createSessionObject(
    type: AgentSessionType,
    config: { name?: string; model?: string; teamName?: string; projectPath?: string; projectId?: string },
  ): AgentSession {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      name: config.name ?? `${type}-${Date.now().toString(36)}`,
      type,
      status: 'running',
      model: config.model ?? 'claude-sonnet-4-6',
      teamName: config.teamName,
      projectId: config.projectId,
      branch: undefined,
      sessionJsonlPath: undefined,
      tokenUsage: { input: 0, output: 0 },
      startedAt: now,
      lastActivityAt: now,
    };
  }

  function wireProcessToParser(internal: InternalSession): void {
    const { process: managedProcess, parser } = internal;
    if (!managedProcess || !parser) {
      return;
    }

    const events = processManager.events(managedProcess);

    // Pipe stdout to parser
    const cleanStdout = events.onStdout((data) => {
      parser.feed(data);
    });
    internal.cleanups.push(cleanStdout);

    // Log stderr
    const cleanStderr = events.onStderr((data) => {
      agentLogger.warn(`[AgentManager] stderr (${internal.session.id}): ${data.trim()}`);
    });
    internal.cleanups.push(cleanStderr);

    // Handle process exit
    const cleanExit = events.onExit((code, signal) => {
      const exitStatus: AgentStatus = code === 0 ? 'completed' : 'failed';
      updateSessionStatus(internal, exitStatus);

      emitEvent({
        type: 'session.ended',
        sessionId: internal.session.id,
        data: {
          sessionId: internal.session.id,
          status: exitStatus,
          exitCode: code ?? undefined,
          signal: signal ?? undefined,
        },
      });
    });
    internal.cleanups.push(cleanExit);

    // Handle process errors
    const cleanError = events.onError((error) => {
      agentLogger.error(
        `[AgentManager] Process error (${internal.session.id}): ${error.message}`,
      );
      updateSessionStatus(internal, 'failed');
    });
    internal.cleanups.push(cleanError);

    // Wire parser events
    const cleanParserEvent = parser.onEvent((event) => {
      handleStreamEvent(internal, event);
    });
    internal.cleanups.push(cleanParserEvent);

    const cleanParserMessage = parser.onMessage((message) => {
      handleChatMessage(internal, message);
    });
    internal.cleanups.push(cleanParserMessage);

    const cleanParserError = parser.onError((error, rawLine) => {
      agentLogger.warn(
        `[AgentManager] Parse error (${internal.session.id}): ${error.message} — line: ${rawLine.slice(0, 200)}`,
      );
    });
    internal.cleanups.push(cleanParserError);
  }

  // ── Public API ───────────────────────────────────────────

  return {
    spawnProjectOwner(config) {
      const session = createSessionObject('project-owner', {
        name: config.name,
        model: config.model,
        projectId: config.projectId,
      });

      const managedProcess = processManager.spawn({
        cwd: config.projectPath,
        prompt: config.prompt,
        model: config.model,
        name: config.name,
      });

      const parser = createStreamJsonParser(session.id);

      const internal: InternalSession = {
        session,
        process: managedProcess,
        parser,
        messages: [],
        cleanups: [],
        cwd: config.projectPath,
      };

      sessions.set(session.id, internal);
      wireProcessToParser(internal);

      emitEvent({
        type: 'session.started',
        sessionId: session.id,
        data: session,
      });

      agentLogger.info(
        `[AgentManager] Project Owner session started: ${session.id} (PID ${String(managedProcess.pid)})`,
      );

      return session;
    },

    spawnTeamLead(config) {
      const session = createSessionObject('team-lead', {
        name: config.name,
        model: config.model,
        teamName: config.teamName,
        projectId: config.projectId,
      });

      // Team-lead is spawned as a TOP-LEVEL session (no agentFlags).
      // This allows it to use the Agent tool to spawn subagents.
      // Team members (spawned with --agent-id) cannot spawn further agents.
      let managedProcess: ReturnType<typeof processManager.spawn>;
      try {
        managedProcess = processManager.spawn({
          cwd: config.projectPath,
          prompt: config.prompt,
          model: config.model,
          name: config.name,
        });
      } catch (error) {
        agentLogger.error(
          `[AgentManager] processManager.spawn failed for Team Lead: ${error instanceof Error ? error.message : String(error)}`,
        );
        return { error: 'spawn_failed' as const, session: null };
      }

      const parser = createStreamJsonParser(session.id);

      const internal: InternalSession = {
        session,
        process: managedProcess,
        parser,
        messages: [],
        cleanups: [],
        cwd: config.projectPath,
      };

      sessions.set(session.id, internal);
      wireProcessToParser(internal);

      agentLogger.info(
        `[AgentManager] Team Lead session started: ${session.id} (PID ${String(managedProcess.pid)})`,
      );

      emitEvent({
        type: 'session.started',
        sessionId: session.id,
        data: session,
      });

      return session;
    },

    listSessions(filter) {
      const allSessions = Array.from(sessions.values()).map((s) => s.session);

      if (!filter) {
        return allSessions;
      }

      return allSessions.filter((s) => {
        if (filter.type && s.type !== filter.type) {
          return false;
        }
        if (filter.teamName && s.teamName !== filter.teamName) {
          return false;
        }
        return true;
      });
    },

    getSession(sessionId) {
      return sessions.get(sessionId)?.session;
    },

    getSessionProjectPath(sessionId) {
      return sessions.get(sessionId)?.cwd;
    },

    sendMessage(sessionId, message) {
      const internal = sessions.get(sessionId);
      if (!internal) {
        agentLogger.warn(`[AgentManager] sendMessage: session not found: ${sessionId}`);
        return false;
      }

      if (!internal.process) {
        agentLogger.warn(`[AgentManager] sendMessage: no process for session: ${sessionId}`);
        return false;
      }

      const success = processManager.sendMessage(internal.process, message);
      if (success) {
        internal.session.lastActivityAt = new Date().toISOString();

        // Emit user message to UI so it appears in chat bubbles
        const userMessage: AgentChatMessage = {
          id: randomUUID(),
          agentId: sessionId,
          role: 'user',
          content: [{ type: 'text', text: message }],
          timestamp: new Date().toISOString(),
        };
        handleChatMessage(internal, userMessage);
      }
      return success;
    },

    stopSession(sessionId) {
      const internal = sessions.get(sessionId);
      if (!internal) {
        agentLogger.warn(`[AgentManager] stopSession: session not found: ${sessionId}`);
        return false;
      }

      // Clean up all event listeners (removes onExit handler so it doesn't double-fire)
      for (const cleanup of internal.cleanups) {
        cleanup();
      }
      internal.cleanups = [];

      // Kill the process if it exists
      if (internal.process) {
        processManager.kill(internal.process);
      }

      // Reset parser state
      if (internal.parser) {
        internal.parser.reset();
      }

      // Update status if not already terminal
      if (internal.session.status !== 'completed' && internal.session.status !== 'failed') {
        updateSessionStatus(internal, 'completed');
      }

      // Emit session.ended so subscribers (AssistantService, WorkspaceSessionManager) can clean up.
      // The normal onExit handler was removed above, so we must emit manually.
      emitEvent({
        type: 'session.ended',
        sessionId: internal.session.id,
        data: {
          sessionId: internal.session.id,
          status: 'completed' as const,
          exitCode: undefined,
          signal: null,
        },
      });

      agentLogger.info(`[AgentManager] Session stopped: ${sessionId}`);
      return true;
    },

    onEvent(handler) {
      eventHandlers.add(handler);
      return () => {
        eventHandlers.delete(handler);
      };
    },

    getMessages(sessionId) {
      return sessions.get(sessionId)?.messages ?? [];
    },

    dispose() {
      agentLogger.info(`[AgentManager] Disposing all sessions (${String(sessions.size)} active)`);
      for (const [sessionId] of sessions) {
        // Use the public stopSession to ensure cleanup
        const internal = sessions.get(sessionId);
        if (internal) {
          for (const cleanup of internal.cleanups) {
            cleanup();
          }
          internal.cleanups = [];
          if (internal.process) {
            processManager.kill(internal.process);
          }
          if (internal.parser) {
            internal.parser.reset();
          }
        }
      }
      sessions.clear();
      eventHandlers.clear();
    },
  };
}
