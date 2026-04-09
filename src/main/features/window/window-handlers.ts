/**
 * Window IPC Handlers
 *
 * Handles window control operations: minimize, maximize/restore toggle,
 * close, and maximize state query. Uses BrowserWindow.getFocusedWindow()
 * to get the active window.
 */

import { BrowserWindow } from 'electron';

import { WINDOW } from '@shared/ipc/window/channels';

import type { IpcRouter } from '../../ipc/router';

export function registerWindowHandlers(router: IpcRouter): void {
  router.handle(WINDOW.MINIMIZE.APP, () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.minimize();
    }
    return Promise.resolve({ success: true });
  });

  router.handle(WINDOW.MAXIMIZE.APP, () => {
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

  router.handle(WINDOW.CLOSE.APP, () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.close();
    }
    return Promise.resolve({ success: true });
  });

  router.handle(WINDOW.CHECK.MAXIMIZED, () => {
    const win = BrowserWindow.getFocusedWindow();
    return Promise.resolve({ isMaximized: win?.isMaximized() ?? false });
  });
}
