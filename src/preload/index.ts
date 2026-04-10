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

import { ENV_VARS, APP_INFO_BRIDGE } from '@shared/constants/env';
import type {
  InvokeChannel,
  InvokeInput,
  InvokeOutput,
  EventChannel,
  EventPayload,
} from '@shared/ipc-contract';
import { ipcInvokeContract, ipcEventContract } from '@shared/ipc-contract';

// ─── Channel Allowlists (defense-in-depth) ──────────────────
const ALLOWED_INVOKE = new Set(Object.keys(ipcInvokeContract));
const ALLOWED_EVENTS = new Set(Object.keys(ipcEventContract));

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
    if (!ALLOWED_INVOKE.has(channel)) {
      return Promise.resolve({ success: false, error: `Unknown IPC channel: ${channel}` });
    }
    return ipcRenderer.invoke(channel, input);
  },

  on<T extends EventChannel>(channel: T, handler: (payload: EventPayload<T>) => void) {
    if (!ALLOWED_EVENTS.has(channel)) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      handler(payload as EventPayload<T>);
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);

const appInfo = {
  devMode: process.env[ENV_VARS.ADC_DEV_MODE] === 'true',
  version: process.env.npm_package_version ?? 'unknown',
  devEmail: process.env[ENV_VARS.ADC_DEV_EMAIL] ?? '',
  devPassword: process.env[ENV_VARS.ADC_DEV_PASSWORD] ?? '',
} as const;

contextBridge.exposeInMainWorld(APP_INFO_BRIDGE, appInfo);

// Type declaration for the renderer process
declare global {
  interface Window {
    api: IpcBridge;
    appInfo: {
      devMode: boolean;
      version: string;
      devEmail: string;
      devPassword: string;
    };
  }
}
