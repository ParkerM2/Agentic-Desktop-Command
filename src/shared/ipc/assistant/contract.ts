/**
 * Assistant IPC Contract
 *
 * Invoke and event channel definitions for the AI assistant command bar.
 */

import { z } from 'zod';

import { AssistantContextSchema, AssistantResponseSchema, CommandHistoryEntrySchema } from './schemas';

/** Invoke channels for assistant operations */
export const assistantInvoke = {
  'assistant.sendCommand': {
    input: z.object({
      input: z.string(),
      context: AssistantContextSchema.optional(),
    }),
    output: AssistantResponseSchema,
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
    payload: z.object({ content: z.string(), type: z.enum(['text', 'action', 'error']) }),
  },
  'event:assistant.thinking': {
    payload: z.object({ isThinking: z.boolean() }),
  },
  'event:assistant.commandCompleted': {
    payload: z.object({
      id: z.string(),
      source: z.enum(['commandbar', 'slack', 'github']),
      action: z.string(),
      summary: z.string(),
      timestamp: z.string(),
    }),
  },
  'event:assistant.proactive': {
    payload: z.object({
      content: z.string(),
      source: z.enum(['watch', 'qa', 'agent']),
      taskId: z.string().optional(),
      followUp: z.string().optional(),
    }),
  },
} as const;
