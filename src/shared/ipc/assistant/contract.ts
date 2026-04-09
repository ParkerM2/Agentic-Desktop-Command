/**
 * Assistant IPC Contract
 *
 * Invoke and event channel definitions for the AI assistant command bar.
 */

import { z } from 'zod';

import { ASSISTANT, ASSISTANT_EVENTS } from './channels';
import { CommandHistoryEntrySchema } from './schemas';

/** Invoke channels for assistant operations */
export const assistantInvoke = {
  [ASSISTANT.START.SESSION]: {
    input: z.object({
      projects: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          path: z.string(),
        }),
      ),
    }),
    output: z.object({ success: z.boolean() }),
  },
  [ASSISTANT.SEND.COMMAND]: {
    input: z.object({
      input: z.string(),
      context: z
        .object({
          activeView: z.string().optional(),
          activeProjectId: z.string().optional(),
        })
        .optional(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  [ASSISTANT.GET.HISTORY]: {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(CommandHistoryEntrySchema),
  },
  [ASSISTANT.CLEAR.HISTORY]: {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Event channels for assistant-related events */
export const assistantEvents = {
  [ASSISTANT_EVENTS.MESSAGE.RESPONSE]: {
    payload: z.object({ content: z.string(), type: z.enum(['text', 'error']) }),
  },
  [ASSISTANT_EVENTS.MESSAGE.THINKING]: {
    payload: z.object({ isThinking: z.boolean() }),
  },
  [ASSISTANT_EVENTS.TOOL.EXECUTED]: {
    payload: z.object({
      toolName: z.string(),
      queryKeyRoots: z.array(z.string()),
      result: z.unknown(),
    }),
  },
  [ASSISTANT_EVENTS.SESSION.AUTOSTART]: {
    payload: z.object({ autoStarted: z.boolean() }),
  },
} as const;
