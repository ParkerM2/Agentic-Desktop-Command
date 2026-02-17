/**
 * Claude SDK IPC Contract
 *
 * Defines invoke channels for Claude SDK conversations, message
 * sending/streaming, and configuration checks.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import {
  ClaudeConversationSchema,
  ClaudeMessageSchema,
  ClaudeSendMessageResponseSchema,
  ClaudeStreamChunkSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const claudeInvoke = {
  'claude.sendMessage': {
    input: z.object({
      conversationId: z.string(),
      message: z.string(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
    }),
    output: ClaudeSendMessageResponseSchema,
  },
  'claude.streamMessage': {
    input: z.object({
      conversationId: z.string(),
      message: z.string(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
    }),
    output: SuccessResponseSchema,
  },
  'claude.createConversation': {
    input: z.object({ title: z.string().optional() }),
    output: z.object({ conversationId: z.string() }),
  },
  'claude.listConversations': {
    input: z.object({}),
    output: z.array(ClaudeConversationSchema),
  },
  'claude.getMessages': {
    input: z.object({ conversationId: z.string() }),
    output: z.array(ClaudeMessageSchema),
  },
  'claude.clearConversation': {
    input: z.object({ conversationId: z.string() }),
    output: SuccessResponseSchema,
  },
  'claude.isConfigured': {
    input: z.object({}),
    output: z.object({ configured: z.boolean() }),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const claudeEvents = {
  'event:claude.streamChunk': {
    payload: ClaudeStreamChunkSchema,
  },
} as const;
