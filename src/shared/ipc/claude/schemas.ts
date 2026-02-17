/**
 * Claude SDK IPC Schemas
 *
 * Zod schemas for Claude SDK conversations, messages, and streaming.
 */

import { z } from 'zod';

export const ClaudeMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const ClaudeConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number(),
});

export const ClaudeTokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
});

export const ClaudeSendMessageResponseSchema = z.object({
  conversationId: z.string(),
  message: z.string(),
  usage: ClaudeTokenUsageSchema,
});

export const ClaudeStreamChunkSchema = z.object({
  conversationId: z.string(),
  type: z.enum(['content_delta', 'message_start', 'message_stop', 'error']),
  content: z.string().optional(),
  usage: ClaudeTokenUsageSchema.optional(),
  error: z.string().optional(),
});
