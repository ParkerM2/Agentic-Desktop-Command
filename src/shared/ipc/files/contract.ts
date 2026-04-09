/**
 * Files IPC Contract
 *
 * Invoke channel definitions for file-tree operations.
 */

import { z } from 'zod';

import { FILES } from './channels';
import { FileTreeNodeSchema } from './schemas';

/** Invoke channels for file operations */
export const filesInvoke = {
  [FILES.LIST.TREE]: {
    input: z.object({ path: z.string() }),
    output: z.array(FileTreeNodeSchema),
  },
} as const;

/** Event channels for file-related events (none yet) */
export const filesEvents = {} as const;
