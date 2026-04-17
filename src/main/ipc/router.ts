/**
 * Type-safe IPC Router
 *
 * Registers handlers with automatic Zod validation at the boundary.
 * Main process handlers never see unvalidated data.
 *
 * When a CommandBus is attached via `setBus()`, all invoke calls
 * are dispatched through the bus for SQLite tracking. Zod validation
 * stays in the router (before bus dispatch). The bus adds logging on top.
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

import { ipcLogger } from '@main/lib/logger';

import type { CommandBus } from '../bus';


type InvokeHandler<T extends InvokeChannel> = (input: InvokeInput<T>) => Promise<InvokeOutput<T>>;

export class IpcRouter {
  private getMainWindow: () => BrowserWindow | null;
  private bus: CommandBus | null = null;
  private registeredHandlers = new Map<string, (input: unknown) => Promise<unknown>>();

  constructor(getMainWindow: () => BrowserWindow | null) {
    this.getMainWindow = getMainWindow;
  }

  /**
   * Attach a CommandBus so all subsequent IPC calls are tracked in SQLite.
   * Any handlers registered before this call are bulk-registered on the bus.
   */
  setBus(bus: CommandBus): void {
    this.bus = bus;
    // Register all previously-registered handlers on the bus
    for (const [channel, handler] of this.registeredHandlers) {
      bus.registerHandler(channel, handler);
    }
  }

  /**
   * Register an invoke handler with automatic input validation.
   *
   * Handlers are stored in a local Map so they can be registered on the
   * bus when `setBus()` is called (handlers are registered during bootstrap
   * before the bus is attached).
   *
   * When a bus is attached, the ipcMain callback routes through
   * `bus.dispatch()` instead of calling the handler directly.
   */
  handle<T extends InvokeChannel>(channel: T, handler: InvokeHandler<T>): void {
    const schema = ipcInvokeContract[channel];

    // Store handler for bus registration
    const wrappedHandler = (input: unknown) => Promise.resolve(handler(input as InvokeInput<T>)) as Promise<unknown>;
    this.registeredHandlers.set(channel, wrappedHandler);

    // If bus already attached, register immediately
    if (this.bus) {
      this.bus.registerHandler(channel, wrappedHandler);
    }

    ipcMain.handle(channel, async (_event, rawInput: unknown) => {
      try {
        const parsed = schema.input.parse(rawInput ?? {}) as InvokeInput<T>;

        // If bus is attached, dispatch through it for tracking
        if (this.bus) {
          const result = await this.bus.dispatch(channel, parsed, { type: 'ui' as const });
          if (result.status === 'error') {
            ipcLogger.error(`[IPC] Error in ${channel}:`, result.error);
            return { success: false, error: result.error };
          }
          return { success: true, data: result.output };
        }

        // Fallback: direct handler call (no bus)
        const result = await handler(parsed);
        return { success: true, data: result };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        ipcLogger.error(`[IPC] Error in ${channel}:`, message);
        return { success: false, error: message };
      }
    });
  }

  /**
   * Emit a typed event to the renderer process.
   * Also emits through the bus if attached (for SQLite event logging).
   */
  emit<T extends EventChannel>(channel: T, payload: EventPayload<T>): void {
    // Log event through bus if attached
    if (this.bus) {
      this.bus.emit(channel, payload);
    }

    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}
