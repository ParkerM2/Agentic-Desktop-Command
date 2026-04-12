/**
 * Changelog IPC Contract
 *
 * Invoke channels for changelog listing, manual entry, and auto-generation.
 */

import { z } from 'zod';

import { CHANGELOG } from './changelog.channels';

export const ChangeTypeSchema = z.enum([
  'added',
  'changed',
  'fixed',
  'removed',
  'security',
  'deprecated',
]);

export const ChangeCategorySchema = z.object({
  type: ChangeTypeSchema,
  items: z.array(z.string()),
});

export const ChangelogEntrySchema = z.object({
  version: z.string(),
  date: z.string(),
  categories: z.array(ChangeCategorySchema),
});

export const changelogInvoke = {
  [CHANGELOG.LIST.ENTRIES]: {
    input: z.object({}),
    output: z.array(ChangelogEntrySchema),
  },
  [CHANGELOG.ADD.ENTRY]: {
    input: z.object({
      version: z.string(),
      date: z.string(),
      categories: z.array(ChangeCategorySchema),
    }),
    output: ChangelogEntrySchema,
  },
  [CHANGELOG.UPDATE.ENTRY]: {
    input: z.object({
      version: z.string(),
      updates: z.object({
        version: z.string().optional(),
        date: z.string().optional(),
        categories: z.array(ChangeCategorySchema).optional(),
      }),
    }),
    output: ChangelogEntrySchema,
  },
  [CHANGELOG.DELETE.ENTRY]: {
    input: z.object({
      version: z.string(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  [CHANGELOG.GENERATE.ENTRY]: {
    input: z.object({
      repoPath: z.string(),
      version: z.string(),
      fromTag: z.string().optional(),
    }),
    output: ChangelogEntrySchema,
  },
} as const;
