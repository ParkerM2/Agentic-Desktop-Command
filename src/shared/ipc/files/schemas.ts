/**
 * Files IPC Schemas
 *
 * Zod schemas for file-tree operations.
 */

import { z } from 'zod';

// Recursive FileTreeNode schema
const BaseFileTreeNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDirectory: z.boolean(),
  extension: z.string().nullable(),
  isModified: z.boolean(),
});

export type FileTreeNodeSchema = z.infer<typeof BaseFileTreeNodeSchema> & {
  children: FileTreeNodeSchema[] | null;
};

export const FileTreeNodeSchema: z.ZodType<FileTreeNodeSchema> =
  BaseFileTreeNodeSchema.extend({
    children: z.lazy(() => z.array(FileTreeNodeSchema).nullable()),
  });
