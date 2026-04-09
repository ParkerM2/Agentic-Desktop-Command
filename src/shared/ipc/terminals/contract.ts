/**
 * Terminals IPC Contract
 *
 * Defines invoke channels for terminal session lifecycle (create,
 * close, input, resize) and Claude CLI invocation.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { TERMINALS, TERMINALS_EVENTS } from './channels';
import { TerminalSessionSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const terminalsInvoke = {
  [TERMINALS.LIST.ALL]: {
    input: z.object({ projectPath: z.string().optional() }),
    output: z.array(TerminalSessionSchema),
  },
  [TERMINALS.CREATE.SESSION]: {
    input: z.object({ cwd: z.string(), projectPath: z.string().optional() }),
    output: TerminalSessionSchema,
  },
  [TERMINALS.CLOSE.SESSION]: {
    input: z.object({ sessionId: z.string() }),
    output: SuccessResponseSchema,
  },
  [TERMINALS.SEND.INPUT]: {
    input: z.object({ sessionId: z.string(), data: z.string() }),
    output: SuccessResponseSchema,
  },
  [TERMINALS.RESIZE.SESSION]: {
    input: z.object({ sessionId: z.string(), cols: z.number(), rows: z.number() }),
    output: SuccessResponseSchema,
  },
  [TERMINALS.INVOKE['CLAUDE-CLI']]: {
    input: z.object({ sessionId: z.string(), cwd: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const terminalsEvents = {
  [TERMINALS_EVENTS.TERMINAL.OUTPUT]: {
    payload: z.object({ sessionId: z.string(), data: z.string() }),
  },
  [TERMINALS_EVENTS.TERMINAL.CLOSED]: {
    payload: z.object({ sessionId: z.string() }),
  },
  [TERMINALS_EVENTS.TERMINAL['TITLE-CHANGED']]: {
    payload: z.object({ sessionId: z.string(), title: z.string() }),
  },
} as const;
