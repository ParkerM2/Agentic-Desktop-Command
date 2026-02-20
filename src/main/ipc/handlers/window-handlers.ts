/**
 * Window IPC Handlers
 *
 * Handles window control operations: minimize, maximize/restore toggle,
 * close, and maximize state query. Uses BrowserWindow.getFocusedWindow()
 * to get the active window.
 */

import { BrowserWindow } from 'electron';

import type { IpcRouter } from '../router';

export function registerWindowHandlers(router: IpcRouter): void {
  router.handle('window.minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.minimize();
    }
    return Promise.resolve({ success: true });
  });

  router.handle('window.maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
    return Promise.resolve({ success: true });
  });

  router.handle('window.close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.close();
    }
    return Promise.resolve({ success: true });
  });

  router.handle('window.isMaximized', () => {
    const win = BrowserWindow.getFocusedWindow();
    return Promise.resolve({ isMaximized: win?.isMaximized() ?? false });
  });
}
