/**
 * Devices IPC Contract
 *
 * Invoke channels for device registration, heartbeat, and listing.
 */

import { z } from 'zod';

export const DeviceCapabilitiesSchema = z.object({
  canExecute: z.boolean(),
  repos: z.array(z.string()),
});

export const DeviceTypeSchema = z.enum(['desktop', 'mobile', 'web']);

export const DeviceSchema = z.object({
  id: z.string(),
  machineId: z.string().optional(),
  userId: z.string(),
  deviceType: DeviceTypeSchema,
  deviceName: z.string(),
  nickname: z.string().optional(),
  capabilities: DeviceCapabilitiesSchema,
  isOnline: z.boolean(),
  lastSeen: z.string().optional(),
  appVersion: z.string().optional(),
  createdAt: z.string(),
});

export const devicesInvoke = {
  'devices.list': {
    input: z.object({}),
    output: z.array(DeviceSchema),
  },
  'devices.register': {
    input: z.object({
      machineId: z.string(),
      deviceName: z.string(),
      deviceType: DeviceTypeSchema,
      capabilities: DeviceCapabilitiesSchema,
      appVersion: z.string(),
    }),
    output: DeviceSchema,
  },
  'devices.heartbeat': {
    input: z.object({ deviceId: z.string() }),
    output: z.object({ success: z.boolean(), lastSeen: z.string() }),
  },
  'devices.update': {
    input: z.object({
      deviceId: z.string(),
      deviceName: z.string().optional(),
      nickname: z.string().optional(),
      capabilities: DeviceCapabilitiesSchema.optional(),
      isOnline: z.boolean().optional(),
      appVersion: z.string().optional(),
    }),
    output: DeviceSchema,
  },
} as const;

export const devicesEvents = {} as const;
