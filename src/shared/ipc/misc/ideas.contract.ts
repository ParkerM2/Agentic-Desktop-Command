/**
 * Ideas IPC Contract
 *
 * Invoke channels for idea CRUD, filtering, and voting.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

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
  'ideas.list': {
    input: z.object({
      projectId: z.string().optional(),
      status: IdeaStatusSchema.optional(),
      category: IdeaCategorySchema.optional(),
    }),
    output: z.array(IdeaSchema),
  },
  'ideas.create': {
    input: z.object({
      title: z.string(),
      description: z.string(),
      category: IdeaCategorySchema,
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
    }),
    output: IdeaSchema,
  },
  'ideas.update': {
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
  'ideas.delete': {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  'ideas.vote': {
    input: z.object({ id: z.string(), delta: z.number() }),
    output: IdeaSchema,
  },
} as const;

export const ideasEvents = {
  'event:idea.changed': {
    payload: z.object({ ideaId: z.string() }),
  },
} as const;
