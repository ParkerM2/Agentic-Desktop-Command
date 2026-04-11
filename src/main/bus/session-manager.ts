import { and, eq } from 'drizzle-orm';

import { sessions } from '../db/schema';
import { createScopedLogger } from '../lib/logger';

import type { AdcDatabase } from '../db';
import type {
  SessionEventHandler,
  SessionEventType,
  SessionFilter,
  SessionRecord,
  SessionSpawnRequest,
} from './types';
import type { AgentHostClient } from '../agent-host/agent-host-client';
import type { AgentManagerService } from '../services/agent-manager';

const logger = createScopedLogger('bus-sessions');

export interface BusSessionManager {
  spawn: (config: SessionSpawnRequest) => Promise<SessionRecord>;
  kill: (sessionId: string) => Promise<void>;
  get: (sessionId: string) => SessionRecord | undefined;
  list: (filter?: SessionFilter) => SessionRecord[];
  onEvent: (handler: SessionEventHandler) => () => void;
  recoverInterrupted: () => void;
  dispose: () => void;
}

export function createBusSessionManager(
  db: AdcDatabase,
  agentManager: AgentManagerService | AgentHostClient,
): BusSessionManager {
  const eventHandlers = new Set<SessionEventHandler>();
  const cleanups: Array<() => void> = [];

  function emitSessionEvent(type: SessionEventType, session: SessionRecord): void {
    for (const handler of eventHandlers) {
      try {
        handler({ type, session });
      } catch (err) {
        logger.error('Session event handler error:', err);
      }
    }
  }

  // Subscribe to agent-manager events to keep SQLite in sync
  const unsubAgentManager = agentManager.onEvent((event) => {
    const data = event.data as Record<string, unknown> | null;

    if (event.type === 'session.ended') {
      const existing = getSession(event.sessionId);
      if (existing) {
        const endedAt = new Date().toISOString();
        const exitCode = (data?.exitCode as number | undefined) ?? null;
        const status = exitCode === 0 ? 'completed' : 'error';
        db.update(sessions)
          .set({
            status,
            endedAt,
            exitCode,
            tokenUsage: (data?.tokenUsage as Record<string, unknown> | undefined) ?? existing.tokenUsage,
          })
          .where(eq(sessions.id, event.sessionId))
          .run();
        const updated = getSession(event.sessionId);
        if (updated) {
          emitSessionEvent(status === 'completed' ? 'completed' : 'error', updated);
        }
      }
    } else if (event.type === 'status.changed') {
      const existing = getSession(event.sessionId);
      if (existing && typeof data?.status === 'string') {
        db.update(sessions)
          .set({ status: data.status })
          .where(eq(sessions.id, event.sessionId))
          .run();
      }
    }
  });
  cleanups.push(unsubAgentManager);

  function spawn(config: SessionSpawnRequest): Promise<SessionRecord> {
    const isTeamLead = config.type === 'team-lead';

    const spawnResult = isTeamLead
      ? agentManager.spawnTeamLead({
          projectPath: config.projectPath ?? process.cwd(),
          prompt: config.prompt,
          model: config.model,
          teamName: config.teamName ?? config.name,
        })
      : agentManager.spawnProjectOwner({
          projectPath: config.projectPath ?? process.cwd(),
          prompt: config.prompt,
          name: config.name,
          model: config.model,
        });

    // SpawnTeamLeadResult is AgentSession | SpawnTeamLeadError
    if ('error' in spawnResult) {
      return Promise.reject(new Error('Failed to spawn session'));
    }
    const session = spawnResult as { id: string; pid?: number };

    const now = new Date().toISOString();
    db.insert(sessions).values({
      id: session.id,
      name: config.name,
      type: config.type,
      phase: config.phase ?? null,
      status: 'active',
      projectId: config.projectId ?? null,
      taskSlug: config.taskSlug ?? null,
      model: config.model ?? null,
      pid: session.pid ?? null,
      worktreePath: config.worktreePath ?? null,
      spawnConfig: config as unknown as Record<string, unknown>,
      tokenUsage: null,
      toolUsage: null,
      parentId: config.parentId ?? null,
      teamName: config.teamName ?? null,
      wave: config.wave ?? null,
      taskIndex: config.taskIndex ?? null,
      startedAt: now,
      endedAt: null,
      exitCode: null,
      error: null,
    }).run();

    const result = getSession(session.id);
    if (!result) {
      return Promise.reject(new Error(`Session ${session.id} not found after insert`));
    }
    emitSessionEvent('spawned', result);
    return Promise.resolve(result);
  }

  function kill(sessionId: string): Promise<void> {
    agentManager.stopSession(sessionId);
    db.update(sessions)
      .set({ status: 'killed', endedAt: new Date().toISOString() })
      .where(eq(sessions.id, sessionId))
      .run();
    const updated = getSession(sessionId);
    if (updated) {
      emitSessionEvent('killed', updated);
    }
    return Promise.resolve();
  }

  function getSession(sessionId: string): SessionRecord | undefined {
    const rows = db.select().from(sessions).where(eq(sessions.id, sessionId)).all();
    return rows[0] as SessionRecord | undefined;
  }

  function list(filter?: SessionFilter): SessionRecord[] {
    const conditions = [];
    if (filter?.status) conditions.push(eq(sessions.status, filter.status));
    if (filter?.type) conditions.push(eq(sessions.type, filter.type));
    if (filter?.projectId) conditions.push(eq(sessions.projectId, filter.projectId));
    if (filter?.taskSlug) conditions.push(eq(sessions.taskSlug, filter.taskSlug));
    if (filter?.parentId) conditions.push(eq(sessions.parentId, filter.parentId));

    let query = db.select().from(sessions);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    return query.all() as SessionRecord[];
  }

  function onEvent(handler: SessionEventHandler): () => void {
    eventHandlers.add(handler);
    return () => { eventHandlers.delete(handler); };
  }

  function recoverInterrupted(): void {
    const active = db.select().from(sessions)
      .where(eq(sessions.status, 'active'))
      .all();

    for (const session of active) {
      const {pid} = session;
      let alive = false;
      if (pid !== null && pid > 0) {
        try {
          process.kill(pid, 0);
          alive = true;
        } catch {
          alive = false;
        }
      }

      if (!alive) {
        logger.info(`Recovering interrupted session: ${session.id} (${session.name})`);
        db.update(sessions)
          .set({
            status: 'error',
            error: 'Interrupted by app restart',
            endedAt: new Date().toISOString(),
          })
          .where(eq(sessions.id, session.id))
          .run();
      }
    }
  }

  function dispose(): void {
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
    eventHandlers.clear();
  }

  return { spawn, kill, get: getSession, list, onEvent, recoverInterrupted, dispose };
}
