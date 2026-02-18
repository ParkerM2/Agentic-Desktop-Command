/**
 * Screen Capture IPC Contract
 *
 * Invoke channels for screen source listing, capture, and permission checks.
 */

import { z } from 'zod';

export const ScreenSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail: z.string(),
  display_id: z.string().optional(),
  appIcon: z.string().optional(),
});

export const ScreenshotSchema = z.object({
  data: z.string(),
  timestamp: z.string(),
  source: ScreenSourceSchema,
  width: z.number(),
  height: z.number(),
});

export const ScreenPermissionStatusSchema = z.enum([
  'granted',
  'denied',
  'not-determined',
  'restricted',
]);

export const screenInvoke = {
  'screen.listSources': {
    input: z.object({
      types: z.array(z.enum(['screen', 'window'])).optional(),
      thumbnailSize: z.object({ width: z.number(), height: z.number() }).optional(),
    }),
    output: z.array(ScreenSourceSchema),
  },
  'screen.capture': {
    input: z.object({
      sourceId: z.string(),
      options: z
        .object({
          width: z.number().optional(),
          height: z.number().optional(),
        })
        .optional(),
    }),
    output: ScreenshotSchema,
  },
  'screen.checkPermission': {
    input: z.object({}),
    output: z.object({
      status: ScreenPermissionStatusSchema,
      platform: z.string(),
    }),
  },
} as const;
