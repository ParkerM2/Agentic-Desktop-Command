/**
 * Type-safe IPC Router
 *
 * Registers handlers with automatic Zod validation at the boundary.
 * Main process handlers never see unvalidated data.
 */

import { ipcMain, type BrowserWindow } from 'electron';

import {
  ipcInvokeContract,
  type InvokeChannel,
  type InvokeInput,
  type InvokeOutput,
  type EventChannel,
  type EventPayload,
} from '@shared/ipc-contract';

type InvokeHandler<T extends InvokeChannel> = (input: InvokeInput<T>) => Promise<InvokeOutput<T>>;

export class IpcRouter {
  private getMainWindow: () => BrowserWindow | null;

  constructor(getMainWindow: () => BrowserWindow | null) {
    this.getMainWindow = getMainWindow;
  }

  /**
   * Register an invoke handler with automatic input validation.
   */
  handle<T extends InvokeChannel>(channel: T, handler: InvokeHandler<T>): void {
    const schema = ipcInvokeContract[channel];

    ipcMain.handle(channel, async (_event, rawInput: unknown) => {
      try {
        const parsed = schema.input.parse(rawInput ?? {}) as InvokeInput<T>;
        const result = await handler(parsed);
        return { success: true, data: result };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[IPC] Error in ${channel}:`, message);
        return { success: false, error: message };
      }
    });
  }

  /**
   * Emit a typed event to the renderer process.
   */
  emit<T extends EventChannel>(channel: T, payload: EventPayload<T>): void {
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}
