/**
 * Notes IPC Contract
 *
 * Invoke channels for note CRUD and search operations.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';
import { NOTES, NOTES_EVENTS } from './notes.channels';

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pinned: z.boolean(),
});

export const notesInvoke = {
  [NOTES.LIST.ALL]: {
    input: z.object({ projectId: z.string().optional(), tag: z.string().optional() }),
    output: z.array(NoteSchema),
  },
  [NOTES.CREATE.NOTE]: {
    input: z.object({
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
    }),
    output: NoteSchema,
  },
  [NOTES.UPDATE.NOTE]: {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    }),
    output: NoteSchema,
  },
  [NOTES.DELETE.NOTE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [NOTES.SEARCH.NOTES]: {
    input: z.object({ query: z.string() }),
    output: z.array(NoteSchema),
  },
} as const;

export const notesEvents = {
  [NOTES_EVENTS.NOTE.CHANGED]: {
    payload: z.object({ noteId: z.string() }),
  },
} as const;
