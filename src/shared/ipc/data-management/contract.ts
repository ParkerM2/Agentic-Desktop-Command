/**
 * Data Management IPC Contract
 *
 * Defines invoke channels for data store registry, retention settings,
 * cleanup operations, and data export/import. Also defines event
 * channels for cleanup completion notifications.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { DATA_MANAGEMENT, DATA_MANAGEMENT_EVENTS } from './channels';
import {
  CleanupResultSchema,
  DataRetentionSettingsSchema,
  DataStoreEntrySchema,
  DataStoreUsageSchema,
  ImportResultSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const dataManagementInvoke = {
  [DATA_MANAGEMENT.GET.REGISTRY]: {
    input: z.object({}),
    output: z.array(DataStoreEntrySchema),
  },
  [DATA_MANAGEMENT.GET.USAGE]: {
    input: z.object({}),
    output: z.array(DataStoreUsageSchema),
  },
  [DATA_MANAGEMENT.GET.RETENTION]: {
    input: z.object({}),
    output: DataRetentionSettingsSchema,
  },
  [DATA_MANAGEMENT.UPDATE.RETENTION]: {
    input: DataRetentionSettingsSchema.partial(),
    output: DataRetentionSettingsSchema,
  },
  [DATA_MANAGEMENT.CLEAR.STORE]: {
    input: z.object({ storeId: z.string() }),
    output: SuccessResponseSchema,
  },
  [DATA_MANAGEMENT.RUN.CLEANUP]: {
    input: z.object({}),
    output: CleanupResultSchema,
  },
  [DATA_MANAGEMENT.EXPORT.DATA]: {
    input: z.object({}),
    output: z.object({ filePath: z.string() }),
  },
  [DATA_MANAGEMENT.IMPORT.DATA]: {
    input: z.object({ filePath: z.string() }),
    output: ImportResultSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const dataManagementEvents = {
  [DATA_MANAGEMENT_EVENTS.CLEANUP.COMPLETE]: {
    payload: CleanupResultSchema,
  },
} as const;
