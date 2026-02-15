/**
 * Mock Electron APIs for testing
 *
 * Provides mock implementations of Electron APIs used by main process services.
 */

import { vi } from 'vitest';

export const app = {
  getPath: vi.fn((name: string) => `/mock/${name}`),
  getName: vi.fn(() => 'claude-ui-test'),
  getVersion: vi.fn(() => '1.0.0'),
  quit: vi.fn(),
  on: vi.fn(),
  whenReady: vi.fn(() => Promise.resolve()),
};

export const safeStorage = {
  isEncryptionAvailable: vi.fn(() => true),
  encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`)),
  decryptString: vi.fn((b: Buffer) => b.toString().replace('enc:', '')),
};

export const dialog = {
  showOpenDialog: vi.fn(() =>
    Promise.resolve({ canceled: false, filePaths: ['/mock/path'] })
  ),
  showSaveDialog: vi.fn(() =>
    Promise.resolve({ canceled: false, filePath: '/mock/save-path' })
  ),
  showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })),
  showErrorBox: vi.fn(),
};

export const shell = {
  openExternal: vi.fn(() => Promise.resolve()),
  openPath: vi.fn(() => Promise.resolve('')),
  showItemInFolder: vi.fn(),
};

export const BrowserWindow = vi.fn().mockImplementation(() => ({
  loadURL: vi.fn(() => Promise.resolve()),
  loadFile: vi.fn(() => Promise.resolve()),
  show: vi.fn(),
  hide: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn(() => false),
  webContents: {
    send: vi.fn(),
    on: vi.fn(),
    openDevTools: vi.fn(),
  },
  on: vi.fn(),
  once: vi.fn(),
}));

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeHandler: vi.fn(),
  removeAllListeners: vi.fn(),
};

export const ipcRenderer = {
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
};

export const contextBridge = {
  exposeInMainWorld: vi.fn(),
};

export const nativeTheme = {
  themeSource: 'system',
  shouldUseDarkColors: false,
  on: vi.fn(),
};

export default {
  app,
  safeStorage,
  dialog,
  shell,
  BrowserWindow,
  ipcMain,
  ipcRenderer,
  contextBridge,
  nativeTheme,
};
