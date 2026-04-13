/**
 * Dashboard IPC Contract
 *
 * Invoke channels for quick capture CRUD and event channels for changes.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { DASHBOARD, DASHBOARD_EVENTS } from './channels';
import { CaptureSchema, UpdateCaptureInputSchema } from './schemas';

export const dashboardInvoke = {
  [DASHBOARD.LIST.CAPTURES]: {
    input: z.object({}),
    output: z.array(CaptureSchema),
  },
  [DASHBOARD.CREATE.CAPTURE]: {
    input: z.object({ id: z.string().optional(), text: z.string() }),
    output: CaptureSchema,
  },
  [DASHBOARD.UPDATE.CAPTURE]: {
    input: UpdateCaptureInputSchema,
    output: CaptureSchema,
  },
  [DASHBOARD.DELETE.CAPTURE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

export const dashboardEvents = {
  [DASHBOARD_EVENTS.CAPTURE.CHANGED]: {
    payload: z.object({ captureId: z.string() }),
  },
} as const;
