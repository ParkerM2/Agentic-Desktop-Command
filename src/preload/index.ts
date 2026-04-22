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

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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
import { isAppChannel } from '@shared/types/channel';
import type { AppChannel } from '@shared/types/channel';

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

// ─── Agent Host Event Port ─────────────────────────────────
// The main process sends a MessagePort via 'agent-host-events' channel
// which the renderer uses for direct agent event subscriptions.

/** Mutable holder so static analysis doesn't narrow the port to `null`. */
const agentHostState: { port: MessagePort | null; pending: Array<(event: unknown) => void> } = {
  port: null,
  pending: [],
};

ipcRenderer.on('agent-host-events', (event) => {
  const { ports } = event;
  if (ports.length === 0) return;
  const port = ports[0];

  agentHostState.port = port;
  port.start();

  // Flush any callbacks that were registered before the port arrived
  for (const cb of agentHostState.pending) {
    const handler = (e: MessageEvent) => cb(e.data);
    port.addEventListener('message', handler);
  }
  agentHostState.pending.length = 0;
});

const agentHostBridge = {
  onEvent(callback: (event: unknown) => void): () => void {
    const { port } = agentHostState;
    if (port === null) {
      // Queue callback for when port arrives
      agentHostState.pending.push(callback);
      return () => {
        const idx = agentHostState.pending.indexOf(callback);
        if (idx >= 0) agentHostState.pending.splice(idx, 1);
      };
    }
    const handler = (e: MessageEvent) => callback(e.data);
    port.addEventListener('message', handler);
    return () => port.removeEventListener('message', handler);
  },
};

contextBridge.exposeInMainWorld('agentHost', agentHostBridge);

const rawChannel = process.env[ENV_VARS.ADC_CHANNEL];
const channel: AppChannel = isAppChannel(rawChannel)
  ? rawChannel
  : (process.env[ENV_VARS.ADC_DEV_MODE] === 'true' ? 'dev' : 'release');

const appInfo = {
  devMode: process.env[ENV_VARS.ADC_DEV_MODE] === 'true',
  version: process.env.npm_package_version ?? 'unknown',
  devEmail: process.env[ENV_VARS.ADC_DEV_EMAIL] ?? '',
  devPassword: process.env[ENV_VARS.ADC_DEV_PASSWORD] ?? '',
  channel,
} as const;

contextBridge.exposeInMainWorld(APP_INFO_BRIDGE, appInfo);

// ─── Sibling preload paths ───────────────────────────────
// Renderer needs file:// URLs to pass as <webview preload="...">
const preloads = {
  testSuiteRecorder: pathToFileURL(join(__dirname, 'test-suite-recorder.cjs')).href,
};

contextBridge.exposeInMainWorld('preloads', preloads);

// Type declaration for the renderer process
declare global {
  interface Window {
    api: IpcBridge;
    agentHost: {
      onEvent: (callback: (event: unknown) => void) => () => void;
    };
    appInfo: {
      devMode: boolean;
      version: string;
      devEmail: string;
      devPassword: string;
      channel: AppChannel;
    };
    preloads: {
      testSuiteRecorder: string;
    };
  }
}
