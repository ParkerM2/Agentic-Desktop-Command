/**
 * Bus IPC Contract
 *
 * Invoke and event channels for the command bus — command/event queries,
 * session lifecycle, and registry inspection.
 */

import { z } from 'zod';

import { BUS, BUS_EVENTS } from './channels';
import {
  commandFilterSchema,
  commandRecordSchema,
  eventFilterSchema,
  eventRecordSchema,
  registryEntrySchema,
  sessionFilterSchema,
  sessionIdInputSchema,
  sessionRecordSchema,
  sessionSpawnInputSchema,
  successOutputSchema,
} from './schemas';

// ── Invoke Channels ─────────────────────────────────────────

export const busInvoke = {
  [BUS.QUERY.COMMANDS]: {
    input: commandFilterSchema,
    output: z.array(commandRecordSchema),
  },
  [BUS.QUERY.EVENTS]: {
    input: eventFilterSchema,
    output: z.array(eventRecordSchema),
  },
  [BUS.LIST.SESSIONS]: {
    input: sessionFilterSchema,
    output: z.array(sessionRecordSchema),
  },
  [BUS.GET.SESSION]: {
    input: sessionIdInputSchema,
    output: sessionRecordSchema.nullable(),
  },
  [BUS.GET.REGISTRY]: {
    input: z.object({}),
    output: z.array(registryEntrySchema),
  },
  [BUS.SPAWN.SESSION]: {
    input: sessionSpawnInputSchema,
    output: sessionRecordSchema,
  },
  [BUS.KILL.SESSION]: {
    input: sessionIdInputSchema,
    output: successOutputSchema,
  },
} as const;

// ── Event Channels ──────────────────────────────────────────

export const busEvents = {
  [BUS_EVENTS.SESSION.SPAWNED]: {
    payload: z.object({ sessionId: z.string(), session: sessionRecordSchema }),
  },
  [BUS_EVENTS.SESSION.ACTIVE]: {
    payload: z.object({ sessionId: z.string(), session: sessionRecordSchema }),
  },
  [BUS_EVENTS.SESSION.COMPLETED]: {
    payload: z.object({ sessionId: z.string(), session: sessionRecordSchema }),
  },
  [BUS_EVENTS.SESSION.ERROR]: {
    payload: z.object({ sessionId: z.string(), session: sessionRecordSchema }),
  },
  [BUS_EVENTS.SESSION.KILLED]: {
    payload: z.object({ sessionId: z.string(), session: sessionRecordSchema }),
  },
  [BUS_EVENTS.COMMAND.EXECUTED]: {
    payload: z.object({ commandId: z.string(), channel: z.string(), status: z.string() }),
  },
} as const;
