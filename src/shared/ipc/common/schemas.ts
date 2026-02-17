/**
 * Common IPC Schemas
 *
 * Shared Zod primitives and helper schemas used across multiple
 * domain contracts. Centralizes reusable patterns like success
 * responses to avoid duplication.
 */

import { z } from 'zod';

/** Standard success response shape */
export const SuccessResponseSchema = z.object({ success: z.boolean() });

/** Success response with optional error message */
export const SuccessWithErrorSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

/** Token usage tracking (shared between agents + Claude SDK) */
export const TokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  estimatedCostUsd: z.number(),
  lastUpdated: z.string(),
});
