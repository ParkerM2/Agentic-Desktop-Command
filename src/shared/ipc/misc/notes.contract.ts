/**
 * Notes IPC Contract
 *
 * Invoke channels for note CRUD and search operations.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

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
  'notes.list': {
    input: z.object({ projectId: z.string().optional(), tag: z.string().optional() }),
    output: z.array(NoteSchema),
  },
  'notes.create': {
    input: z.object({
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
    }),
    output: NoteSchema,
  },
  'notes.update': {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    }),
    output: NoteSchema,
  },
  'notes.delete': {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  'notes.search': {
    input: z.object({ query: z.string() }),
    output: z.array(NoteSchema),
  },
} as const;

export const notesEvents = {
  'event:note.changed': {
    payload: z.object({ noteId: z.string() }),
  },
} as const;
