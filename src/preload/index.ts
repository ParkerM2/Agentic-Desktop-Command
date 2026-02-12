/**
 * Preload Bridge
 *
 * Exposes a typed API to the renderer process.
 * The renderer calls `window.api.invoke(channel, input)` and
 * `window.api.on(channel, handler)`.
 *
 * Type safety comes from the IPC contract — this file just wires
 * electron's IPC to a clean interface.
 */

import { contextBridge, ipcRenderer } from 'electron';

import type {
  InvokeChannel,
  InvokeInput,
  InvokeOutput,
  EventChannel,
  EventPayload,
} from '@shared/ipc-contract';

export interface IpcBridge {
  invoke: <T extends InvokeChannel>(
    channel: T,
    input: InvokeInput<T>,
  ) => Promise<{ success: boolean; data?: InvokeOutput<T>; error?: string }>;

  on: <T extends EventChannel>(
    channel: T,
    handler: (payload: EventPayload<T>) => void,
  ) => () => void;
}

const api: IpcBridge = {
  invoke(channel, input) {
    return ipcRenderer.invoke(channel, input);
  },

  on(channel, handler) {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- IPC bridge: payload validated by contract
      handler(payload as EventPayload<T>);
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);

// Type declaration for the renderer process
declare global {
  interface Window {
    api: IpcBridge;
  }
}
