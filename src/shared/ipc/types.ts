/**
 * IPC Type Utilities
 *
 * Shared type helpers for extracting input/output/payload types
 * from the IPC contract definitions. Used by handlers, hooks, and
 * the preload bridge.
 */

import type { ipcEventContract, ipcInvokeContract } from './index';
import type { z } from 'zod';

/** All invoke channel names */
export type InvokeChannel = keyof typeof ipcInvokeContract;

/** All event channel names */
export type EventChannel = keyof typeof ipcEventContract;

/** Input type for an invoke channel */
export type InvokeInput<T extends InvokeChannel> = z.infer<(typeof ipcInvokeContract)[T]['input']>;

/** Output type for an invoke channel */
export type InvokeOutput<T extends InvokeChannel> = z.infer<
  (typeof ipcInvokeContract)[T]['output']
>;

/** Payload type for an event channel */
export type EventPayload<T extends EventChannel> = z.infer<
  (typeof ipcEventContract)[T]['payload']
>;
