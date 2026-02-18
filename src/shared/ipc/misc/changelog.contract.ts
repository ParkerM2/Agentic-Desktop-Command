/**
 * Changelog IPC Contract
 *
 * Invoke channels for changelog listing, manual entry, and auto-generation.
 */

import { z } from 'zod';

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
  'changelog.list': {
    input: z.object({}),
    output: z.array(ChangelogEntrySchema),
  },
  'changelog.addEntry': {
    input: z.object({
      version: z.string(),
      date: z.string(),
      categories: z.array(ChangeCategorySchema),
    }),
    output: ChangelogEntrySchema,
  },
  'changelog.generate': {
    input: z.object({
      repoPath: z.string(),
      version: z.string(),
      fromTag: z.string().optional(),
    }),
    output: ChangelogEntrySchema,
  },
} as const;
