/**
 * Test Mocks — Barrel Export
 *
 * Exports all mock implementations for use in tests.
 * Import from this file to get access to all mocks.
 *
 * @example
 * ```ts
 * import {
 *   app,
 *   safeStorage,
 *   dialog,
 *   createMockFs,
 *   MockPty,
 *   spawn,
 *   createMockIpc,
 * } from '../setup/mocks';
 * ```
 */

// ─── Electron Mocks ────────────────────────────────────────────
export {
  app,
  safeStorage,
  dialog,
  shell,
  BrowserWindow,
  ipcMain,
  ipcRenderer,
  contextBridge,
  nativeTheme,
} from './electron';

// Default electron export for vi.mock
export { default as electron } from './electron';

// ─── File System Mocks ─────────────────────────────────────────
export {
  createMockFs,
  createMockFsWithHelpers,
  mockFs,
  setupFsMock,
  createFsMockModules,
} from './node-fs';

// ─── PTY Mocks ─────────────────────────────────────────────────
export {
  MockPty,
  spawn,
  getLastSpawnedPty,
  resetPtyMocks,
} from './node-pty';

// Default node-pty export for vi.mock
export { default as nodePty } from './node-pty';

// ─── IPC Mocks ─────────────────────────────────────────────────
export {
  createMockIpc,
  mockIpc,
  setupIpcMock,
} from './ipc';

// Types
export type { MockIpcResponses } from './ipc';

// Default ipc export
export { default as ipc } from './ipc';
