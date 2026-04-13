/**
 * Claude SDK IPC Contract
 *
 * Defines invoke channels for Claude SDK conversations, message
 * sending/streaming, and configuration checks.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { CLAUDE, CLAUDE_EVENTS } from './channels';
import {
  ClaudeConfigScanResultSchema,
  ClaudeConversationSchema,
  ClaudeMessageSchema,
  ClaudeSendMessageResponseSchema,
  ClaudeStreamChunkSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const claudeInvoke = {
  [CLAUDE.SEND.MESSAGE]: {
    input: z.object({
      conversationId: z.string(),
      message: z.string(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
    }),
    output: ClaudeSendMessageResponseSchema,
  },
  [CLAUDE.STREAM.MESSAGE]: {
    input: z.object({
      conversationId: z.string(),
      message: z.string(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
    }),
    output: SuccessResponseSchema,
  },
  [CLAUDE.CREATE.CONVERSATION]: {
    input: z.object({ title: z.string().optional() }),
    output: z.object({ conversationId: z.string() }),
  },
  [CLAUDE.LIST.CONVERSATIONS]: {
    input: z.object({}),
    output: z.array(ClaudeConversationSchema),
  },
  [CLAUDE.GET.MESSAGES]: {
    input: z.object({ conversationId: z.string() }),
    output: z.array(ClaudeMessageSchema),
  },
  [CLAUDE.CLEAR.CONVERSATION]: {
    input: z.object({ conversationId: z.string() }),
    output: SuccessResponseSchema,
  },
  [CLAUDE.CHECK.CONFIGURED]: {
    input: z.object({}),
    output: z.object({ configured: z.boolean() }),
  },
  [CLAUDE.SCAN.CONFIG]: {
    input: z.object({}),
    output: ClaudeConfigScanResultSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const claudeEvents = {
  [CLAUDE_EVENTS.STREAM.CHUNK]: {
    payload: ClaudeStreamChunkSchema,
  },
} as const;
