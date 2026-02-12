/**
 * Preload Script — Typed IPC Bridge
 *
 * Exposes a type-safe `window.api` object generated from the IPC contract.
 * The renderer never calls ipcRenderer directly — it uses window.api.invoke()
 * and window.api.on() which are fully typed from the contract.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type {
  InvokeChannel,
  InvokeInput,
  InvokeOutput,
  EventChannel,
  EventData,
} from '@shared/ipc-contract';

export interface TypedApi {
  invoke<T extends InvokeChannel>(
    channel: T,
    input: InvokeInput<T>,
  ): Promise<InvokeOutput<T>>;

  on<T extends EventChannel>(
    channel: T,
    callback: (data: EventData<T>) => void,
  ): () => void;
}

const api: TypedApi = {
  invoke: async <T extends InvokeChannel>(
    channel: T,
    input: InvokeInput<T>,
  ): Promise<InvokeOutput<T>> => {
    const result = await ipcRenderer.invoke(channel, input);
    if (result && typeof result === 'object' && 'success' in result) {
      if (result.success) return result.data;
      throw new Error(result.error ?? `IPC call ${channel} failed`);
    }
    return result;
  },

  on: <T extends EventChannel>(
    channel: T,
    callback: (data: EventData<T>) => void,
  ): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: EventData<T>) => {
      callback(data);
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);

// Augment the Window type so renderer code sees window.api
declare global {
  interface Window {
    api: TypedApi;
  }
}
