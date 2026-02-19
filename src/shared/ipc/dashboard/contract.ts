/**
 * Dashboard IPC Contract
 *
 * Invoke channels for quick capture CRUD and event channels for changes.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { CaptureSchema } from './schemas';

export const dashboardInvoke = {
  'dashboard.captures.list': {
    input: z.object({}),
    output: z.array(CaptureSchema),
  },
  'dashboard.captures.create': {
    input: z.object({ text: z.string() }),
    output: CaptureSchema,
  },
  'dashboard.captures.delete': {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

export const dashboardEvents = {
  'event:dashboard.captureChanged': {
    payload: z.object({ captureId: z.string() }),
  },
} as const;
