/**
 * Terminals IPC Contract
 *
 * Defines invoke channels for terminal session lifecycle (create,
 * close, input, resize) and Claude CLI invocation.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { TerminalSessionSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const terminalsInvoke = {
  'terminals.list': {
    input: z.object({ projectPath: z.string().optional() }),
    output: z.array(TerminalSessionSchema),
  },
  'terminals.create': {
    input: z.object({ cwd: z.string(), projectPath: z.string().optional() }),
    output: TerminalSessionSchema,
  },
  'terminals.close': {
    input: z.object({ sessionId: z.string() }),
    output: SuccessResponseSchema,
  },
  'terminals.sendInput': {
    input: z.object({ sessionId: z.string(), data: z.string() }),
    output: SuccessResponseSchema,
  },
  'terminals.resize': {
    input: z.object({ sessionId: z.string(), cols: z.number(), rows: z.number() }),
    output: SuccessResponseSchema,
  },
  'terminals.invokeClaudeCli': {
    input: z.object({ sessionId: z.string(), cwd: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const terminalsEvents = {
  'event:terminal.output': {
    payload: z.object({ sessionId: z.string(), data: z.string() }),
  },
  'event:terminal.closed': {
    payload: z.object({ sessionId: z.string() }),
  },
  'event:terminal.titleChanged': {
    payload: z.object({ sessionId: z.string(), title: z.string() }),
  },
} as const;
