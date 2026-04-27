/**
 * Ideas IPC Contract
 *
 * Invoke channels for idea CRUD, filtering, and voting.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { IDEAS, IDEAS_EVENTS } from './channels';

export const IdeaStatusSchema = z.enum([
  'new',
  'exploring',
  'accepted',
  'rejected',
  'implemented',
]);
export const IdeaCategorySchema = z.enum(['feature', 'improvement', 'bug', 'performance']);

export const IdeaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: IdeaStatusSchema,
  category: IdeaCategorySchema,
  tags: z.array(z.string()),
  projectId: z.string().optional(),
  votes: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ideasInvoke = {
  [IDEAS.LIST.ALL]: {
    input: z.object({
      projectId: z.string().optional(),
      status: IdeaStatusSchema.optional(),
      category: IdeaCategorySchema.optional(),
    }),
    output: z.array(IdeaSchema),
  },
  [IDEAS.CREATE.IDEA]: {
    input: z.object({
      id: z.uuid().optional(),
      title: z.string(),
      description: z.string(),
      category: IdeaCategorySchema,
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
    }),
    output: IdeaSchema,
  },
  [IDEAS.UPDATE.IDEA]: {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: IdeaStatusSchema.optional(),
      category: IdeaCategorySchema.optional(),
      tags: z.array(z.string()).optional(),
    }),
    output: IdeaSchema,
  },
  [IDEAS.DELETE.IDEA]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [IDEAS.VOTE.IDEA]: {
    input: z.object({ id: z.string(), delta: z.number() }),
    output: IdeaSchema,
  },
} as const;

export const ideasEvents = {
  [IDEAS_EVENTS.IDEA.CHANGED]: {
    payload: z.object({ ideaId: z.string() }),
  },
} as const;
