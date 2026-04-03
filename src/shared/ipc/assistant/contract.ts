/**
 * Assistant IPC Contract
 *
 * Invoke and event channel definitions for the AI assistant command bar.
 */

import { z } from 'zod';

import { CommandHistoryEntrySchema } from './schemas';

/** Invoke channels for assistant operations */
export const assistantInvoke = {
  'assistant.sendCommand': {
    input: z.object({
      input: z.string(),
      projectPath: z.string(),
      context: z
        .object({
          activeView: z.string().optional(),
          activeProjectId: z.string().optional(),
        })
        .optional(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'assistant.getHistory': {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(CommandHistoryEntrySchema),
  },
  'assistant.clearHistory': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Event channels for assistant-related events */
export const assistantEvents = {
  'event:assistant.response': {
    payload: z.object({ content: z.string(), type: z.enum(['text', 'error']) }),
  },
  'event:assistant.thinking': {
    payload: z.object({ isThinking: z.boolean() }),
  },
  'event:assistant.toolExecuted': {
    payload: z.object({
      toolName: z.string(),
      queryKeyRoots: z.array(z.string()),
      result: z.unknown(),
    }),
  },
  'event:assistant.autostart': {
    payload: z.object({ autoStarted: z.boolean() }),
  },
} as const;
