/**
 * Type-Safe IPC Router
 *
 * Provides a typed interface for registering IPC handlers.
 * All handlers are validated against the IPC contract's Zod schemas.
 * Errors are caught and returned as structured error responses.
 */
import { ipcMain } from 'electron';
import {
  invokeContract,
  type InvokeChannel,
  type InvokeInput,
  type InvokeOutput,
} from '@shared/ipc-contract';

export type IpcHandler<T extends InvokeChannel> = (
  input: InvokeInput<T>,
) => Promise<InvokeOutput<T>>;

interface IpcRouter {
  handle<T extends InvokeChannel>(
    channel: T,
    handler: IpcHandler<T>,
  ): void;
}

export function createIpcRouter(): IpcRouter {
  return {
    handle<T extends InvokeChannel>(
      channel: T,
      handler: IpcHandler<T>,
    ) {
      ipcMain.handle(channel, async (_event, rawInput: unknown) => {
        try {
          // Validate input against the contract schema
          const contract = invokeContract[channel];
          const parsed = contract.input.parse(rawInput) as InvokeInput<T>;
          const result = await handler(parsed);
          return { success: true, data: result };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          console.error(`[IPC] ${channel} error:`, message);
          return { success: false, error: message };
        }
      });
    },
  };
}

/**
 * Helper to emit typed events from main → renderer
 */
import type { BrowserWindow } from 'electron';
import type { EventChannel, EventData } from '@shared/ipc-contract';

export function emitToRenderer<T extends EventChannel>(
  window: BrowserWindow,
  channel: T,
  data: EventData<T>,
) {
  window.webContents.send(channel, data);
}
