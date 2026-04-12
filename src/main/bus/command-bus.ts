import { randomUUID } from 'node:crypto';

import { and, desc, eq, gte } from 'drizzle-orm';

import { busEvents, commands } from '../db/schema';
import { createScopedLogger } from '../lib/logger';

import { isMutationVerb, parseChannel } from './types';

import type {
  BusResult,
  CommandFilter,
  CommandHandler,
  CommandRecord,
  CommandSource,
  EventFilter,
  EventRecord,
  RegisteredCommand,
} from './types';
import type { AdcDatabase } from '../db';

const logger = createScopedLogger('command-bus');

type EventHandler = (channel: string, payload: unknown) => void;

export interface CommandBus {
  dispatch: (channel: string, input: unknown, source: CommandSource) => Promise<BusResult>;
  emit: (channel: string, payload: unknown, context?: { commandId?: string; sessionId?: string; projectId?: string }) => void;
  on: (channel: string, handler: EventHandler) => () => void;
  onAny: (handler: EventHandler) => () => void;
  registerHandler: (channel: string, handler: CommandHandler) => void;
  registerDynamic: (channel: string, handler: CommandHandler) => void;
  getRegistry: () => RegisteredCommand[];
  queryCommands: (filter: CommandFilter) => CommandRecord[];
  queryEvents: (filter: EventFilter) => EventRecord[];
  dispose: () => void;
}

export function createCommandBus(db: AdcDatabase): CommandBus {
  const handlers = new Map<string, CommandHandler>();
  const eventListeners = new Map<string, Set<EventHandler>>();
  const anyListeners = new Set<EventHandler>();

  // Track the "current" command ID for correlating events
  let activeCommandId: string | null = null;

  function dispatch(channel: string, input: unknown, source: CommandSource): Promise<BusResult> {
    const id = randomUUID();
    const { domain, verb, noun } = parseChannel(channel);
    const mutation = isMutationVerb(verb);
    const startTime = Date.now();

    // Write pending command
    db.insert(commands).values({
      id,
      channel,
      domain,
      verb,
      noun,
      isMutation: mutation,
      sourceType: source.type,
      sourceId: source.id ?? null,
      sourceName: source.name ?? null,
      input: input as Record<string, unknown>,
      output: null,
      status: 'pending',
      error: null,
      durationMs: null,
      projectId: null,
      createdAt: new Date().toISOString(),
    }).run();

    const handler = handlers.get(channel);
    if (!handler) {
      const error = `No handler registered for channel: ${channel}`;
      logger.warn(error);
      db.update(commands)
        .set({ status: 'error', error, durationMs: Date.now() - startTime })
        .where(eq(commands.id, id))
        .run();
      return Promise.resolve({ commandId: id, status: 'error', output: null, durationMs: Date.now() - startTime, error });
    }

    activeCommandId = id;

    return handler(input)
      .then((output) => {
        const durationMs = Date.now() - startTime;
        db.update(commands)
          .set({ status: 'success', output: output as Record<string, unknown>, durationMs })
          .where(eq(commands.id, id))
          .run();
        activeCommandId = null;
        return { commandId: id, status: 'success' as const, output, durationMs };
      })
      .catch((err: unknown) => {
        const durationMs = Date.now() - startTime;
        const error = err instanceof Error ? err.message : String(err);
        db.update(commands)
          .set({ status: 'error', error, durationMs })
          .where(eq(commands.id, id))
          .run();
        activeCommandId = null;
        return { commandId: id, status: 'error' as const, output: null, durationMs, error };
      });
  }

  function emit(
    channel: string,
    payload: unknown,
    context?: { commandId?: string; sessionId?: string; projectId?: string },
  ): void {
    const id = randomUUID();
    db.insert(busEvents).values({
      id,
      channel,
      payload: payload as Record<string, unknown>,
      sourceCommandId: context?.commandId ?? activeCommandId,
      sessionId: context?.sessionId ?? null,
      projectId: context?.projectId ?? null,
      createdAt: new Date().toISOString(),
    }).run();

    // Notify listeners
    const channelListeners = eventListeners.get(channel);
    if (channelListeners) {
      for (const handler of channelListeners) {
        try {
          handler(channel, payload);
        } catch (err) {
          logger.error(`Event handler error for ${channel}:`, err);
        }
      }
    }
    for (const handler of anyListeners) {
      try {
        handler(channel, payload);
      } catch (err) {
        logger.error('Any-event handler error:', err);
      }
    }
  }

  function on(channel: string, handler: EventHandler): () => void {
    let listeners = eventListeners.get(channel);
    if (!listeners) {
      listeners = new Set();
      eventListeners.set(channel, listeners);
    }
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }

  function onAny(handler: EventHandler): () => void {
    anyListeners.add(handler);
    return () => { anyListeners.delete(handler); };
  }

  function registerHandler(channel: string, handler: CommandHandler): void {
    handlers.set(channel, handler);
  }

  function registerDynamic(channel: string, handler: CommandHandler): void {
    handlers.set(channel, handler);
    logger.info(`Dynamic command registered: ${channel}`);
  }

  function getRegistry(): RegisteredCommand[] {
    return [...handlers.entries()].map(([ch, handler]) => {
      const { domain, verb, noun } = parseChannel(ch);
      return { channel: ch, domain, verb, noun, isMutation: isMutationVerb(verb), handler };
    });
  }

  function queryCommands(filter: CommandFilter): CommandRecord[] {
    const conditions = [];
    if (filter.domain) conditions.push(eq(commands.domain, filter.domain));
    if (filter.verb) conditions.push(eq(commands.verb, filter.verb));
    if (filter.sourceType) conditions.push(eq(commands.sourceType, filter.sourceType));
    if (filter.projectId) conditions.push(eq(commands.projectId, filter.projectId));
    if (filter.since) conditions.push(gte(commands.createdAt, filter.since));

    let query = db.select().from(commands);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    return query.orderBy(desc(commands.createdAt)).limit(filter.limit ?? 100).all() as CommandRecord[];
  }

  function queryEvents(filter: EventFilter): EventRecord[] {
    const conditions = [];
    if (filter.channel) conditions.push(eq(busEvents.channel, filter.channel));
    if (filter.sessionId) conditions.push(eq(busEvents.sessionId, filter.sessionId));
    if (filter.since) conditions.push(gte(busEvents.createdAt, filter.since));

    let query = db.select().from(busEvents);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    return query.orderBy(desc(busEvents.createdAt)).limit(filter.limit ?? 100).all() as EventRecord[];
  }

  function dispose(): void {
    handlers.clear();
    eventListeners.clear();
    anyListeners.clear();
  }

  return {
    dispatch,
    emit,
    on,
    onAny,
    registerHandler,
    registerDynamic,
    getRegistry,
    queryCommands,
    queryEvents,
    dispose,
  };
}
