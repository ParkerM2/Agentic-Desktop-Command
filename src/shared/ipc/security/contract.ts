/**
 * Security IPC Contract
 *
 * Invoke channels for security settings management and audit export.
 */

import { z } from 'zod';

import { SECURITY } from './channels';
import { SecurityAuditExportSchema, SecuritySettingsSchema } from './schemas';

/** Invoke channels for security operations */
export const securityInvoke = {
  [SECURITY.GET.SETTINGS]: {
    input: z.object({}),
    output: SecuritySettingsSchema,
  },
  [SECURITY.UPDATE.SETTINGS]: {
    input: SecuritySettingsSchema.partial(),
    output: SecuritySettingsSchema,
  },
  [SECURITY.EXPORT.AUDIT]: {
    input: z.object({}),
    output: SecurityAuditExportSchema,
  },
} as const;
