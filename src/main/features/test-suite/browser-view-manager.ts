/**
 * BrowserViewManager
 *
 * Owns a single Electron WebContentsView overlaid on the main window so the
 * test-suite recorder can display the user's running app inside our UI.
 * Handlers in `recorder-handlers.ts` drive this via the BROWSER-VIEW IPC
 * channels.
 *
 * Migrated from the deprecated BrowserView API to WebContentsView (Electron 39+).
 */

import { join } from 'node:path';

import { WebContentsView, session } from 'electron';
import type { BrowserWindow } from 'electron';

// electron-vite emits preloads to out/preload/ as .cjs (see
// electron.vite.config.ts + src/main/index.ts createWindow for the
// sibling `../preload/index.cjs` pattern).
const PRELOAD = join(__dirname, '../preload/test-suite-recorder.cjs');

export interface BrowserViewManager {
  create: (url: string, bounds: Electron.Rectangle) => { success: boolean };
  navigate: (url: string) => { success: boolean };
  back: () => { success: boolean };
  forward: () => { success: boolean };
  reload: () => { success: boolean };
  setBounds: (bounds: Electron.Rectangle) => { success: boolean };
  destroy: () => { success: boolean };
  getWebContents: () => Electron.WebContents | null;
  setStepEmitter: (fn: (step: unknown) => void) => void;
}

export function createBrowserViewManager(
  getMainWindow: () => BrowserWindow | null,
): BrowserViewManager {
  let view: WebContentsView | null = null;
  const partition = 'persist:test-suite';
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let stepEmitter: (step: unknown) => void = () => {};

  function ensure(): WebContentsView {
    if (view) return view;
    view = new WebContentsView({
      webPreferences: {
        preload: PRELOAD,
        contextIsolation: true,
        nodeIntegration: false,
        partition,
        webSecurity: true,
      },
    });
    session.fromPartition(partition).setCertificateVerifyProc((req, cb) => {
      if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
        cb(0);
      } else {
        cb(-3);
      }
    });
    view.webContents.ipc.on('adc.test-suite.step', (_e, step: unknown) => {
      stepEmitter(step);
    });
    return view;
  }

  return {
    create(url, bounds) {
      const win = getMainWindow();
      if (!win) throw new Error('No main window');
      const v = ensure();
      win.contentView.addChildView(v);
      v.setBounds(bounds);
      void v.webContents.loadURL(url);
      return { success: true };
    },
    navigate(url) {
      void ensure().webContents.loadURL(url);
      return { success: true };
    },
    back() {
      const v = ensure();
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      if (v.webContents.canGoBack()) v.webContents.goBack();
      return { success: true };
    },
    forward() {
      const v = ensure();
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      if (v.webContents.canGoForward()) v.webContents.goForward();
      return { success: true };
    },
    reload() {
      ensure().webContents.reload();
      return { success: true };
    },
    setBounds(bounds) {
      ensure().setBounds(bounds);
      return { success: true };
    },
    destroy() {
      const win = getMainWindow();
      if (view && win) win.contentView.removeChildView(view);
      view?.webContents.close();
      view = null;
      return { success: true };
    },
    getWebContents() {
      return view?.webContents ?? null;
    },
    setStepEmitter(fn) {
      stepEmitter = fn;
    },
  };
}
