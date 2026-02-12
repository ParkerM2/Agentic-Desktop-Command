/**
 * ipc — Typed IPC invoke wrapper
 *
 * Unwraps the { success, data, error } envelope from the IPC router.
 * React Query hooks call this instead of window.api.invoke directly.
 *
 * @example
 * const tasks = await ipc('tasks.list', { projectId });
 * // Returns the data directly or throws on error
 */

import type { InvokeChannel, InvokeInput, InvokeOutput } from '@shared/ipc-contract';

export class IpcError extends Error {
  constructor(
    public channel: string,
    message: string,
  ) {
    super(message);
    this.name = 'IpcError';
  }
}

/**
 * Invoke an IPC channel and unwrap the result.
 * Throws IpcError on failure.
 */
export async function ipc<T extends InvokeChannel>(
  channel: T,
  input: InvokeInput<T>,
): Promise<InvokeOutput<T>> {
  const result = await window.api.invoke(channel, input);

  if (!result.success || result.data === undefined) {
    throw new IpcError(channel, result.error ?? `IPC call failed: ${channel}`);
  }

  return result.data;
}
